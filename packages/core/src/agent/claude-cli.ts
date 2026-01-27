import { AgentRunContext, AgentProgress, AgentResult } from '@appmorph/shared';
import { BaseAgent } from './interface.js';

/**
 * ClaudeCliAgent - Executes the Claude CLI to process prompts.
 *
 * In Phase 2, this will spawn the `claude` CLI process and stream
 * its output. For Phase 1, it's a stub that simulates the behavior.
 */
export class ClaudeCliAgent extends BaseAgent {
  readonly name = 'claude-cli';

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined> {
    // Log the start of execution
    yield this.createProgress('log', `Starting Claude CLI agent for branch: ${ctx.branch}`);
    yield this.createProgress('log', `Prompt: ${ctx.prompt.substring(0, 100)}...`);

    // Simulate thinking phase
    yield this.createProgress('thinking', 'Analyzing the request...');

    // In Phase 2, this would:
    // 1. Spawn `claude` CLI with the prompt and repo context
    // 2. Stream stdout/stderr as progress events
    // 3. Parse file changes from the output
    // 4. Create a commit with the changes

    // For now, simulate some work
    await this.sleep(500);
    yield this.createProgress('log', 'Processing prompt with Claude...');

    await this.sleep(500);
    yield this.createProgress('thinking', 'Determining required changes...');

    await this.sleep(500);
    yield this.createProgress('log', 'Agent execution stubbed in Phase 1');

    // Return a stub result
    return this.createResult(true, 'Phase 1 stub - no actual changes made', {
      filesChanged: [],
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create the default agent.
 */
export function createDefaultAgent(): ClaudeCliAgent {
  return new ClaudeCliAgent();
}
