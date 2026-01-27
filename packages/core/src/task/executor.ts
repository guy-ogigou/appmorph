import { EventEmitter } from 'events';
import {
  Task,
  AgentProgress,
  AgentResult,
  AgentRunContext,
  AgentConstraints,
} from '@appmorph/shared';
import { createDefaultAgent } from '../agent/claude-cli.js';
import { getRepoManager } from '../repo/index.js';

export interface TaskExecutor extends EventEmitter {
  execute(task: Task): Promise<AgentResult>;
  on(event: 'progress', listener: (taskId: string, progress: AgentProgress) => void): this;
  on(event: 'complete', listener: (taskId: string, result: AgentResult) => void): this;
  on(event: 'error', listener: (taskId: string, error: Error) => void): this;
}

class TaskExecutorImpl extends EventEmitter implements TaskExecutor {
  private runningTasks = new Map<string, { abortController: AbortController }>();

  async execute(task: Task): Promise<AgentResult> {
    const agent = createDefaultAgent();
    const repoManager = getRepoManager();

    const context: AgentRunContext = {
      prompt: task.prompt,
      repoPath: repoManager.getProjectPath(),
      branch: task.branch,
      constraints: this.getDefaultConstraints(),
    };

    const abortController = new AbortController();
    this.runningTasks.set(task.id, { abortController });

    try {
      const generator = agent.run(context);
      let result: AgentResult | undefined;

      // Iterate through the generator, yielding progress events
      while (true) {
        const { value, done } = await generator.next();

        if (done) {
          result = value as AgentResult;
          break;
        }

        // Emit progress event
        const progress = value as AgentProgress;
        this.emit('progress', task.id, progress);
      }

      if (!result) {
        result = {
          success: false,
          summary: 'Agent did not return a result',
          filesChanged: [],
        };
      }

      this.emit('complete', task.id, result);
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', task.id, errorObj);

      return {
        success: false,
        summary: errorObj.message,
        filesChanged: [],
      };
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  private getDefaultConstraints(): AgentConstraints {
    return {
      // Allow all paths by default (can be configured later)
      allowedPaths: ['**/*'],
      blockedPaths: ['node_modules/**', '.git/**'],
    };
  }

  abort(taskId: string): boolean {
    const running = this.runningTasks.get(taskId);
    if (running) {
      running.abortController.abort();
      return true;
    }
    return false;
  }
}

// Singleton instance
let executorInstance: TaskExecutor | null = null;

export function getTaskExecutor(): TaskExecutor {
  if (!executorInstance) {
    executorInstance = new TaskExecutorImpl();
  }
  return executorInstance;
}
