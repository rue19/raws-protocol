import cron from "node-cron";
import Fastify from "fastify";
import { config } from "./config";
import { logger } from "./lib/logger";
import { runWatchdogCycle } from "./jobs/watchdog";
import { runCompoundCycle } from "./jobs/harvester";

const state = {
  lastWatchdogRun: null as string | null,
  lastCompoundRun: null as string | null,
  failures: 0,
};

async function safeRun(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    logger.info({ job: name }, "cycle completed");
  } catch (err) {
    state.failures++;
    logger.error({ job: name, err }, "cycle failed — will retry next tick");
  }
}

async function main() {
  const app = Fastify({ logger: false });
  app.get("/health", async () => ({ status: "ok", ...state }));
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  logger.info({ port: config.PORT }, "health check server started");

  cron.schedule(config.WATCHDOG_INTERVAL_CRON, () =>
    safeRun("watchdog", async () => {
      await runWatchdogCycle();
      state.lastWatchdogRun = new Date().toISOString();
    })
  );
  cron.schedule(config.COMPOUND_INTERVAL_CRON, () =>
    safeRun("harvester", async () => {
      await runCompoundCycle();
      state.lastCompoundRun = new Date().toISOString();
    })
  );

  logger.info(
    { watchdog: config.WATCHDOG_INTERVAL_CRON, harvester: config.COMPOUND_INTERVAL_CRON },
    "cron jobs scheduled"
  );

  await safeRun("watchdog", async () => {
    await runWatchdogCycle();
    state.lastWatchdogRun = new Date().toISOString();
  });
  await safeRun("harvester", async () => {
    await runCompoundCycle();
    state.lastCompoundRun = new Date().toISOString();
  });
}

main().catch((err) => {
  logger.error(err, "fatal boot error");
  process.exit(1);
});