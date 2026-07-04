import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/keeper/auth';
import { db } from '@/lib/keeper/db';
import { enrichPool } from '@/lib/keeper/poolService';
import type { TrackedPool } from '@/lib/keeper/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pool_id: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { pool_id } = await params;

  const [poolResult, snapshotsResult] = await Promise.all([
    db.from('tracked_pools').select('*').eq('pool_id', pool_id).single(),
    db.from('pool_snapshots').select('*').eq('pool_id', pool_id).order('captured_at', { ascending: false }).limit(48),
  ]);

  if (poolResult.error || !poolResult.data) {
    return NextResponse.json({ statusCode: 404, error: 'NotFound', message: `Pool ${pool_id} not found` }, { status: 404 });
  }

  const enriched = await enrichPool(poolResult.data as TrackedPool);

  return NextResponse.json({
    pool: enriched,
    snapshots: snapshotsResult.data ?? [],
    fetched_at: new Date().toISOString(),
  });
}
