import { getPoolReserves, getFeeRevenueSince } from "../services/horizon";
import { getActivePoolIds } from "../services/supabase";
import { logger } from "../lib/logger";
import type { PoolSnapshot } from "../types";

function thirtyMinutesAgo(): Date {
  return new Date(Date.now() - 30 * 60 * 1000);
}

function roundTo30MinBoundary(date: Date): Date {
  const ms = date.getTime();
  const boundaryMs = Math.floor(ms / (30 * 60 * 1000)) * (30 * 60 * 1000);
  return new Date(boundaryMs);
}

export async function snapshotAllPools(): Promise<PoolSnapshot[]> {
  const poolIds = await getActivePoolIds();
  const snapshots: PoolSnapshot[] = [];

  for (const poolId of poolIds) {
    try {
      const { reserveA, reserveB } = await getPoolReserves(poolId);
      const feeRevenue = await getFeeRevenueSince(poolId, thirtyMinutesAgo());

      const reserveAVal = Number(reserveA);
      const reserveBVal = Number(reserveB);
      const currentPriceRatio =
        reserveAVal !== 0 ? reserveBVal / reserveAVal : 0;

      snapshots.push({
        pool_id: poolId,
        reserve_a: reserveA,
        reserve_b: reserveB,
        fee_revenue_30m: feeRevenue,
        current_price_ratio: currentPriceRatio,
        cycle_timestamp: roundTo30MinBoundary(new Date()),
      });
    } catch (err) {
      logger.error({ poolId, err }, "failed to snapshot pool — skipping this cycle");
    }
  }

  return snapshots;
}