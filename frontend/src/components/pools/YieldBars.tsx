interface YieldBarsProps {
  realYield: number
  emissionYield: number
  maxApr: number
}

export function YieldBars({ realYield, emissionYield, maxApr }: YieldBarsProps) {
  const realWidth = maxApr > 0 ? (realYield / maxApr) * 100 : 0
  const emissionWidth = maxApr > 0 ? (emissionYield / maxApr) * 100 : 0

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-[#6b7280] w-16 text-right">{realYield.toFixed(1)}%</span>
        <div className="flex-1 h-2 bg-[#ddd0b3] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2dbe6c] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(realWidth, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#6b7280] w-16 text-right">{emissionYield.toFixed(1)}%</span>
        <div className="flex-1 h-2 bg-[#ddd0b3] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(emissionWidth, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
