'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { formatUSD, timeAgo, explorerBase } from '@/lib/utils';
import type { CompoundLog as CompoundLogType } from '@/types';

interface CompoundLogProps {
  logs: CompoundLogType[];
  totalRewards: number;
  isLoading: boolean;
}

export function CompoundLog({ logs, isLoading }: CompoundLogProps) {
  if (isLoading) {
    return (
      <div className="bg-white border-[1.5px] border-[#ddd0b3] rounded-[10px] p-[18px]">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-mono text-[15px] font-bold text-[#0f1b2d]">Recent Compound Activity</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2.5 items-center py-2.5 border-b border-[#e5d9bf] last:border-b-0">
            <Skeleton className="w-2 h-2 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border-[1.5px] border-[#ddd0b3] rounded-[10px] p-[18px]">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-mono text-[15px] font-bold text-[#0f1b2d]">Recent Compound Activity</h2>
        <button className="text-[12px] font-semibold text-[#0f1b2d] opacity-65 no-underline hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer p-0">
          View All
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="font-mono text-[12px] text-[#6b7280] py-8 text-center">
          No compounds yet — first cycle runs within 4 hours of deposit.
        </p>
      ) : (
        <div>
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center gap-2.5 py-2.5 border-b border-[#e5d9bf] last:border-b-0">
              <span className="w-2 h-2 rounded-full bg-[#2dbe6c] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#6b7280] truncate mb-0.5">
                  Compound · {log.pool_id}
                </div>
                <div className="text-[13px] font-semibold text-[#0f1b2d]">
                  + {log.rewards_harvested.toFixed(2)} AQUA ({formatUSD(log.rewards_usd_value)})
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] text-[#9ca3af]">{timeAgo(log.compounded_at)}</span>
                <a
                  href={`${explorerBase()}/tx/${log.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9ca3af] hover:text-[#0f1b2d] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="text-[12px] font-semibold text-[#0f1b2d] opacity-65 no-underline hover:opacity-100 transition-opacity inline-block mt-1.5 bg-transparent border-none cursor-pointer p-0">
        View Full Log →
      </button>
    </div>
  );
}
