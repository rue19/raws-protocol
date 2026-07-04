import { getActivePositions, hasRecentCompoundLog, insertCompoundLog, updateCompoundLog } from "../services/db";
import { getPendingRewards } from "../services/aquarius";
import { callHarvest } from "../services/soroban";
import { logger } from "../lib/logger";
import crypto from "crypto";

function fourHoursAgo(): Date {
  return new Date(Date.now() - 4 * 60 * 60 * 1000);
}

export async function runCompoundCycle(): Promise<void> {
  const positions = await getActivePositions();

  for (const pos of positions) {
    try {
      const pending = await getPendingRewards(pos.lp_address || pos.pool_id);
      if (pending < BigInt(10000)) {
        logger.debug({ pool: pos.pool_id }, "pending rewards below threshold — skipping");
        continue;
      }

      const alreadyHarvestedThisWindow = await hasRecentCompoundLog(pos.pool_id, fourHoursAgo());
      if (alreadyHarvestedThisWindow) continue;

      const logRow = await insertCompoundLog({
        pool_id: pos.pool_id,
        user_address: pos.user_address,
        position_id: pos.id,
        rewards_harvested: Number(pending),
        tx_hash: "PENDING_" + crypto.randomUUID(),
        gas_cost_xlm: 0,
      });

      const txHash = await callHarvest(pos.pool_id, pos.lp_address);

      await updateCompoundLog(logRow.id, { tx_hash: txHash });
      logger.info({ pool: pos.pool_id, txHash }, "harvest + reinvest complete");
    } catch (err) {
      logger.error({ pool: pos.pool_id, err }, "harvest failed for this position — continuing to next");
    }
  }
}
