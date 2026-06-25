import { config } from "../config";
import { snapshotAllPools } from "./snapshotPools";
import { evalPoolHealth } from "../lib/health";
import { triggerSmartExitAlert } from "../lib/alerts";
import {
  getActivePositionsForPool,
  getRecentSnapshots,
  upsertPoolSnapshot,
} from "../services/supabase";
import { logger } from "../lib/logger";

export async function runWatchdogCycle(): Promise<void> {
  const snapshots = await snapshotAllPools();

  for (const snap of snapshots) {
    try {
      const positions = await getActivePositionsForPool(snap.pool_id);
      if (positions.length === 0) continue;

      const poolEntryRatio = positions[0].entry_price_ratio;
      const enrichedSnap = { ...snap, entry_price_ratio: poolEntryRatio };

      const history = await getRecentSnapshots(snap.pool_id, config.RED_STREAK_TO_ALERT);
      const { status, ney } = await evalPoolHealth(enrichedSnap, history, {
        yellowThreshold: config.YELLOW_THRESHOLD,
        redStreakToAlert: config.RED_STREAK_TO_ALERT,
      });

      await upsertPoolSnapshot({
        ...enrichedSnap,
        ney,
        health_status: status,
      });

      if (status === "RED_CRITICAL") {
        for (const position of positions) {
          await triggerSmartExitAlert({
            pool: enrichedSnap,
            position,
            ney,
          });
        }
      }
    } catch (err) {
      logger.error({ poolId: snap.pool_id, err }, "watchdog cycle failed for pool");
    }
  }
}