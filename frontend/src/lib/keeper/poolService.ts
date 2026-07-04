import { db } from './db';
import type { TrackedPool, PoolSnapshot, PoolWithHealth } from './types';

const AQUARIUS_API = process.env.AQUARIUS_API_URL ?? 'https://api.aqua.network/api/v1';

export function calcIL(entryRatio: number, currentRatio: number): number {
  if (entryRatio === 0) return 0;
  const k = Math.sqrt(currentRatio / entryRatio);
  return (2 * k) / (1 + k) - 1;
}

export function calcNEY(feeRevenue: number, ilDecimal: number): number {
  return feeRevenue - Math.abs(ilDecimal);
}

export function annualise(periodRate: number, periodMinutes = 30): number {
  const periodsPerYear = (365 * 24 * 60) / periodMinutes;
  return periodRate * periodsPerYear;
}

export async function getRecentSnapshots(poolId: string, limit = 3): Promise<PoolSnapshot[]> {
  const { data, error } = await db
    .from('pool_snapshots')
    .select('*')
    .eq('pool_id', poolId)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`DB error fetching snapshots: ${error.message}`);
  return (data ?? []) as PoolSnapshot[];
}

async function getConsecutiveRedCount(poolId: string): Promise<number> {
  const snapshots = await getRecentSnapshots(poolId, 10);
  let count = 0;
  for (const snap of snapshots) {
    if (snap.health_status === 'RED' || snap.health_status === 'RED_CRITICAL') count++;
    else break;
  }
  return count;
}

export async function getEmissionApy(poolId: string): Promise<number> {
  try {
    const res = await fetch(`${AQUARIUS_API}/rewards/pool/?pool_id=${encodeURIComponent(poolId)}`);
    if (!res.ok) return 0;
    const json = (await res.json()) as { daily_aqua_reward_amount?: number; total_shares?: number };
    if (!json.daily_aqua_reward_amount || !json.total_shares) return 0;
    return (json.daily_aqua_reward_amount / json.total_shares) * 365;
  } catch {
    return 0;
  }
}

export async function enrichPool(pool: TrackedPool): Promise<PoolWithHealth> {
  const snapshots = await getRecentSnapshots(pool.pool_id, 3);
  const latest = snapshots[0] ?? null;
  const consecutiveRed = await getConsecutiveRedCount(pool.pool_id);
  const emissionApy = await getEmissionApy(pool.pool_id);

  let realYieldApy = 0;
  let neyScore: number | null = null;
  let healthStatus: PoolWithHealth['health_status'] = 'UNKNOWN';

  if (latest) {
    realYieldApy = annualise(latest.fee_revenue_period);
    neyScore = latest.ney_score;
    healthStatus = latest.health_status as PoolWithHealth['health_status'];
  }

  return {
    ...pool,
    latest_snapshot: latest,
    ney_score: neyScore,
    health_status: healthStatus,
    real_yield_apy: realYieldApy,
    emission_yield_apy: emissionApy,
    total_apy: realYieldApy + emissionApy,
    tvl_usd: latest?.total_tvl_usd ?? null,
    consecutive_red: consecutiveRed,
  };
}
