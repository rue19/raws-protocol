'use client';

import { cn } from '@/lib/utils';

interface YieldSplitProps {
  realYieldApy:     number;
  emissionYieldApy: number;
  totalApy:         number;
}

export function YieldSplit({ realYieldApy, emissionYieldApy, totalApy }: YieldSplitProps) {
  const realPct     = totalApy > 0 ? (realYieldApy     / totalApy) * 100 : 0;
  const emissionPct = totalApy > 0 ? (emissionYieldApy / totalApy) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-baseline">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7A6A6A]">
          Yield Source
        </p>
        <p className="font-mono text-xs font-bold text-[#EDEBDD]">
          {totalApy.toFixed(2)}% total
        </p>
      </div>

      {/* Segmented bar */}
      <div className="h-2 bg-[#2A2020] rounded-[1px] flex overflow-hidden">
        <div
          className="h-full bg-[#1D9E75] transition-all duration-500"
          style={{ width: `${realPct}%` }}
        />
        <div
          className="h-full bg-[#BA7517] transition-all duration-500"
          style={{ width: `${emissionPct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[1px] bg-[#1D9E75] flex-shrink-0" />
          <div>
            <p className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide">
              Real Yield
            </p>
            <p className="font-mono text-[10px] font-medium text-[#1D9E75]">
              +{realYieldApy.toFixed(2)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[1px] bg-[#BA7517] flex-shrink-0" />
          <div>
            <p className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide">
              Incentive Emission
            </p>
            <p className="font-mono text-[10px] font-medium text-[#BA7517]">
              +{emissionYieldApy.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {emissionYieldApy > realYieldApy && (
        <p className="font-mono text-[9px] text-[#BA7517] leading-tight">
          Over half this APY is from incentives — not guaranteed to continue.
        </p>
      )}
    </div>
  );
}
