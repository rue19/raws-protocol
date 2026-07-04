import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/keeper/db';
import { getPoolReserves, getFeeRevenueSince } from '@/lib/keeper/horizon';
import { calcIL, calcNEY, annualise } from '@/lib/keeper/poolService';
import { insertAlert } from '@/lib/keeper/db';

const RED_STREAK_TO_ALERT = parseInt(process.env.RED_ALERT_THRESHOLD ?? '3');
const YELLOW_THRESHOLD = -0.10;

function roundTo30MinBoundary(date: Date): Date {
  const ms = date.getTime();
  return new Date(Math.floor(ms / (30 * 60 * 1000)) * (30 * 60 * 1000));
}

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get active pool IDs
    const { data: pools } = await db.from('tracked_pools').select('pool_id').eq('is_active', true);
    const poolIds = (pools ?? []).map((p: { pool_id: string }) => p.pool_id);

    let processed = 0;
    let alertsTriggered = 0;

    for (const poolId of poolIds) {
      try {
        // Snapshot pool
        const { reserveA, reserveB } = await getPoolReserves(poolId);
        const feeRevenue = await getFeeRevenueSince(poolId, new Date(Date.now() - 30 * 60 * 1000));

        const reserveAVal = Number(reserveA);
        const reserveBVal = Number(reserveB);
        const currentPriceRatio = reserveAVal !== 0 ? reserveBVal / reserveAVal : 0;

        // Get positions for this pool
        const { data: positions } = await db
          .from('positions')
          .select('*')
          .eq('pool_id', poolId)
          .eq('is_active', true);

        if (!positions || positions.length === 0) continue;

        const entryPriceRatio = positions[0].entry_price_ratio;
        const il = calcIL(entryPriceRatio, currentPriceRatio);
        const ney = calcNEY(Number(feeRevenue) / 1e7, il); // normalize to units

        // Determine health status
        let healthStatus: string = 'GREEN';
        if (ney < YELLOW_THRESHOLD) healthStatus = 'RED';
        else if (ney < 0) healthStatus = 'YELLOW';

        // Check consecutive red streak
        const { data: recentSnaps } = await db
          .from('pool_snapshots')
          .select('health_status')
          .eq('pool_id', poolId)
          .order('captured_at', { ascending: false })
          .limit(RED_STREAK_TO_ALERT);

        let redStreak = 0;
        for (const snap of recentSnaps ?? []) {
          if (snap.health_status === 'RED' || snap.health_status === 'RED_CRITICAL') redStreak++;
          else break;
        }

        if (healthStatus === 'RED' && redStreak >= RED_STREAK_TO_ALERT - 1) {
          healthStatus = 'RED_CRITICAL';
        }

        // Upsert snapshot
        await db.from('pool_snapshots').upsert({
          pool_id: poolId,
          reserve_a: Number(reserveA),
          reserve_b: Number(reserveB),
          price_ratio: currentPriceRatio,
          fee_revenue_period: Number(feeRevenue) / 1e7,
          health_status: healthStatus,
          ney_score: ney,
          captured_at: roundTo30MinBoundary(new Date()).toISOString(),
        }, { onConflict: 'pool_id,captured_at' });

        // Trigger alerts for RED_CRITICAL
        if (healthStatus === 'RED_CRITICAL') {
          for (const pos of positions) {
            await insertAlert({
              user_address: pos.user_address,
              position_id: pos.id,
              pool_id: poolId,
              alert_type: 'RED_CRITICAL',
              message: `Pool ${poolId.slice(0, 8)}... has been RED for ${redStreak + 1} consecutive periods. NEY: ${(ney * 100).toFixed(2)}%`,
              suggested_pool_id: null,
              suggested_ney: null,
            });
            alertsTriggered++;
          }
        }

        processed++;
      } catch (err) {
        console.error(`Watchdog failed for pool ${poolId}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      alerts_triggered: alertsTriggered,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Watchdog cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
