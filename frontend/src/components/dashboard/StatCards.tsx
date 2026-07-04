'use client';

interface StatCardData {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  green?: boolean;
  icon: string;
}

interface StatCardsProps {
  totalValue: number | null;
  positions: { ney_score: number | null; current_value_usd: number | null }[];
  pools: { real_yield_apy: number; emission_yield_apy: number; total_apy: number; ney_score: number | null }[];
}

const iconPaths: Record<string, string> = {
  wallet: 'M1 5h22v14H1z M1 10h22',
  chart: 'M22 7l-8.5 8.5-5-5L2 17',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4l3 3',
  ellipses: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M2 12c0-2.21 4.48-4 10-4s10 1.79 10 4-4.48 4-10 4S2 14.21 2 12z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01',
};

export function StatCards({ totalValue, positions, pools }: StatCardsProps) {
  const avgNEY = pools.length > 0
    ? pools.reduce((s, p) => s + (p.ney_score ?? 0), 0) / pools.length * 100
    : 0;

  const avgRealYield = pools.length > 0
    ? pools.reduce((s, p) => s + p.real_yield_apy, 0) / pools.length
    : 0;

  const avgEmissionYield = pools.length > 0
    ? pools.reduce((s, p) => s + p.emission_yield_apy, 0) / pools.length
    : 0;

  const totalApr = avgRealYield + avgEmissionYield;

  const cards: StatCardData[] = [
    { label: 'TOTAL PORTFOLIO VALUE', value: totalValue !== null ? `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00', change: `${positions.length} position${positions.length !== 1 ? 's' : ''}`, positive: true, icon: 'wallet' },
    { label: 'NET EFFECTIVE YIELD (NEY)', value: `${avgNEY.toFixed(2)}%`, change: avgNEY >= 0 ? 'Healthy' : 'Attention needed', positive: avgNEY >= 0, green: avgNEY >= 0, icon: 'chart' },
    { label: 'REAL YIELD AVG.', value: `${avgRealYield.toFixed(2)}%`, change: 'From swap fees', positive: true, icon: 'clock' },
    { label: 'EMISSION YIELD AVG.', value: `${avgEmissionYield.toFixed(2)}%`, change: avgEmissionYield > avgRealYield ? 'Emission-heavy' : 'Balanced', positive: avgEmissionYield <= avgRealYield, icon: 'ellipses' },
    { label: 'TOTAL APR (WEIGHTED)', value: `${totalApr.toFixed(2)}%`, change: `${pools.length} pool${pools.length !== 1 ? 's' : ''}`, positive: true, icon: 'info' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#0f1e35] border border-white/[0.07] rounded-[10px] p-3.5 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold tracking-[0.1em] text-[rgba(245,230,200,0.45)] leading-tight max-w-[120px]">
              {card.label}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5">
              <path d={iconPaths[card.icon]} />
            </svg>
          </div>
          <div className={`font-mono text-[22px] font-bold leading-none ${card.green ? 'text-[#2dbe6c]' : 'text-[#F5E6C8]'}`}>
            {card.value}
          </div>
          <div className={`text-[11px] font-semibold mt-0.5 ${card.positive ? 'text-[#2dbe6c]' : 'text-[#e53935]'}`}>
            {card.change}
          </div>
        </div>
      ))}
    </div>
  );
}
