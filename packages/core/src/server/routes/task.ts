import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  API_ROUTES,
  CreateTaskRequest,
  CreateTaskResponse,
  TaskStatusResponse,
  Task,
  SSE_EVENTS,
  AgentProgress,
  AgentResult,
} from '@appmorph/shared';
import { getTaskExecutor } from '../../task/executor.js';

// In-memory task store
const tasks = new Map<string, Task>();

// Track active SSE connections for each task
const taskConnections = new Map<string, Set<(event: string, data: unknown) => void>>();

export async function registerTaskRoutes(fastify: FastifyInstance): Promise<void> {
  const executor = getTaskExecutor();

  // Listen for executor events and broadcast to connected clients
  executor.on('progress', (taskId: string, progress: AgentProgress) => {
    const connections = taskConnections.get(taskId);
    if (connections) {
      for (const sendEvent of connections) {
        sendEvent(SSE_EVENTS.PROGRESS, progress);
      }
    }

    // Update task status
    const task = tasks.get(taskId);
    if (task) {
      task.status = 'running';
      task.updatedAt = Date.now();
    }
  });

  executor.on('complete', (taskId: string, result: AgentResult) => {
    const connections = taskConnections.get(taskId);
    if (connections) {
      for (const sendEvent of connections) {
        sendEvent(SSE_EVENTS.COMPLETE, result);
      }
      // Clean up connections after sending complete
      taskConnections.delete(taskId);
    }

    // Update task status
    const task = tasks.get(taskId);
    if (task) {
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      task.updatedAt = Date.now();
    }
  });

  executor.on('error', (taskId: string, error: Error) => {
    const connections = taskConnections.get(taskId);
    if (connections) {
      for (const sendEvent of connections) {
        sendEvent(SSE_EVENTS.ERROR, { message: error.message });
      }
      taskConnections.delete(taskId);
    }

    // Update task status
    const task = tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error.message;
      task.updatedAt = Date.now();
    }
  });

  // Create a new task
  fastify.post<{ Body: CreateTaskRequest; Reply: CreateTaskResponse }>(
    API_ROUTES.TASK,
    async (request, _reply) => {
      const { prompt, groupId } = request.body;

      // Extract user context from auth header
      const userId = (request.headers['x-user-id'] as string) || 'anonymous';

      const taskId = uuidv4();
      const branch = groupId
        ? `appmorph/g/${groupId}`
        : `appmorph/u/${userId}`;

      const task: Task = {
        id: taskId,
        prompt,
        status: 'pending',
        userId,
        groupId,
        branch,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasks.set(taskId, task);

      // Start executing the task in the background
      setImmediate(() => {
        task.status = 'running';
        task.updatedAt = Date.now();

        executor.execute(task).catch((error) => {
          console.error('Task execution error:', error);
        });
      });

      return { taskId, branch };
    }
  );

  // Get task status
  fastify.get<{ Params: { taskId: string }; Reply: TaskStatusResponse }>(
    API_ROUTES.TASK_STATUS,
    async (request, reply) => {
      const { taskId } = request.params;
      const task = tasks.get(taskId);

      if (!task) {
        reply.status(404);
        return { task: null as unknown as Task };
      }

      return { task };
    }
  );

  // Stream task progress via SSE
  fastify.get<{ Params: { taskId: string } }>(
    API_ROUTES.TASK_STREAM,
    async (request, reply): Promise<void> => {
      const { taskId } = request.params;
      const task = tasks.get(taskId);

      if (!task) {
        reply.status(404).send({ error: 'Task not found' });
        return;
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Create send function for this connection
      const sendEvent = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Register this connection
      if (!taskConnections.has(taskId)) {
        taskConnections.set(taskId, new Set());
      }
      taskConnections.get(taskId)!.add(sendEvent);

      // Send current task status
      sendEvent(SSE_EVENTS.PROGRESS, {
        type: 'log',
        content: `Connected to task ${taskId} (status: ${task.status})`,
        timestamp: Date.now(),
      } satisfies AgentProgress);

      // If task is already complete, send the result
      if (task.status === 'completed' && task.result) {
        sendEvent(SSE_EVENTS.COMPLETE, task.result);
        reply.raw.end();
        return;
      }

      if (task.status === 'failed') {
        sendEvent(SSE_EVENTS.ERROR, { message: task.error || 'Task failed' });
        reply.raw.end();
        return;
      }

      // Handle client disconnect
      request.raw.on('close', () => {
        const connections = taskConnections.get(taskId);
        if (connections) {
          connections.delete(sendEvent);
          if (connections.size === 0) {
            taskConnections.delete(taskId);
          }
        }
      });
    }
  );

  // List all tasks (for debugging)
  fastify.get('/api/tasks', async () => {
    return {
      tasks: Array.from(tasks.values()).map((t) => ({
        id: t.id,
        prompt: t.prompt.substring(0, 100),
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  });
}
