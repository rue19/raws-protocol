'use client';

interface NEYDonutChartProps {
  feeRevenueApy: number;
  ilPercent: number;
  neyScore: number | null;
}

export function NEYDonutChart({ feeRevenueApy, ilPercent, neyScore }: NEYDonutChartProps) {
  const absIL = Math.abs(ilPercent);
  const ney = neyScore !== null ? neyScore * 100 : 0;
  const circumference = 2 * Math.PI * 44; // r=44

  // Calculate dash arrays proportional to total
  const total = Math.max(feeRevenueApy + absIL, 0.1);
  const feeDash = (feeRevenueApy / total) * circumference;
  const ilDash = (absIL / total) * circumference;

  return (
    <div className="bg-white border-[1.5px] border-[#ddd0b3] rounded-[10px] p-[18px] pb-3.5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-mono text-[15px] font-bold text-[#0f1b2d] flex items-center gap-1.5">
          Net Effective Yield Breakdown
          <span className="text-[12px] text-[#9ca3af] cursor-help">ⓘ</span>
        </h2>
      </div>

      <div className="flex items-center gap-5 mb-3">
        {/* Donut SVG */}
        <div className="flex-shrink-0">
          <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`NEY breakdown: ${(neyScore ?? 0) * 100}% net effective yield, ${feeRevenueApy}% fee revenue, -${Math.abs(ilPercent)}% impermanent loss`}>
            {/* Background circle */}
            <circle cx="60" cy="60" r="44" fill="none" stroke="#e8e0cd" strokeWidth="16" />
            {/* Fee Revenue (green) */}
            <circle
              cx="60" cy="60" r="44" fill="none"
              stroke="#2dbe6c" strokeWidth="16"
              strokeDasharray={`${feeDash} ${circumference}`}
              strokeDashoffset="69"
              strokeLinecap="butt"
            />
            {/* IL (red) */}
            <circle
              cx="60" cy="60" r="44" fill="none"
              stroke="#e53935" strokeWidth="16"
              strokeDasharray={`${ilDash} ${circumference}`}
              strokeDashoffset={69 + feeDash}
              strokeLinecap="butt"
            />
            {/* Center text */}
            <text x="60" y="54" textAnchor="middle" fontFamily="'Space Mono', monospace" fontSize="14" fontWeight="700" fill="#0f1b2d">
              {ney.toFixed(2)}%
            </text>
            <text x="60" y="68" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="8" fill="#6b7280">
              NEY
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#2dbe6c] flex-shrink-0" />
            <span>Fee Revenue (Real Yield)</span>
            <span className="ml-auto font-semibold text-[#0f1b2d]">{feeRevenueApy.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#e53935] flex-shrink-0" />
            <span>Impermanent Loss</span>
            <span className="ml-auto font-semibold text-[#e53935]">-{absIL.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] pt-2 border-t border-[#e5d9bf] font-bold">
            <span className="w-[9px] h-[9px] rounded-full bg-[#0f1b2d] flex-shrink-0" />
            <span className="text-[#0f1b2d]">Net Effective Yield</span>
            <span className="ml-auto text-[#0f1b2d]">{ney.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <a href="#" className="text-[12px] font-semibold text-[#0f1b2d] opacity-65 no-underline hover:opacity-100 transition-opacity inline-block mt-1.5">
        View Full Breakdown →
      </a>
    </div>
  );
}
