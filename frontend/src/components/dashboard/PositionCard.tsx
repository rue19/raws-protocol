'use client';

import { Card }         from '@/components/ui/Card';
import { HealthDot }    from '@/components/ui/HealthDot';
import { NEYBreakdown } from './NEYBreakdown';
import { YieldSplit }   from './YieldSplit';
import { formatUSD, formatPct, timeAgo, healthColor, cn } from '@/lib/utils';
import type { PositionWithNEY, PoolWithHealth } from '@/types';
import { useState } from 'react';

interface PositionCardProps {
  position: PositionWithNEY;
  pool:     PoolWithHealth | null;
  onExit?:  (positionId: string, suggestedPool: string, projectedNey: number) => void;
}

export function PositionCard({ position, pool, onExit }: PositionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const accentMap: Record<string, 'cherry' | 'green' | 'amber' | 'red'> = {
    GREEN:        'green',
    YELLOW:       'amber',
    RED:          'red',
    RED_CRITICAL: 'red',
  };
  const accent = accentMap[position.health_status] ?? 'cherry';

  const protocolLabel: Record<string, string> = {
    aquarius: 'Aquarius',
    soroswap: 'Soroswap',
    phoenix:  'Phoenix',
    raws_amm: 'RAW$ AMM',
  };

  return (
    <Card accent={accent} className="space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <HealthDot status={position.health_status} />
          <div>
            <p className="font-mono text-xs font-medium text-[#EDEBDD] leading-tight">
              {pool ? `${pool.token_a_code}/${pool.token_b_code}` : position.pool_id}
            </p>
            <p className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide">
              {protocolLabel[position.pool_protocol] ?? position.pool_protocol}
              {position.vault_mode === 'SafeMode' && (
                <span className="ml-1 text-[#1D9E75]">· Safe Mode</span>
              )}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-base font-bold text-[#EDEBDD] leading-tight">
            {formatUSD(position.current_value_usd)}
          </p>
          <p className={cn(
            'font-mono text-[10px] font-medium',
            position.il_percent > 0 ? 'text-[#C0392B]' : 'text-[#7A6A6A]'
          )}>
            IL: {position.il_percent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* NEY Score Summary Row */}
      <div className="flex items-center justify-between bg-[#0D0B0B] rounded-[2px] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#7A6A6A]">NEY</span>
          <span className={cn(
            'font-mono text-sm font-bold',
            position.ney_score !== null && position.ney_score >= 0
              ? 'text-[#1D9E75]' : 'text-[#C0392B]'
          )}>
            {position.ney_score !== null ? formatPct(position.ney_score * 100) : '—'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="font-mono text-[9px] text-[#7A6A6A]">Compounds</p>
            <p className="font-mono text-[10px] font-medium text-[#EDEBDD]">
              {position.compound_count}×
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] text-[#7A6A6A]">Last compound</p>
            <p className="font-mono text-[10px] font-medium text-[#EDEBDD]">
              {position.last_compounded_at ? timeAgo(position.last_compounded_at) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Detail Section */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <hr className="flex-1 border-[#2A2020]" />
          <span className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide select-none">
            {expanded ? 'Less ▲' : 'Details ▼'}
          </span>
          <hr className="flex-1 border-[#2A2020]" />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 pt-1">
          <NEYBreakdown
            feeRevenueApy={pool?.real_yield_apy ?? 0}
            ilPercent={position.il_percent}
            neyScore={position.ney_score}
          />

          <hr className="border-[#2A2020]" />

          {pool && (
            <YieldSplit
              realYieldApy={pool.real_yield_apy}
              emissionYieldApy={pool.emission_yield_apy}
              totalApy={pool.total_apy}
            />
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              ['Entered',      timeAgo(position.entry_timestamp)],
              ['LP Tokens',    position.lp_token_amount.toFixed(6)],
              ['Shares',       position.df_token_shares.toFixed(6)],
              ['Health',       position.health_status],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0D0B0B] rounded-[2px] p-2">
                <p className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide mb-0.5">
                  {label}
                </p>
                <p className={cn(
                  'font-mono text-[10px] font-medium truncate',
                  label === 'Health' ? healthColor(value) : 'text-[#EDEBDD]'
                )}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
