import { db } from '../db';
import { TrackedPool, PoolSnapshot, PoolWithHealth } from '../types/index';

const AQUARIUS_API = process.env.AQUARIUS_API_URL ?? 'https://api.aqua.network/api/v1';

/**
 * Calculate impermanent loss as a signed decimal.
 * Standard IL formula: IL = (2√k / (1+k)) - 1  where k = currentRatio / entryRatio
 * Returns a negative number (e.g. -0.05 = 5% IL loss)
 */
export function calcIL(entryRatio: number, currentRatio: number): number {
  if (entryRatio <= 0 || currentRatio <= 0) return 0;
  const k = currentRatio / entryRatio;
  return (2 * Math.sqrt(k)) / (1 + k) - 1;
}

/**
 * Calculate Net Effective Yield.
 * NEY = fee_revenue_period - IL_for_period
 * Both expressed as decimals (e.g. 0.005 = 0.5%)
 */
export function calcNEY(feeRevenue: number, ilDecimal: number): number {
  return feeRevenue - Math.abs(ilDecimal);
}

/**
 * Annualise a per-period rate.
 * period_minutes: how long each snapshot period is (default 30 min)
 */
export function annualise(periodRate: number, periodMinutes = 30): number {
  const periodsPerYear = (365 * 24 * 60) / periodMinutes;
  return periodRate * periodsPerYear;
}

/**
 * Fetch the last N snapshots for a pool from Supabase.
 */
export async function getRecentSnapshots(
  poolId: string,
  limit = 3
): Promise<PoolSnapshot[]> {
  const { data, error } = await db
    .from('pool_snapshots')
    .select('*')
    .eq('pool_id', poolId)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`DB error fetching snapshots: ${error.message}`);
  return (data ?? []) as PoolSnapshot[];
}

/**
 * Count how many consecutive RED periods a pool has right now.
 */
export async function getConsecutiveRedCount(poolId: string): Promise<number> {
  const snapshots = await getRecentSnapshots(poolId, 10);
  let count = 0;
  for (const snap of snapshots) {
    if (snap.health_status === 'RED' || snap.health_status === 'RED_CRITICAL') {
      count++;
    } else {
      break; // stop at first non-red
    }
  }
  return count;
}

/**
 * Fetch AQUA emission APY for a pool from Aquarius public API.
 * Returns 0 if the API is unavailable (graceful degradation).
 */
export async function getEmissionApy(poolId: string): Promise<number> {
  try {
    // Aquarius API: GET /rewards/pool/?pool_id=<id>
    const res = await fetch(`${AQUARIUS_API}/rewards/pool/?pool_id=${encodeURIComponent(poolId)}`);
    if (!res.ok) return 0;
    const json = await res.json() as { daily_aqua_reward_amount?: number; total_shares?: number };
    if (!json.daily_aqua_reward_amount || !json.total_shares) return 0;
    // Annualise: (daily_reward / total_shares) * 365
    return (json.daily_aqua_reward_amount / json.total_shares) * 365;
  } catch {
    return 0; // Aquarius API unavailable — degrade gracefully, don't crash
  }
}

/**
 * Enrich a TrackedPool with live NEY, health, and yield breakdown.
 * This is the main function called by GET /pools.
 */
export async function enrichPool(pool: TrackedPool): Promise<PoolWithHealth> {
  const snapshots = await getRecentSnapshots(pool.pool_id, 3);
  const latest   = snapshots[0] ?? null;
  const consecutiveRed = await getConsecutiveRedCount(pool.pool_id);
  const emissionApy    = await getEmissionApy(pool.pool_id);

  let realYieldApy = 0;
  let neyScore: number | null = null;
  let healthStatus: PoolWithHealth['health_status'] = 'UNKNOWN';

  if (latest) {
    // Real yield APY = annualised fee revenue from latest snapshot
    realYieldApy = annualise(latest.fee_revenue_period);

    // NEY = fee_revenue - IL (using price_ratio as current, need entry — use 1.0 as baseline
    // The watchdog already computed ney_score and health_status per snapshot
    neyScore     = latest.ney_score;
    healthStatus = latest.health_status as PoolWithHealth['health_status'];
  }

  return {
    ...pool,
    latest_snapshot:    latest,
    ney_score:          neyScore,
    health_status:      healthStatus,
    real_yield_apy:     realYieldApy,
    emission_yield_apy: emissionApy,
    total_apy:          realYieldApy + emissionApy,
    tvl_usd:            latest?.total_tvl_usd ?? null,
    consecutive_red:    consecutiveRed,
  };
}
