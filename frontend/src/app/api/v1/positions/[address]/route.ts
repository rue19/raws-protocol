import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/keeper/db';
import { calcIL } from '@/lib/math';
import { getRecentSnapshots } from '@/lib/keeper/poolService';
import { ratelimit } from '@/lib/ratelimit';
import type { Position, PositionWithNEY } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { address } = await params;

  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json({ statusCode: 400, error: 'InvalidAddress', message: 'Must be a valid Stellar G... public key' }, { status: 400 });
  }

  const { data: positions, error: posErr } = await db
    .from('positions')
    .select('*')
    .eq('user_address', address)
    .eq('is_active', true)
    .order('entry_timestamp', { ascending: false });

  if (posErr) {
    return NextResponse.json({ statusCode: 500, error: 'DatabaseError', message: posErr.message }, { status: 500 });
  }

  if (!positions || positions.length === 0) {
    return NextResponse.json({ address, positions: [], total_value_usd: null, fetched_at: new Date().toISOString() });
  }

  const enriched = await Promise.all(
    (positions as Position[]).map(async (pos): Promise<PositionWithNEY> => {
      const [snapshots, compoundData] = await Promise.all([
        getRecentSnapshots(pos.pool_id, 1),
        db.from('compound_log').select('id, compounded_at').eq('position_id', pos.id).order('compounded_at', { ascending: false }).limit(1),
      ]);

      const snap = snapshots[0] ?? null;
      const currentRatio = snap ? snap.price_ratio : pos.entry_price_ratio;
      const ilDecimal = calcIL(pos.entry_price_ratio, currentRatio);

      const { count: compoundCount } = await db
        .from('compound_log')
        .select('id', { count: 'exact', head: true })
        .eq('position_id', pos.id);

      return {
        ...pos,
        current_value_usd: snap?.total_tvl_usd ?? null,
        il_percent: ilDecimal * 100,
        fee_earned_usd: null,
        ney_score: snap?.ney_score ?? null,
        health_status: snap?.health_status ?? 'UNKNOWN',
        compound_count: compoundCount ?? 0,
        last_compounded_at: compoundData.data?.[0]?.compounded_at ?? null,
      };
    })
  );

  const totalValueUsd = enriched
    .map((p) => p.current_value_usd)
    .filter((v): v is number => v !== null)
    .reduce((sum, v) => sum + v, 0);

  return NextResponse.json({
    address,
    positions: enriched,
    total_value_usd: enriched.some((p) => p.current_value_usd !== null) ? totalValueUsd : null,
    fetched_at: new Date().toISOString(),
  });
}
