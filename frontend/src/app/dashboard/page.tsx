'use client';

import { useEffect, useState, useCallback }  from 'react';
import { useStore }                           from '@/lib/store';
import { api }                               from '@/lib/api';
import { usePositionsSocket }                from '@/hooks/usePositionsSocket';
import { PositionCard }                      from '@/components/dashboard/PositionCard';
import { CompoundLog }                       from '@/components/dashboard/CompoundLog';
import { AlertCard }                         from '@/components/dashboard/AlertCard';
import { SmartExitModal }                    from '@/components/dashboard/SmartExitModal';
import { SectionLabel }                      from '@/components/ui/SectionLabel';
import { Skeleton }                          from '@/components/ui/Skeleton';
import { formatUSD }                         from '@/lib/utils';
import type { PoolWithHealth, CompoundLog as CompoundLogType } from '@/types';
import { Toaster } from 'react-hot-toast';

export default function DashboardPage() {
  const {
    walletAddress, positions, setPositions,
    alerts, setAlerts, isLoadingPositions, setLoadingPositions,
  } = useStore();

  const [pools,          setPools]         = useState<PoolWithHealth[]>([]);
  const [compoundLogs,   setCompoundLogs]  = useState<CompoundLogType[]>([]);
  const [totalRewards,   setTotalRewards]  = useState(0);
  const [totalValue,     setTotalValue]    = useState<number | null>(null);
  const [isLoadingLogs,  setLoadingLogs]   = useState(false);

  usePositionsSocket(walletAddress);

  const loadData = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingPositions(true);
    setLoadingLogs(true);

    try {
      const [posData, poolData, logData, alertData] = await Promise.all([
        api.getPositions(walletAddress),
        api.getPools(),
        api.getCompoundLog(walletAddress, 20),
        api.getAlerts(walletAddress),
      ]);

      setPositions(posData.positions);
      setTotalValue(posData.total_value_usd);
      setPools(poolData.pools);
      setCompoundLogs(logData.logs);
      setTotalRewards(logData.total_rewards_usd);
      setAlerts(alertData.alerts);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoadingPositions(false);
      setLoadingLogs(false);
    }
  }, [walletAddress, setPositions, setAlerts, setLoadingPositions]);

  useEffect(() => { loadData(); }, [loadData]);

  const poolMap = Object.fromEntries(pools.map((p) => [p.pool_id, p]));

  const criticalAlerts = alerts.filter(
    (a) => a.alert_type === 'RED_CRITICAL' && !a.is_read
  );

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-[#0D0B0B] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="font-display text-2xl font-bold text-[#810100]">RAW$</p>
          <p className="font-mono text-xs text-[#7A6A6A]">
            Connect your wallet to view positions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0B0B]">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:  '#1B1717',
            color:       '#EDEBDD',
            border:      '0.5px solid #2A2020',
            borderRadius: '2px',
            fontFamily:  'IBM Plex Mono, monospace',
            fontSize:    '12px',
          },
        }}
      />

      <SmartExitModal />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Portfolio Header */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#7A6A6A] mb-1">
            My Portfolio
          </p>
          {isLoadingPositions ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <p className="font-display text-3xl font-bold text-[#EDEBDD]">
              {formatUSD(totalValue)}
            </p>
          )}
          <p className="font-mono text-[10px] text-[#7A6A6A] mt-0.5">
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
            {' · '}
            <span className="text-[#1D9E75]">Live</span>
          </p>
        </div>

        <hr className="cherry-rule" />

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Action Required</SectionLabel>
            {criticalAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* My Positions */}
        <div className="space-y-3">
          <SectionLabel>Positions</SectionLabel>

          {isLoadingPositions ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-[#1B1717] border border-[#2A2020] rounded-sm p-4 space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : positions.length === 0 ? (
            <div className="bg-[#1B1717] border border-[#2A2020] rounded-sm p-8 text-center">
              <p className="font-mono text-xs text-[#7A6A6A]">
                No positions yet. Deposit to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  pool={poolMap[position.pool_id] ?? null}
                  onExit={(posId, pool, ney) =>
                    useStore.getState().openSmartExit({
                      positionId:    posId,
                      suggestedPool: pool,
                      projectedNey:  ney,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>

        <hr className="cherry-rule" />

        {/* Auto-Compound Log */}
        <CompoundLog
          logs={compoundLogs}
          totalRewards={totalRewards}
          isLoading={isLoadingLogs}
        />

      </div>
    </div>
  );
}
