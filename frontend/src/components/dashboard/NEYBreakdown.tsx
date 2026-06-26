'use client';

import { cn, formatPct } from '@/lib/utils';

interface NEYBreakdownProps {
  feeRevenueApy: number;
  ilPercent:     number;
  neyScore:      number | null;
  compact?:      boolean;
}

export function NEYBreakdown({ feeRevenueApy, ilPercent, neyScore, compact = false }: NEYBreakdownProps) {
  const absIL  = Math.abs(ilPercent);
  const maxVal = Math.max(feeRevenueApy, absIL, 0.1);

  const feeWidth = Math.min((feeRevenueApy / maxVal) * 100, 100);
  const ilWidth  = Math.min((absIL         / maxVal) * 100, 100);

  const neyPositive = neyScore !== null && neyScore >= 0;

  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5')}>
      {/* Fee Revenue Bar */}
      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className={cn(
            'font-mono uppercase tracking-wide text-[#7A6A6A]',
            compact ? 'text-[9px]' : 'text-[10px]'
          )}>
            Fee Revenue
          </span>
          <span className={cn(
            'font-mono text-[#1D9E75] font-medium',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}>
            +{feeRevenueApy.toFixed(2)}%
          </span>
        </div>
        <div className="h-1.5 bg-[#2A2020] rounded-[1px] overflow-hidden">
          <div
            className="h-full bg-[#1D9E75] rounded-[1px] transition-all duration-500"
            style={{ width: `${feeWidth}%` }}
          />
        </div>
      </div>

      {/* IL Bar */}
      <div>
        <div className="flex justify-between items-center mb-0.5">
          <span className={cn(
            'font-mono uppercase tracking-wide text-[#7A6A6A]',
            compact ? 'text-[9px]' : 'text-[10px]'
          )}>
            Impermanent Loss
          </span>
          <span className={cn(
            'font-mono text-[#C0392B] font-medium',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}>
            -{absIL.toFixed(2)}%
          </span>
        </div>
        <div className="h-1.5 bg-[#2A2020] rounded-[1px] overflow-hidden">
          <div
            className="h-full bg-[#C0392B] rounded-[1px] transition-all duration-500"
            style={{ width: `${ilWidth}%` }}
          />
        </div>
      </div>

      {/* NEY divider + result */}
      <div className={cn(
        'flex justify-between items-center pt-1.5',
        'border-t border-[#2A2020]'
      )}>
        <span className={cn(
          'font-mono uppercase tracking-wide',
          compact ? 'text-[9px]' : 'text-[10px]',
          'text-[#EDEBDD] font-medium'
        )}>
          Net Effective Yield
        </span>
        <span className={cn(
          'font-mono font-bold',
          compact ? 'text-[11px]' : 'text-sm',
          neyPositive ? 'text-[#1D9E75]' : 'text-[#C0392B]'
        )}>
          {neyScore !== null ? formatPct(neyScore * 100) : '—'}
        </span>
      </div>
    </div>
  );
}
