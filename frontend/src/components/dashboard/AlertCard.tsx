'use client';

import type { Alert } from '@/types';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';

interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const { openSmartExit } = useStore();

  const isCritical = alert.alert_type === 'RED_CRITICAL';

  function handleSmartExit() {
    if (!alert.suggested_pool_id || alert.suggested_ney === null) return;
    openSmartExit({
      positionId: alert.position_id,
      suggestedPool: alert.suggested_pool_id,
      projectedNey: alert.suggested_ney,
    });
  }

  const alertTitle = isCritical
    ? 'Pool Alert — 90 Min Loss Sustained'
    : alert.alert_type === 'YELLOW_WARNING'
      ? 'High IL Acceleration Detected'
      : 'Compound Completed';

  return (
    <div
      role="alert"
      className={`rounded-lg p-3 mb-2.5 last:mb-0 ${
        isCritical
          ? 'bg-[#0f1b2d] border border-white/[0.08]'
          : 'bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)]'
      }`}
    >
      {/* Severity tag */}
      <div className={`flex items-center justify-between text-[10px] font-bold tracking-[0.1em] mb-1.5 ${
        isCritical ? 'text-[#e53935]' : 'text-[#d97706]'
      }`}>
        <span>
          ● {isCritical ? 'CRITICAL' : 'WATCH'}
        </span>
        <span className={`font-normal tracking-normal ${
          isCritical ? 'text-[rgba(245,230,200,0.4)]' : 'text-[#9ca3af]'
        }`}>
          {timeAgo(alert.created_at)}
        </span>
      </div>

      {/* Title */}
      <div className={`text-[14px] font-bold leading-tight mb-1 ${
        isCritical ? 'text-[#F5E6C8]' : 'text-[#0f1b2d]'
      }`}>
        {alertTitle}
      </div>

      {/* Description */}
      <p className={`text-[12px] leading-relaxed mb-2 ${
        isCritical ? 'text-[rgba(245,230,200,0.5)]' : 'text-[#6b7280]'
      }`}>
        {alert.message || (isCritical
          ? 'Pool has been in impermanent loss exceeding fee revenue for 90 minutes.'
          : 'Pool is showing rising IL velocity. Monitor closely.')}
      </p>

      {/* Suggestion */}
      {alert.suggested_pool_id && alert.suggested_ney !== null && (
        <div className="flex items-center gap-1.5 text-[12px] mb-2.5">
          <span className={isCritical ? 'text-[rgba(245,230,200,0.4)]' : 'text-[#6b7280]'}>
            Suggested Move →
          </span>
          <span className={`font-semibold ${isCritical ? 'text-[#F5E6C8]' : 'text-[#0f1b2d]'}`}>
            {alert.suggested_pool_id}
          </span>
        </div>
      )}

      {/* Action button */}
      {isCritical && (
        <button
          onClick={handleSmartExit}
          disabled={!alert.suggested_pool_id}
          aria-disabled={!alert.suggested_pool_id}
          className="w-full py-2.5 bg-[#162035] border-[1.5px] border-[rgba(245,230,200,0.2)] text-[#F5E6C8] rounded-[7px] font-mono text-[12px] font-bold tracking-[0.04em] cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          One-Click Smart Exit →
        </button>
      )}

      {!isCritical && alert.suggested_pool_id && (
        <div className="flex items-center gap-1.5 text-[12px]">
          <button className="font-semibold text-[#0f1b2d] no-underline ml-auto bg-transparent border-none cursor-pointer p-0 text-[12px]">
            View Details →
          </button>
        </div>
      )}
    </div>
  );
}
