'use client';

interface YieldSplitBarProps {
  realYieldApy: number;
  emissionYieldApy: number;
  totalApy: number;
}

export function YieldSplitBar({ realYieldApy, emissionYieldApy, totalApy }: YieldSplitBarProps) {
  const realPct = totalApy > 0 ? (realYieldApy / totalApy) * 100 : 0;
  const emissionPct = totalApy > 0 ? (emissionYieldApy / totalApy) * 100 : 0;

  return (
    <div className="bg-white border-[1.5px] border-[#ddd0b3] rounded-[10px] p-[18px] pb-3.5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-mono text-[15px] font-bold text-[#0f1b2d] flex items-center gap-1.5">
          Yield Split (All Positions)
          <span className="text-[12px] text-[#9ca3af] cursor-help">ⓘ</span>
        </h2>
      </div>

      {/* Split bar */}
      <div className="mb-3.5">
        <div className="flex h-[36px] rounded-[6px] overflow-hidden w-full">
          <div
            className="flex items-center justify-center font-mono text-[13px] font-bold text-white bg-[#2dbe6c]"
            style={{ width: `${realPct}%` }}
          >
            {Math.round(realPct)}%
          </div>
          <div
            className="flex items-center justify-center font-mono text-[13px] font-bold text-[#5a4800] bg-[#f5c842]"
            style={{ width: `${emissionPct}%` }}
          >
            {Math.round(emissionPct)}%
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-[7px]">
        <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
          <span className="w-[9px] h-[9px] rounded-full bg-[#2dbe6c] flex-shrink-0" />
          <span>Real Yield (Fees)</span>
          <span className="ml-auto font-semibold text-[#0f1b2d]">{realYieldApy.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
          <span className="w-[9px] h-[9px] rounded-full bg-[#f5c842] flex-shrink-0" />
          <span>Emission Yield (Incentives)</span>
          <span className="ml-auto font-semibold text-[#0f1b2d]">{emissionYieldApy.toFixed(2)}%</span>
        </div>
      </div>

      {/* Warning: emission yield exceeds real yield */}
      {emissionYieldApy > realYieldApy && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-[#fff8e1] border border-[#f5c842]/30 text-[12px] text-[#92700c] leading-snug">
          Emission yield exceeds real yield — these incentives may not last. Consider reallocating to pools with stronger fee revenue.
        </div>
      )}

      <a href="/pools" className="text-[12px] font-semibold text-[#0f1b2d] opacity-65 no-underline hover:opacity-100 transition-opacity inline-block mt-1.5">
        See All Pools →
      </a>
    </div>
  );
}
