'use client';

import { formatUSD, formatPct, cn } from '@/lib/utils';
import type { PositionWithNEY, PoolWithHealth } from '@/types';

interface PositionsTableProps {
  positions: PositionWithNEY[];
  pools: PoolWithHealth[];
  onExit?: (positionId: string, suggestedPool: string, projectedNey: number) => void;
}

const tokenColors: Record<string, string> = {
  USDC: '#2775CA',
  EURC: '#0066CC',
  XLM: '#1a1a2e',
  AQUA: '#00d4ff',
};

export function PositionsTable({ positions, pools }: PositionsTableProps) {
  const poolMap = Object.fromEntries(pools.map((p) => [p.pool_id, p]));

  return (
    <div className="bg-white border-[1.5px] border-[#ddd0b3] rounded-[10px] p-[18px] pb-3.5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-mono text-[15px] font-bold text-[#0f1b2d]">Your Positions</h2>
        <a href="/pools" className="text-[12px] font-semibold text-[#0f1b2d] opacity-65 no-underline hover:opacity-100 transition-opacity whitespace-nowrap">
          View All Positions →
        </a>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-mono text-[12px] text-[#6b7280]">
            No positions yet. Deposit to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <caption className="sr-only">Current liquidity positions with pool, protocol, value, impermanent loss, NEY, real yield, and health status</caption>
            <thead>
              <tr className="border-b-[1.5px] border-[#e5d9bf]">
                {['POOL', 'PROTOCOL', 'VALUE (USD)', 'IL (24H)', 'NEY', 'REAL YIELD', 'STATUS', 'ACTION'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold tracking-[0.1em] text-[#9ca3af] px-2 pb-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pool = poolMap[pos.pool_id];
                const tokenA = pool?.token_a_code ?? '??';
                const tokenB = pool?.token_b_code ?? '??';
                const protocol = pos.pool_protocol;
                const colorA = tokenColors[tokenA] ?? '#1a1a2e';
                const colorB = tokenColors[tokenB] ?? '#2775CA';

                const healthBadge: Record<string, string> = {
                  GREEN: 'badge-healthy',
                  YELLOW: 'badge-watch',
                  RED: 'badge-critical',
                  RED_CRITICAL: 'badge-critical',
                  UNKNOWN: 'badge-healthy',
                };
                const badge = healthBadge[pos.health_status] ?? 'badge-healthy';

                const healthLabel = pos.health_status.replace('_', ' ');

                return (
                  <tr key={pos.id} className="border-b border-[#e5d9bf] last:border-b-0">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full border-[1.5px] border-white" style={{ background: colorA }} />
                          <div className="w-5 h-5 rounded-full border-[1.5px] border-white -ml-1.5" style={{ background: colorB }} />
                        </div>
                        <span className="font-semibold whitespace-nowrap">{tokenA} / {tokenB}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1 text-[#6b7280] text-[12px]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                        {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium">
                      {pos.current_value_usd !== null ? formatUSD(pos.current_value_usd) : '—'}
                    </td>
                    <td className={cn('py-3 px-2', pos.il_percent > 0 ? 'text-[#e53935]' : '')}>
                      {pos.il_percent > 0 ? '-' : ''}{Math.abs(pos.il_percent).toFixed(2)}%
                    </td>
                    <td className="py-3 px-2 font-medium">
                      {pos.ney_score !== null ? formatPct(pos.ney_score * 100) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      {pool ? formatPct(pool.real_yield_apy) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn(
                        'text-[10px] font-bold tracking-[0.08em] px-2 py-[3px] rounded-[3px] whitespace-nowrap',
                        badge === 'badge-healthy' && 'bg-[rgba(45,190,108,0.1)] text-[#1e9e55] border border-[rgba(45,190,108,0.3)]',
                        badge === 'badge-watch' && 'bg-[rgba(245,158,11,0.1)] text-[#d97706] border border-[rgba(245,158,11,0.3)]',
                        badge === 'badge-critical' && 'bg-[rgba(229,57,53,0.1)] text-[#e53935] border border-[rgba(229,57,53,0.25)]',
                      )}>
                        {healthLabel}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <button className="bg-transparent border-none text-[#6b7280] text-[15px] cursor-pointer px-2 py-1 rounded-[5px] hover:bg-[rgba(15,27,45,0.06)] transition-colors">
                        •••
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pt-2.5 mt-0.5">
            <button className="inline-flex items-center gap-1.5 bg-transparent border-none text-[12px] text-[#6b7280] cursor-pointer font-[family-name:var(--font-sans)] hover:text-[#0f1b2d] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
