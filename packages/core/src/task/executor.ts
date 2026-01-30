import { EventEmitter } from 'events';
import {
  Task,
  AgentProgress,
  AgentResult,
  AgentRunContext,
  AgentConstraints,
  StageInfo,
  DeployInfo,
} from '@appmorph/shared';
import { createDefaultAgent } from '../agent/claude-cli.js';
import { getStagingManager } from '../staging/index.js';
import { getBuildManager } from '../build/index.js';
import { getDeployManager } from '../deploy/index.js';

export interface ExecuteOptions {
  parentSessionId?: string | null;
}

export interface TaskExecutor extends EventEmitter {
  execute(task: Task, options?: ExecuteOptions): Promise<AgentResult>;
  on(event: 'progress', listener: (taskId: string, progress: AgentProgress) => void): this;
  on(event: 'complete', listener: (taskId: string, result: AgentResult) => void): this;
  on(event: 'error', listener: (taskId: string, error: Error) => void): this;
}

class TaskExecutorImpl extends EventEmitter implements TaskExecutor {
  private runningTasks = new Map<string, { abortController: AbortController }>();

  async execute(task: Task, options?: ExecuteOptions): Promise<AgentResult> {
    const parentSessionId = options?.parentSessionId ?? null;
    console.log(`[Executor] Starting task ${task.id}: "${task.prompt.substring(0, 50)}..."`);
    if (parentSessionId) {
      console.log(`[Executor] Chaining from parent session: ${parentSessionId}`);
    }

    const agent = createDefaultAgent();
    let stageInfo: StageInfo | undefined;
    let deployInfo: DeployInfo | undefined;

    // Step 1: Create staging directory (using chained staging if parent exists)
    try {
      const stagingManager = getStagingManager();
      stageInfo = stagingManager.createChainedStage(task.id, parentSessionId);
      console.log(`[Executor] Stage created at: ${stageInfo.stagePath}`);

      this.emit('progress', task.id, {
        type: 'log',
        content: `Stage created at: ${stageInfo.stagePath}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[Executor] Failed to create stage: ${error}`);
      return {
        success: false,
        summary: `Failed to create staging directory: ${error instanceof Error ? error.message : String(error)}`,
        filesChanged: [],
      };
    }

    // Step 2: Run the agent on the staged copy
    const context: AgentRunContext = {
      prompt: task.prompt,
      repoPath: stageInfo.stagePath,  // Use staged path, not original source
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
          console.log(`[Executor] Task ${task.id} agent completed: ${result.success ? 'success' : 'failed'}`);
          break;
        }

        // Emit progress event
        const progress = value as AgentProgress;
        console.log(`[Executor] Progress (${progress.type}): ${progress.content.substring(0, 100)}${progress.content.length > 100 ? '...' : ''}`);
        this.emit('progress', task.id, progress);
      }

      if (!result) {
        result = {
          success: false,
          summary: 'Agent did not return a result',
          filesChanged: [],
        };
      }

      // Step 3: If agent succeeded, execute build
      if (result.success) {
        try {
          const buildManager = getBuildManager();
          const deployManager = getDeployManager();

          this.emit('progress', task.id, {
            type: 'log',
            content: 'Starting build...',
            timestamp: Date.now(),
          });

          const buildResult = await buildManager.executeBuild(task.id, stageInfo.stagePath);

          if (buildResult.success) {
            console.log(`[Executor] Build completed successfully`);
            deployInfo = deployManager.getDeployInfo(task.id);

            this.emit('progress', task.id, {
              type: 'log',
              content: `Build completed. Deploy URL: ${deployInfo.deployUrl}`,
              timestamp: Date.now(),
            });
          } else {
            console.error(`[Executor] Build failed: ${buildResult.error}`);
            this.emit('progress', task.id, {
              type: 'log',
              content: `Build failed: ${buildResult.error}`,
              timestamp: Date.now(),
            });
            // Don't fail the whole task if build fails, just don't include deploy info
          }
        } catch (error) {
          console.error(`[Executor] Build error: ${error}`);
          this.emit('progress', task.id, {
            type: 'log',
            content: `Build error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: Date.now(),
          });
        }
      }

      // Add stage and deploy info to result
      result.stageInfo = stageInfo;
      result.deployInfo = deployInfo;

      this.emit('complete', task.id, result);
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', task.id, errorObj);

      return {
        success: false,
        summary: errorObj.message,
        filesChanged: [],
        stageInfo,
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

/**
 * Reset the task executor singleton (for testing).
 */
export function resetTaskExecutor(): void {
  if (executorInstance) {
    executorInstance.removeAllListeners();
  }
  executorInstance = null;
}
