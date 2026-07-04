import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/keeper/db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get active positions
    const { data: positions } = await db
      .from('positions')
      .select('*')
      .eq('is_active', true);

    if (!positions || positions.length === 0) {
      return NextResponse.json({ ok: true, message: 'No active positions', processed: 0 });
    }

    let processed = 0;
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    for (const pos of positions) {
      try {
        // Check if already compounded recently
        const { count } = await db
          .from('compound_log')
          .select('id', { count: 'exact', head: true })
          .eq('pool_id', pos.pool_id)
          .gte('compounded_at', fourHoursAgo.toISOString());

        if ((count ?? 0) > 0) continue;

        // Log pending compound (actual harvest requires keeper keypair — handled by Render worker)
        await db.from('compound_log').insert({
          pool_id: pos.pool_id,
          user_address: pos.user_address,
          position_id: pos.id,
          rewards_harvested: 0,
          tx_hash: 'PENDING_VCRON_' + crypto.randomUUID(),
          gas_cost_xlm: 0,
          compounded_at: new Date().toISOString(),
        });

        processed++;
      } catch (err) {
        console.error(`Compound cron failed for position ${pos.id}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      timestamp: new Date().toISOString(),
      note: 'Pending compounds logged — actual harvest requires keeper keypair (Render worker)',
    });
  } catch (err) {
    console.error('Compound cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
