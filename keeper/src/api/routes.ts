import { FastifyInstance } from 'fastify';
import { positionsRoutes }  from './positions';
import { poolsRoutes }      from './pools';
import { compoundLogRoutes } from './compoundLog';
import { alertsRoutes }     from './alerts';
import { telegramRoutes }   from './telegram';
import { wsRoutes }         from './ws';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // REST routes — all prefixed with /api/v1
  await fastify.register(async (f) => {
    await positionsRoutes(f);
    await poolsRoutes(f);
    await compoundLogRoutes(f);
    await alertsRoutes(f);
    await telegramRoutes(f);
  }, { prefix: '/api/v1' });

  // WebSocket routes — no prefix (WS clients connect to /ws/...)
  await wsRoutes(fastify);
}
