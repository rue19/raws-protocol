'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { usePositionsSocket } from '@/hooks/usePositionsSocket';
import { StatCards } from '@/components/dashboard/StatCards';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { NEYDonutChart } from '@/components/dashboard/NEYDonutChart';
import { YieldSplitBar } from '@/components/dashboard/YieldSplitBar';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { CompoundLog } from '@/components/dashboard/CompoundLog';
import { FeaturesStrip } from '@/components/dashboard/FeaturesStrip';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { SmartExitModal } from '@/components/dashboard/SmartExitModal';
import { Skeleton } from '@/components/ui/Skeleton';
import type { PoolWithHealth, CompoundLog as CompoundLogType } from '@/types';

export default function DashboardPage() {
  const {
    walletAddress, positions, setPositions,
    alerts, setAlerts, isLoadingPositions, setLoadingPositions,
  } = useStore();

  const [pools, setPools] = useState<PoolWithHealth[]>([]);
  const [compoundLogs, setCompoundLogs] = useState<CompoundLogType[]>([]);
  const [totalRewards, setTotalRewards] = useState(0);
  const [isLoadingLogs, setLoadingLogs] = useState(false);

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

  // Compute aggregates with useMemo (must be before early return)
  const aggregateNEY = useMemo(() => pools.length > 0
    ? pools.reduce((sum, p) => sum + (p.ney_score ?? 0), 0) / pools.length
    : 0, [pools]);

  const aggregateRealYield = useMemo(() => pools.length > 0
    ? pools.reduce((sum, p) => sum + p.real_yield_apy, 0) / pools.length
    : 0, [pools]);

  const aggregateEmissionYield = useMemo(() => pools.length > 0
    ? pools.reduce((sum, p) => sum + p.emission_yield_apy, 0) / pools.length
    : 0, [pools]);

  const aggregateTotalApy = aggregateRealYield + aggregateEmissionYield;

  const aggregateIL = useMemo(() => {
    const positionsWithValue = positions.filter((p) => p.current_value_usd !== null && p.current_value_usd > 0);
    if (positionsWithValue.length === 0) return 0;
    const totalVal = positionsWithValue.reduce((s, p) => s + (p.current_value_usd ?? 0), 0);
    if (totalVal === 0) return 0;
    return positionsWithValue.reduce((s, p) => s + p.il_percent * ((p.current_value_usd ?? 0) / totalVal), 0);
  }, [positions]);

  const totalValue = useMemo(() => positions.reduce((s, p) => s + (p.current_value_usd ?? 0), 0) || null, [positions]);

  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.is_read), [alerts]);
  const criticalAlerts = useMemo(() => alerts.filter(
    (a) => a.alert_type === 'RED_CRITICAL' && !a.is_read
  ), [alerts]);

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-[#faf3e4] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="font-mono text-2xl font-bold text-[#0f1b2d]">RAW$</p>
          <p className="font-mono text-xs text-[#6b7280]">
            Connect your wallet to view positions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf3e4]">
      <SmartExitModal />

      <div className="px-4 sm:px-7 pt-14 md:pt-0 pb-7">
        <DashboardTopbar />

        {/* Stat Cards */}
        {isLoadingPositions ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[90px] rounded-[10px]" />
            ))}
          </div>
        ) : (
          <StatCards totalValue={totalValue} positions={positions} pools={pools} />
        )}

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] font-bold tracking-[0.15em] text-[#6b7280] uppercase mb-2">
              Action Required
            </div>
            {criticalAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-5">
          {/* Left Column */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Positions Table */}
            {isLoadingPositions ? (
              <Skeleton className="h-[300px] rounded-[10px]" />
            ) : (
              <PositionsTable
                positions={positions}
                pools={pools}
              />
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingPositions ? (
                <>
                  <Skeleton className="h-[220px] rounded-[10px]" />
                  <Skeleton className="h-[220px] rounded-[10px]" />
                </>
              ) : (
                <>
                  <NEYDonutChart
                    feeRevenueApy={aggregateRealYield}
                    ilPercent={aggregateIL}
                    neyScore={aggregateNEY}
                  />
                  <YieldSplitBar
                    realYieldApy={aggregateRealYield}
                    emissionYieldApy={aggregateEmissionYield}
                    totalApy={aggregateTotalApy}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Alerts */}
            <div className="bg-white border-[1.5px] border-[#ddd0b3] rounded-[10px] p-[18px]">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="font-mono text-[15px] font-bold text-[#0f1b2d]">Active Alerts</h2>
                <a href="/alerts" className="text-[12px] font-semibold text-[#0f1b2d] opacity-65 no-underline hover:opacity-100 transition-opacity">
                  View All
                </a>
              </div>

              {isLoadingPositions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[60px] rounded-[8px]" />
                  ))}
                </div>
              ) : unreadAlerts.length === 0 ? (
                <p className="font-mono text-[12px] text-[#6b7280] py-6 text-center">
                  No active alerts
                </p>
              ) : (
                unreadAlerts.slice(0, 3).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))
              )}
            </div>

            {/* Compound Log */}
            <CompoundLog
              logs={compoundLogs}
              totalRewards={totalRewards}
              isLoading={isLoadingLogs}
            />
          </div>
        </div>

        {/* Features Strip */}
        <FeaturesStrip />

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-3.5 border-t border-[#e5d9bf]">
          <nav className="flex gap-5">
            <a href="#" className="text-[12px] font-medium text-[#6b7280] no-underline hover:text-[#0f1b2d] transition-colors">Docs</a>
            <a href="#" className="text-[12px] font-medium text-[#6b7280] no-underline hover:text-[#0f1b2d] transition-colors">About</a>
            <a href="#" className="text-[12px] font-medium text-[#6b7280] no-underline hover:text-[#0f1b2d] transition-colors">Terms</a>
            <a href="#" className="text-[12px] font-medium text-[#6b7280] no-underline hover:text-[#0f1b2d] transition-colors">Privacy</a>
          </nav>
          <div className="flex items-center gap-3.5">
            <span className="flex items-center gap-1 text-[12px] font-semibold text-[#6b7280] border-l border-[#ddd0b3] pl-3.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Built on Stellar
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
