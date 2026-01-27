import { spawn, ChildProcess } from 'child_process';
import { AgentRunContext, AgentProgress, AgentResult } from '@appmorph/shared';
import { BaseAgent } from './interface.js';
import { getConfig } from '../config/index.js';

/**
 * ClaudeCliAgent - Executes the Claude CLI to process prompts.
 *
 * Spawns the `claude` CLI process with the given prompt and streams
 * its output as progress events.
 */
export class ClaudeCliAgent extends BaseAgent {
  readonly name = 'claude-cli';

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined> {
    const config = getConfig();
    const command = config.agent.command;

    yield this.createProgress('log', `Starting Claude CLI agent...`);
    yield this.createProgress('log', `Working directory: ${ctx.repoPath}`);
    yield this.createProgress('log', `Prompt: ${ctx.prompt}`);

    // Build the command arguments
    const args = [
      '--print',  // Print mode for non-interactive use
      '--dangerously-skip-permissions',  // Skip permission prompts for automation
      ctx.prompt,
    ];

    yield this.createProgress('log', `Executing: ${command} ${args.join(' ')}`);

    try {
      const result = await this.executeCommand(command, args, ctx.repoPath, (_output) => {
        // This callback is called for each chunk of output
        // We'll yield progress in the main loop instead
      });

      // Parse the result to extract what files were changed
      const filesChanged = this.parseFilesChanged(result.stdout);

      if (result.exitCode === 0) {
        yield this.createProgress('log', 'Claude CLI completed successfully');

        return this.createResult(true, result.stdout || 'Changes applied successfully', {
          filesChanged,
        });
      } else {
        yield this.createProgress('log', `Claude CLI failed with exit code ${result.exitCode}`);

        return this.createResult(false, result.stderr || 'Command failed', {
          filesChanged: [],
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      yield this.createProgress('log', `Error: ${errorMessage}`);

      return this.createResult(false, errorMessage, {
        filesChanged: [],
      });
    }
  }

  private executeCommand(
    command: string,
    args: string[],
    cwd: string,
    onOutput: (output: string) => void
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const proc: ChildProcess = spawn(command, args, {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ensure Claude CLI doesn't try to use interactive features
          CI: 'true',
          TERM: 'dumb',
        },
      });

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        onOutput(text);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        onOutput(text);
      });

      proc.on('error', (error) => {
        reject(error);
      });

      proc.on('close', (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
        });
      });
    });
  }

  private parseFilesChanged(output: string): string[] {
    const files: string[] = [];

    // Look for common patterns indicating file changes
    // Claude CLI often outputs things like:
    // - Created file: path/to/file
    // - Modified: path/to/file
    // - Writing to: path/to/file
    const patterns = [
      /(?:Created|Modified|Writing to|Updated|Edited)(?:\s+file)?:\s*(.+)/gi,
      /(?:Creating|Modifying|Updating|Editing)\s+(.+\.\w+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const file = match[1].trim();
        if (file && !files.includes(file)) {
          files.push(file);
        }
      }
    }

    return files;
  }
}

/**
 * Streaming version of the Claude CLI agent that yields progress as it runs.
 */
export class StreamingClaudeCliAgent extends BaseAgent {
  readonly name = 'claude-cli-streaming';

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined> {
    const config = getConfig();
    const command = config.agent.command;

    yield this.createProgress('log', `Starting Claude CLI agent...`);
    yield this.createProgress('thinking', `Analyzing: ${ctx.prompt.substring(0, 100)}...`);

    const args = [
      '--print',
      '--dangerously-skip-permissions',
      ctx.prompt,
    ];

    console.log(`[Agent] Spawning process: ${command} ${args.slice(0, 2).join(' ')} "<prompt>"`);

    // Create a queue for streaming output
    const outputQueue: string[] = [];
    let isComplete = false;
    let exitCode = 0;
    let fullOutput = '';
    let errorOutput = '';

    const proc = spawn(command, args, {
      cwd: ctx.repoPath,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CI: 'true',
        TERM: 'dumb',
        NONINTERACTIVE: '1',
      },
    });

    console.log(`[Agent] Process spawned (pid: ${proc.pid}), running: ${command} ${args.slice(0, 2).join(' ')} ...`);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      fullOutput += text;
      outputQueue.push(text);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      outputQueue.push(`[stderr] ${text}`);
    });

    const completionPromise = new Promise<void>((resolve) => {
      proc.on('close', (code) => {
        console.log(`[Agent] Process closed with code: ${code}`);
        exitCode = code ?? 1;
        isComplete = true;
        resolve();
      });

      proc.on('error', (error) => {
        console.log(`[Agent] Process error: ${error.message}`);
        errorOutput += error.message;
        isComplete = true;
        resolve();
      });
    });

    // Yield progress as output comes in
    while (!isComplete || outputQueue.length > 0) {
      if (outputQueue.length > 0) {
        const chunk = outputQueue.shift()!;
        yield this.createProgress('log', chunk.trim());
      } else if (!isComplete) {
        // Wait a bit for more output
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    await completionPromise;

    const filesChanged = this.parseFilesChanged(fullOutput);

    if (exitCode === 0) {
      return this.createResult(true, 'Changes applied successfully', {
        filesChanged,
      });
    } else {
      return this.createResult(false, errorOutput || 'Command failed', {
        filesChanged: [],
      });
    }
  }

  private parseFilesChanged(output: string): string[] {
    const files: string[] = [];
    const patterns = [
      /(?:Created|Modified|Writing to|Updated|Edited)(?:\s+file)?:\s*(.+)/gi,
      /(?:Creating|Modifying|Updating|Editing)\s+(.+\.\w+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const file = match[1].trim();
        if (file && !files.includes(file)) {
          files.push(file);
        }
      }
    }

    return files;
  }
}

/**
 * Factory function to create the default agent.
 */
export function createDefaultAgent(): StreamingClaudeCliAgent {
  return new StreamingClaudeCliAgent();
}
