import { AgentRunContext, AgentProgress, AgentResult } from '@appmorph/shared';

/**
 * IAgent interface - defines the contract for AI agents that can
 * process user prompts and make changes to the codebase.
 */
export interface IAgent {
  /**
   * Run the agent with the given context.
   * Yields progress events as the agent works, and returns the final result.
   */
  run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined>;

  /**
   * Agent identifier for logging and plugin hooks.
   */
  readonly name: string;
}

/**
 * Base class for agents providing common functionality.
 */
export abstract class BaseAgent implements IAgent {
  abstract readonly name: string;

  abstract run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined>;

  protected createProgress(
    type: AgentProgress['type'],
    content: string
  ): AgentProgress {
    return {
      type,
      content,
      timestamp: Date.now(),
    };
  }

  protected createResult(
    success: boolean,
    summary: string,
    options: Partial<AgentResult> = {}
  ): AgentResult {
    return {
      success,
      summary,
      filesChanged: options.filesChanged || [],
      commitSha: options.commitSha,
      testResults: options.testResults,
    };
  }
}
