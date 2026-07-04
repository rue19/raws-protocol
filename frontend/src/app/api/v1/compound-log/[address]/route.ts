import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/keeper/auth';
import { db } from '@/lib/keeper/db';
import { ratelimit } from '@/lib/ratelimit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const authError = verifyAuth(request);
  if (authError) return authError;

  const { address } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const poolId = searchParams.get('pool_id');

  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json({ statusCode: 400, error: 'InvalidAddress', message: 'Must be a valid Stellar G... public key' }, { status: 400 });
  }

  let query = db
    .from('compound_log')
    .select('*', { count: 'exact' })
    .eq('user_address', address)
    .order('compounded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (poolId) query = query.eq('pool_id', poolId);

  const { data: logs, error, count } = await query;
  if (error) {
    return NextResponse.json({ statusCode: 500, error: 'DatabaseError', message: error.message }, { status: 500 });
  }

  const { data: totals } = await db
    .from('compound_log')
    .select('rewards_usd_value')
    .eq('user_address', address);

  const totalRewardsUsd = (totals ?? [])
    .map((r: { rewards_usd_value: number | null }) => r.rewards_usd_value ?? 0)
    .reduce((sum: number, v: number) => sum + v, 0);

  return NextResponse.json({
    address,
    logs: logs ?? [],
    total_rewards_usd: totalRewardsUsd,
    total_compound_count: count ?? 0,
    pagination: { limit, offset, has_more: offset + limit < (count ?? 0) },
  });
}
