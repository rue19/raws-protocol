import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import axios from 'axios';
import { getLatestSnapshot, getRecentAlerts } from './db';

const PORT = parseInt(process.env.PORT || '3001', 10);
const API_SECRET = process.env.API_SECRET || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

let fastify: ReturnType<typeof Fastify>;

export function initApi(): void {
  fastify = Fastify({ logger: true });

  fastify.register(cors, { origin: true });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/api/pool/:address', async (request: FastifyRequest, reply: FastifyReply) => {
    const { address } = request.params as { address: string };
    const snapshot = await getLatestSnapshot(address);
    if (!snapshot) {
      return reply.status(404).send({ error: 'Pool not found' });
    }
    return snapshot;
  });

  fastify.get('/api/alerts/:address', async (request: FastifyRequest, reply: FastifyReply) => {
    const { address } = request.params as { address: string };
    const { limit } = request.query as { limit?: string };
    const alerts = await getRecentAlerts(address, parseInt(limit || '10', 10));
    return { alerts };
  });

  fastify.get('/api/compound/:address', async () => {
    return { events: [] };
  });

  fastify.post('/api/compound', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (authHeader !== `Bearer ${API_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { compoundRewards } = await import('./harvester');
    const body = request.body as { lp_token?: string; amount?: number };
    const lpToken = body.lp_token;
    const amount = body.amount || 0;

    if (!lpToken) {
      return reply.status(400).send({ error: 'lp_token required' });
    }

    await compoundRewards(lpToken, amount);
    return { status: 'compounded' };
  });

  fastify.post('/api/watchdog/run', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (authHeader !== `Bearer ${API_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { runWatchdogCheck } = await import('./watchdog');
    await runWatchdogCheck();
    return { status: 'watchdog check completed' };
  });
}

export async function startApi(): Promise<void> {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// ─── Telegram Notifications ────────────────────────────────────────

export async function sendTelegramMessage(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram not configured — skipping notification');
    return;
  }

  try {
    const chatId = process.env.TELEGRAM_CHAT_ID || '';
    if (!chatId) {
      console.warn('TELEGRAM_CHAT_ID not set');
      return;
    }

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: `🔒 RAW$ Watchdog\n\n${message}`,
      parse_mode: 'HTML',
    });
    console.log('Telegram notification sent');
  } catch (error: any) {
    console.error('Failed to send Telegram message:', error.message);
  }
}
