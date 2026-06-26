'use client';

import { SectionLabel } from '@/components/ui/SectionLabel';
import { Skeleton }     from '@/components/ui/Skeleton';
import { formatUSD, timeAgo, shortAddress } from '@/lib/utils';
import type { CompoundLog as CompoundLogType } from '@/types';

interface CompoundLogProps {
  logs:          CompoundLogType[];
  totalRewards:  number;
  isLoading:     boolean;
}

export function CompoundLog({ logs, totalRewards, isLoading }: CompoundLogProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <SectionLabel>Auto-Compound Log</SectionLabel>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-center">
            <Skeleton className="w-1 h-8 rounded-full" />
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
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <SectionLabel className="mb-0">Auto-Compound Log</SectionLabel>
        <p className="font-mono text-[10px] text-[#1D9E75]">
          {formatUSD(totalRewards)} total reinvested
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="font-mono text-[11px] text-[#7A6A6A] py-4 text-center">
          No compounds yet — first cycle runs within 4 hours of deposit.
        </p>
      ) : (
        <div className="relative">
          <div className="absolute left-[3px] top-0 bottom-0 w-[0.5px] bg-[#2A2020]" />

          <div className="space-y-4 pl-5">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-[18px] top-1 w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] font-medium text-[#EDEBDD] leading-tight">
                      +{log.lp_tokens_added.toFixed(6)} LP reinvested
                    </p>
                    <p className="font-mono text-[9px] text-[#7A6A6A] mt-0.5">
                      {log.pool_id} · {log.rewards_harvested.toFixed(4)} AQUA harvested
                    </p>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${log.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[9px] text-[#810100] hover:text-[#EDEBDD] transition-colors"
                    >
                      {shortAddress(log.tx_hash)} ↗
                    </a>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-[10px] font-medium text-[#1D9E75]">
                      {formatUSD(log.rewards_usd_value)}
                    </p>
                    <p className="font-mono text-[9px] text-[#7A6A6A]">
                      {timeAgo(log.compounded_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
