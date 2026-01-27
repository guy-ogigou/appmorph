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
} from '@appmorph/shared';

// In-memory task store (would be replaced with proper persistence)
const tasks = new Map<string, Task>();

export async function registerTaskRoutes(fastify: FastifyInstance): Promise<void> {
  // Create a new task
  fastify.post<{ Body: CreateTaskRequest; Reply: CreateTaskResponse }>(
    API_ROUTES.TASK,
    async (request, _reply) => {
      const { prompt, groupId } = request.body;

      // Extract user context from auth header (simplified for now)
      const userId = request.headers['x-user-id'] as string || 'anonymous';

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

      // In Phase 2, this would trigger agent execution
      // For now, just return the task info
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
      });

      // Send initial connection message
      const sendEvent = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // For Phase 1, send mock progress events
      sendEvent(SSE_EVENTS.PROGRESS, {
        type: 'log',
        content: 'Task received, agent starting...',
        timestamp: Date.now(),
      } satisfies AgentProgress);

      // In Phase 2, this would stream actual agent progress
      // For now, simulate completion after a delay
      setTimeout(() => {
        sendEvent(SSE_EVENTS.COMPLETE, {
          success: true,
          summary: 'Task processing stubbed (Phase 1)',
          filesChanged: [],
        });
        reply.raw.end();
      }, 1000);
    }
  );
}
