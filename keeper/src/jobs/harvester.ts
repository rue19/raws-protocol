import { getActivePositions, hasRecentCompoundLog, insertCompoundLog, updateCompoundLog } from "../services/db";
import { getPendingRewards } from "../services/aquarius";
import { claimAndCompound } from "../services/soroban";
import { logger } from "../lib/logger";
import crypto from "crypto";

function fourHoursAgo(): Date {
  return new Date(Date.now() - 4 * 60 * 60 * 1000);
}

const MIN_AQUA_REWARD = BigInt(10000);

export async function runCompoundCycle(): Promise<void> {
  const positions = await getActivePositions();

  for (const pos of positions) {
    try {
      const aquaRewards = await getPendingRewards(pos.pool_id);
      if (aquaRewards < MIN_AQUA_REWARD) {
        logger.debug({ pool: pos.pool_id }, "pending AQUA rewards below threshold — skipping");
        continue;
      }

      const alreadyHarvestedThisWindow = await hasRecentCompoundLog(pos.pool_id, fourHoursAgo());
      if (alreadyHarvestedThisWindow) continue;

      const logRow = await insertCompoundLog({
        pool_id: pos.pool_id,
        user_address: pos.user_address,
        position_id: pos.id,
        rewards_harvested: Number(aquaRewards),
        tx_hash: "PENDING_" + crypto.randomUUID(),
        gas_cost_xlm: 0,
      });

      // Full pipeline: claim AQUA → swap AQUA→LP via Soroswap → call vault.harvest()
      const { txHash, gasCostXlm } = await claimAndCompound(aquaRewards, pos.pool_id);

      await updateCompoundLog(logRow.id, { tx_hash: txHash, gas_cost_xlm: gasCostXlm });
      logger.info({ pool: pos.pool_id, aquaRewards: aquaRewards.toString(), txHash }, "compound complete");
    } catch (err) {
      logger.error({ pool: pos.pool_id, err }, "compound failed for this position — continuing to next");
    }
  }
}
