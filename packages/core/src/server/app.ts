import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { API_ROUTES } from '@appmorph/shared';
import { registerTaskRoutes } from './routes/task.js';
import { registerVersionRoutes } from './routes/version.js';

export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Health check endpoint
  fastify.get(API_ROUTES.HEALTH, async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Register route modules
  await registerTaskRoutes(fastify);
  await registerVersionRoutes(fastify);

  return fastify;
}
