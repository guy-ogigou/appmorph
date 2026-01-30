import { AgentRunContext, AgentProgress, AgentResult } from '@appmorph/shared';
import { BaseAgent } from './interface.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Definition of a mock step that the MockAgent will execute.
 */
export interface MockStep {
  /** Prompt substring to match against ctx.prompt */
  promptMatch: string;
  /** Progress events to yield during execution */
  progress: Array<Omit<AgentProgress, 'timestamp'>>;
  /** File changes to write to the stage directory (relative path -> content) */
  fileChanges: Map<string, string>;
  /** Final result to return */
  result: Omit<AgentResult, 'stageInfo' | 'deployInfo'>;
}

/**
 * Helper to create a delay for simulating async work.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * MockAgent - A test double for the Claude CLI agent.
 *
 * Instead of spawning the Claude CLI, this agent yields pre-defined progress
 * events and writes pre-built file changes to the stage directory.
 */
export class MockAgent extends BaseAgent {
  readonly name = 'mock-agent';
  private steps: MockStep[];

  constructor(steps: MockStep[]) {
    super();
    this.steps = steps;
  }

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined> {
    // Find the matching step based on prompt
    const step = this.steps.find((s) => ctx.prompt.includes(s.promptMatch));

    if (!step) {
      yield this.createProgress('log', `No mock step found for prompt: ${ctx.prompt}`);
      return this.createResult(false, `No mock step configured for this prompt`, {
        filesChanged: [],
      });
    }

    yield this.createProgress('log', `MockAgent executing step: ${step.promptMatch}`);
    yield this.createProgress('thinking', `Analyzing: ${ctx.prompt.substring(0, 50)}...`);

    // Yield progress events with small delays to simulate real timing
    for (const progress of step.progress) {
      yield this.createProgress(progress.type, progress.content);
      await delay(10);
    }

    // Write file changes to the stage directory
    const filesChanged: string[] = [];
    for (const [relativePath, content] of step.fileChanges) {
      const fullPath = join(ctx.repoPath, relativePath);

      // Ensure directory exists
      mkdirSync(dirname(fullPath), { recursive: true });

      // Write the file
      writeFileSync(fullPath, content, 'utf-8');
      filesChanged.push(relativePath);

      yield this.createProgress('log', `Wrote: ${relativePath}`);
    }

    yield this.createProgress('log', 'MockAgent completed');

    return this.createResult(step.result.success, step.result.summary, {
      filesChanged: step.result.filesChanged.length > 0 ? step.result.filesChanged : filesChanged,
      commitSha: step.result.commitSha,
      testResults: step.result.testResults,
    });
  }
}

// ============================================
// Mock Agent Factory for Testing
// ============================================

/**
 * Factory function type for creating agents.
 */
type AgentFactory = () => BaseAgent;

/**
 * Global mock agent factory. When set, createDefaultAgent will use this
 * instead of creating a real StreamingClaudeCliAgent.
 */
let mockAgentFactory: AgentFactory | null = null;

/**
 * Set the mock agent factory for testing.
 * Pass null to clear the mock and restore normal behavior.
 */
export function setMockAgentFactory(factory: AgentFactory | null): void {
  mockAgentFactory = factory;
}

/**
 * Get the current mock agent factory.
 * Returns null if no mock is set.
 */
export function getMockAgentFactory(): AgentFactory | null {
  return mockAgentFactory;
}

/**
 * Clear the mock agent factory (convenience alias for setMockAgentFactory(null)).
 */
export function clearMockAgentFactory(): void {
  mockAgentFactory = null;
}
