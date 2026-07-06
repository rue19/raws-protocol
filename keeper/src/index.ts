import dotenv from 'dotenv';
dotenv.config();

import { buildServer }                from './server';
import { config }                     from './config';
import { startRealtimeSubscriptions, stopRealtimeSubscriptions } from './services/realtimeService';
import { registerTelegramWebhook }    from './services/telegramService';
import cron                           from 'node-cron';
import { runWatchdogCycle }           from './jobs/watchdog';
import { runCompoundCycle }           from './jobs/harvester';

async function main() {
  console.log(`🚀 RAW$ API starting on port ${config.PORT}`);
  console.log(`🌐 Network: ${config.STELLAR_NETWORK}`);
  console.log(`📦 Vault:   ${config.VAULT_CONTRACT_ID}`);

  // ── Build and start Fastify ───────────────────────────────────────────────
  const server = await buildServer();

  await server.listen({
    port: parseInt(config.PORT),
    host: '0.0.0.0',   // CRITICAL: must be 0.0.0.0 for Render to expose the port
  });

  console.log(`✅ API listening on http://0.0.0.0:${config.PORT}`);

  // ── Start Supabase Realtime subscriptions ─────────────────────────────────
  startRealtimeSubscriptions();
  console.log('✅ Supabase Realtime subscriptions active');

  // ── Register Telegram webhook (only in production) ────────────────────────
  if (config.NODE_ENV === 'production' && config.TELEGRAM_BOT_TOKEN) {
    // RENDER_EXTERNAL_URL is auto-set by Render on deployment
    const baseUrl = process.env.RENDER_EXTERNAL_URL ?? '';
    if (baseUrl) {
      await registerTelegramWebhook(`${baseUrl}/api/v1/webhook/telegram`);
    }
  }

  // ── Keeper cron jobs ──────────────────────────────────────────────────────
  // IL Watchdog — every N minutes
  const watchdogInterval = parseInt(config.WATCHDOG_INTERVAL_MINUTES);
  cron.schedule(`*/${watchdogInterval} * * * *`, async () => {
    console.log(`[${new Date().toISOString()}] Running IL watchdog cycle...`);
    await runWatchdogCycle();
  });

  // Auto-compound — every N hours
  const compoundInterval = parseInt(config.COMPOUND_INTERVAL_HOURS);
  cron.schedule(`0 */${compoundInterval} * * *`, async () => {
    console.log(`[${new Date().toISOString()}] Running compound cycle...`);
    await runCompoundCycle();
  });

  console.log(`✅ Cron jobs scheduled (watchdog: ${watchdogInterval}min, compound: ${compoundInterval}h)`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    await stopRealtimeSubscriptions();
    await server.close();
    console.log('✅ Server closed');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
