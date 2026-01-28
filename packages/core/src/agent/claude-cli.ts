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

      // Filter out Node.js debugger environment variables to prevent child process
      // from trying to attach to a debugger when parent is run with --inspect
      const cleanEnv = Object.fromEntries(
        Object.entries(process.env).filter(([key]) =>
          !key.startsWith('NODE_OPTIONS') &&
          !key.startsWith('NODE_INSPECT') &&
          !key.startsWith('INSPECTOR_')
        )
      );

      const proc: ChildProcess = spawn(command, args, {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...cleanEnv,
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
 * JSON message types from Claude CLI stream-json output
 */
interface ClaudeStreamMessage {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  message?: {
    content?: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
  tool_use_result?: {
    stdout?: string;
    stderr?: string;
  };
  result?: string;
  is_error?: boolean;
}

/**
 * Streaming version of the Claude CLI agent that yields progress as it runs.
 * Uses --output-format stream-json for real-time streaming of the thought process.
 */
export class StreamingClaudeCliAgent extends BaseAgent {
  readonly name = 'claude-cli-streaming';

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined> {
    const config = getConfig();
    const command = config.agent.command;

    yield this.createProgress('log', `Starting Claude CLI agent...`);
    yield this.createProgress('thinking', `Analyzing: ${ctx.prompt.substring(0, 100)}...`);

    // Use stream-json output format for real-time streaming
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
      ctx.prompt,
    ];

    console.log(`[Agent] Spawning process: ${command} --print --output-format stream-json ...`);

    // Create a queue for streaming output
    const outputQueue: Array<AgentProgress> = [];
    let isComplete = false;
    let exitCode = 0;
    let errorOutput = '';
    let finalResult = '';
    let resultSuccess = true;
    const filesChanged: string[] = [];
    let lineBuffer = '';

    // Filter out Node.js debugger environment variables to prevent child process
    // from trying to attach to a debugger when parent is run with --inspect
    const cleanEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        !key.startsWith('NODE_OPTIONS') &&
        !key.startsWith('NODE_INSPECT') &&
        !key.startsWith('INSPECTOR_')
      )
    );

    const proc = spawn(command, args, {
      cwd: ctx.repoPath,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...cleanEnv,
        CI: 'true',
        TERM: 'dumb',
        NONINTERACTIVE: '1',
      },
    });

    console.log(`[Agent] Process spawned (pid: ${proc.pid})`);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log(`[Agent] Raw stdout (${text.length} chars): ${text.substring(0, 100)}...`);
      lineBuffer += text;

      // Process complete JSON lines
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const msg: ClaudeStreamMessage = JSON.parse(line);
          console.log(`[Agent] Parsed message type: ${msg.type}${msg.subtype ? '/' + msg.subtype : ''}`);
          const progress = this.parseStreamMessage(msg, filesChanged, ctx.repoPath);
          if (progress) {
            console.log(`[Agent] Queueing progress (${progress.type}): ${progress.content.substring(0, 80)}...`);
            outputQueue.push(progress);
          }

          // Capture final result
          if (msg.type === 'result') {
            finalResult = msg.result || '';
            resultSuccess = !msg.is_error;
          }
        } catch (e) {
          // If JSON parse fails, output raw line
          outputQueue.push(this.createProgress('stdout', line));
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      outputQueue.push(this.createProgress('stdout', `[stderr] ${text}`));
    });

    const completionPromise = new Promise<void>((resolve) => {
      proc.on('close', (code) => {
        console.log(`[Agent] Process closed with code: ${code}`);
        exitCode = code ?? 1;
        isComplete = true;

        // Process any remaining buffered content
        if (lineBuffer.trim()) {
          try {
            const msg: ClaudeStreamMessage = JSON.parse(lineBuffer);
            const progress = this.parseStreamMessage(msg, filesChanged, ctx.repoPath);
            if (progress) {
              outputQueue.push(progress);
            }
            if (msg.type === 'result') {
              finalResult = msg.result || '';
              resultSuccess = !msg.is_error;
            }
          } catch (e) {
            outputQueue.push(this.createProgress('stdout', lineBuffer));
          }
        }

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
        const progress = outputQueue.shift()!;
        yield progress;
      } else if (!isComplete) {
        // Wait a bit for more output
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    await completionPromise;

    if (exitCode === 0 && resultSuccess) {
      return this.createResult(true, finalResult || 'Changes applied successfully', {
        filesChanged,
      });
    } else {
      return this.createResult(false, errorOutput || finalResult || 'Command failed', {
        filesChanged,
      });
    }
  }

  /**
   * Make an absolute path shorter by making it relative to the working directory
   * or showing a relative path with ../ for parent directories
   */
  private makeRelativePath(filePath: string, cwd: string): string {
    // If path is within cwd, make it relative
    if (filePath.startsWith(cwd + '/')) {
      return filePath.slice(cwd.length + 1);
    }
    if (filePath === cwd) {
      return '.';
    }

    // Find common ancestor and create relative path
    const fileSegments = filePath.split('/');
    const cwdSegments = cwd.split('/');

    let commonLength = 0;
    for (let i = 0; i < Math.min(fileSegments.length, cwdSegments.length); i++) {
      if (fileSegments[i] === cwdSegments[i]) {
        commonLength = i + 1;
      } else {
        break;
      }
    }

    // If there's a common ancestor, build relative path
    if (commonLength > 0) {
      const upCount = cwdSegments.length - commonLength;
      const remainingPath = fileSegments.slice(commonLength).join('/');
      if (upCount === 0) {
        return remainingPath;
      }
      const upPath = '../'.repeat(upCount);
      return upPath + remainingPath;
    }

    // No common ancestor, return original path
    return filePath;
  }

  /**
   * Parse a stream-json message and return an appropriate progress event
   */
  private parseStreamMessage(msg: ClaudeStreamMessage, filesChanged: string[], cwd: string): AgentProgress | null {
    switch (msg.type) {
      case 'system':
        if (msg.subtype === 'init') {
          return this.createProgress('log', '🚀 Claude CLI initialized');
        }
        return null;

      case 'assistant':
        if (msg.message?.content) {
          for (const content of msg.message.content) {
            if (content.type === 'text' && content.text) {
              return this.createProgress('stdout', content.text);
            }
            if (content.type === 'tool_use' && content.name) {
              const toolName = content.name;
              const input = content.input || {};

              // Track file changes from Edit/Write tools
              if ((toolName === 'Edit' || toolName === 'Write') && input.file_path) {
                const filePath = String(input.file_path);
                if (!filesChanged.includes(filePath)) {
                  filesChanged.push(filePath);
                }
              }

              // Format tool use message
              let toolDesc = `🔧 Using ${toolName}`;
              if (toolName === 'Bash' && input.command) {
                toolDesc += `: ${String(input.command).substring(0, 100)}`;
              } else if (toolName === 'Read' && input.file_path) {
                toolDesc += `: ${this.makeRelativePath(String(input.file_path), cwd)}`;
              } else if (toolName === 'Edit' && input.file_path) {
                toolDesc += `: ${this.makeRelativePath(String(input.file_path), cwd)}`;
              } else if (toolName === 'Write' && input.file_path) {
                toolDesc += `: ${this.makeRelativePath(String(input.file_path), cwd)}`;
              } else if (toolName === 'Grep' && input.pattern) {
                toolDesc += `: ${input.pattern}`;
              } else if (toolName === 'Glob' && input.pattern) {
                toolDesc += `: ${input.pattern}`;
              }

              return this.createProgress('log', toolDesc);
            }
          }
        }
        return null;

      case 'user':
        // Tool results
        if (msg.tool_use_result) {
          const stdout = msg.tool_use_result.stdout || '';
          const stderr = msg.tool_use_result.stderr || '';
          if (stdout || stderr) {
            const output = stdout + (stderr ? `\n[stderr] ${stderr}` : '');
            // Truncate long outputs
            const truncated = output.length > 500
              ? output.substring(0, 500) + '...\n[output truncated]'
              : output;
            return this.createProgress('stdout', truncated);
          }
        }
        return null;

      case 'result':
        return this.createProgress('log', msg.is_error ? '❌ Task failed' : '✅ Task completed');

      default:
        return null;
    }
  }
}

/**
 * Factory function to create the default agent.
 */
export function createDefaultAgent(): StreamingClaudeCliAgent {
  return new StreamingClaudeCliAgent();
}
