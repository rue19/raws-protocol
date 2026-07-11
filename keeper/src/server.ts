import Fastify, { FastifyInstance } from 'fastify';
import cors            from '@fastify/cors';
import helmet          from '@fastify/helmet';
import websocket       from '@fastify/websocket';
import rateLimit       from '@fastify/rate-limit';
import { config }      from './config';
import { registerRoutes } from './api/routes';

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // ── Security plugins ──────────────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // frontend handles its own CSP
  });

  await fastify.register(cors, {
    origin: config.NODE_ENV === 'production'
      ? [config.FRONTEND_URL]
      : [config.FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Rate limit: 100 requests per minute per IP on REST routes
  await fastify.register(rateLimit, {
    max:        100,
    timeWindow: '1 minute',
    // Exempt WebSocket upgrade requests
    skipOnError: true,
    keyGenerator: (req) => req.ip,
  });

  // ── WebSocket plugin ──────────────────────────────────────────────────────
  await fastify.register(websocket, {
    options: {
      maxPayload: 1_048_576,         // 1MB max message size
      clientTracking: true,
    },
  });

  // ── Auth hook ────────────────────────────────────────────────────────────────
  const PUBLIC_PATHS = ['/health', '/api/v1/webhook/telegram'];

  fastify.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];

    // Skip auth for public paths (exact match)
    if (PUBLIC_PATHS.includes(path)) return;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header',
      });
    }

    const token = authHeader.slice(7);
    if (token !== config.API_SECRET) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid API secret',
      });
    }
  });

  // ── Health check (Render uses this to verify the instance is alive) ───────
  fastify.get('/health', async (_req, reply) => {
    return reply.send({
      status:    'ok',
      service:   'raws-api',
      version:   '1.0.0',
      network:   config.STELLAR_NETWORK,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Register all routes ───────────────────────────────────────────────────
  await registerRoutes(fastify);

  // ── Global error handler ──────────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error:      'ValidationError',
        message:    error.message,
        details:    error.validation,
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        statusCode: 429,
        error:      'TooManyRequests',
        message:    'Slow down — max 100 requests per minute',
      });
    }

    return reply.status(error.statusCode ?? 500).send({
      statusCode: error.statusCode ?? 500,
      error:      'InternalServerError',
      message:    config.NODE_ENV === 'production'
                    ? 'Something went wrong'
                    : error.message,
    });
  });

  return fastify;
}
