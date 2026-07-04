import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/keeper/auth';
import { db } from '@/lib/keeper/db';
import { enrichPool } from '@/lib/keeper/poolService';
import type { TrackedPool } from '@/lib/keeper/types';

let poolsCache: { data: object[]; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const now = Date.now();
  if (poolsCache && now - poolsCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      pools: poolsCache.data,
      count: poolsCache.data.length,
      fetched_at: new Date(poolsCache.cachedAt).toISOString(),
      cache_hit: true,
    });
  }

  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get('protocol');
  const safeMode = searchParams.get('safe_mode');
  const minNey = searchParams.get('min_ney');

  let query = db.from('tracked_pools').select('*').eq('is_active', true);
  if (protocol) query = query.eq('protocol', protocol);
  if (safeMode !== null) query = query.eq('is_safe_mode', safeMode === 'true');

  const { data: pools, error } = await query;
  if (error) {
    return NextResponse.json({ statusCode: 500, error: 'DatabaseError', message: error.message }, { status: 500 });
  }

  const enriched = await Promise.all((pools as TrackedPool[]).map(enrichPool));

  const filtered = minNey
    ? enriched.filter((p) => p.ney_score !== null && p.ney_score >= parseFloat(minNey))
    : enriched;

  filtered.sort((a, b) => {
    const order = { GREEN: 0, YELLOW: 1, RED: 2, RED_CRITICAL: 3, UNKNOWN: 4 };
    const diff = (order[a.health_status] ?? 4) - (order[b.health_status] ?? 4);
    if (diff !== 0) return diff;
    return (b.ney_score ?? -Infinity) - (a.ney_score ?? -Infinity);
  });

  poolsCache = { data: filtered, cachedAt: now };

  return NextResponse.json({
    pools: filtered,
    count: filtered.length,
    fetched_at: new Date().toISOString(),
    cache_hit: false,
  });
}
