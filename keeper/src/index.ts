import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { initDb } from './db';
import { initHarvester, compoundRewards } from './harvester';
import { initWatchdog, runWatchdogCheck } from './watchdog';
import { initApi, startApi, sendTelegramMessage } from './api';

// ─── Configuration ─────────────────────────────────────────────────

const WATCHDOG_INTERVAL = process.env.WATCHDOG_INTERVAL_MINUTES || '30';
const COMPOUND_INTERVAL = process.env.COMPOUND_INTERVAL_HOURS || '4';

// ─── Initialize ────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════');
console.log('  RAW$ Keeper Daemon');
console.log('═══════════════════════════════════════════');
console.log(`Network: ${process.env.STELLAR_NETWORK}`);
console.log(`Vault: ${process.env.VAULT_CONTRACT_ID}`);
console.log(`Watchdog: every ${WATCHDOG_INTERVAL} minutes`);
console.log(`Compound: every ${COMPOUND_INTERVAL} hours`);
console.log('═══════════════════════════════════════════');

// Initialize modules
initDb();
initHarvester();
initWatchdog();
initApi();

// ─── Cron Jobs ─────────────────────────────────────────────────────

// Watchdog: check IL every N minutes
const watchdogCron = `*/${WATCHDOG_INTERVAL} * * * *`;
cron.schedule(watchdogCron, async () => {
  try {
    await runWatchdogCheck();
  } catch (error: any) {
    console.error('Watchdog cron error:', error.message);
  }
});
console.log(`Watchdog cron scheduled: ${watchdogCron}`);

// Compound: harvest rewards every N hours
const compoundCron = `0 */${COMPOUND_INTERVAL} * * *`;
cron.schedule(compoundCron, async () => {
  try {
    const lpToken = process.env.LP_TOKEN_ADDRESS || '';
    if (lpToken) {
      // In production, calculate actual rewards from on-chain state
      await compoundRewards(lpToken, 0);
    }
  } catch (error: any) {
    console.error('Compound cron error:', error.message);
  }
});
console.log(`Compound cron scheduled: ${compoundCron}`);

// ─── Startup ───────────────────────────────────────────────────────

startApi().then(() => {
  sendTelegramMessage('RAW$ Keeper started successfully');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await sendTelegramMessage('RAW$ Keeper shutting down');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Interrupted — shutting down...');
  await sendTelegramMessage('RAW$ Keeper interrupted');
  process.exit(0);
});
