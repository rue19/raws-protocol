import { db } from './db';
import type { TrackedPool, PoolSnapshot, PoolWithHealth } from '@/types';
import { annualise } from '@/lib/math';

const AQUARIUS_API = process.env.AQUARIUS_API_URL ?? 'https://api.aqua.network/api/v1';

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

function getConsecutiveRedCountFromSnaps(snapshots: PoolSnapshot[]): number {
  let count = 0;
  for (const snap of snapshots) {
    if (snap.health_status === 'RED' || snap.health_status === 'RED_CRITICAL') count++;
    else break;
  }
  return count;
}

async function getConsecutiveRedCount(poolId: string): Promise<number> {
  const snapshots = await getRecentSnapshots(poolId, 10);
  return getConsecutiveRedCountFromSnaps(snapshots);
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
  const snapshots = await getRecentSnapshots(pool.pool_id, 10);
  const latest = snapshots[0] ?? null;
  const consecutiveRed = getConsecutiveRedCountFromSnaps(snapshots);
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

export async function enrichPoolsBatch(pools: TrackedPool[]): Promise<PoolWithHealth[]> {
  if (pools.length === 0) return [];

  const poolIds = pools.map((p) => p.pool_id);

  const { data: snapshots } = await db
    .from('pool_snapshots')
    .select('*')
    .in('pool_id', poolIds)
    .order('captured_at', { ascending: false });

  const latestByPool = new Map<string, PoolSnapshot>();
  for (const snap of snapshots ?? []) {
    if (!latestByPool.has(snap.pool_id)) {
      latestByPool.set(snap.pool_id, snap as PoolSnapshot);
    }
  }

  const allSnapshotsByPool = new Map<string, PoolSnapshot[]>();
  for (const snap of snapshots ?? []) {
    const existing = allSnapshotsByPool.get(snap.pool_id) ?? [];
    existing.push(snap as PoolSnapshot);
    allSnapshotsByPool.set(snap.pool_id, existing);
  }

  const emissionResults = await Promise.allSettled(
    pools.map((p) => getEmissionApy(p.pool_id))
  );

  return pools.map((pool, i) => {
    const latest = latestByPool.get(pool.pool_id) ?? null;
    const poolSnaps = allSnapshotsByPool.get(pool.pool_id) ?? [];
    const consecutiveRed = getConsecutiveRedCountFromSnaps(poolSnaps);
    const emissionApy = emissionResults[i].status === 'fulfilled' ? emissionResults[i].value : 0;

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
  });
}
