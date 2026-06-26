'use client';

import type { Alert }    from '@/types';
import { formatPct }     from '@/lib/utils';
import { useStore }      from '@/lib/store';
import { api }           from '@/lib/api';
import toast             from 'react-hot-toast';
import { useState }      from 'react';

interface AlertCardProps {
  alert: Alert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const { dismissAlert, openSmartExit } = useStore();
  const [dismissing, setDismissing]     = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await api.markAlertRead(alert.id);
      dismissAlert(alert.id);
    } catch {
      toast.error('Could not dismiss alert');
      setDismissing(false);
    }
  }

  function handleSmartExit() {
    if (!alert.suggested_pool_id || alert.suggested_ney === null) return;
    openSmartExit({
      positionId:   alert.position_id,
      suggestedPool: alert.suggested_pool_id,
      projectedNey: alert.suggested_ney,
    });
  }

  return (
    <div className="alert-gradient rounded-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C0392B] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C0392B]" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#C0392B] font-medium">
            Pool Alert — 90 Min Loss Sustained
          </p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="font-mono text-[9px] text-[#7A6A6A] hover:text-[#EDEBDD] transition-colors flex-shrink-0"
          aria-label="Dismiss alert"
        >
          dismiss
        </button>
      </div>

      <p className="font-mono text-xs text-[#EDEBDD] leading-relaxed">
        {alert.message || `Pool ${alert.pool_id} has been losing money for 3+ consecutive periods.`}
      </p>

      {alert.suggested_pool_id && alert.suggested_ney !== null && (
        <div className="bg-[#0D0B0B] border border-[#2A2020] rounded-[2px] p-3">
          <p className="font-mono text-[9px] uppercase tracking-wide text-[#7A6A6A] mb-1">
            Suggested Exit Pool
          </p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium text-[#EDEBDD]">
              {alert.suggested_pool_id}
            </p>
            <p className="font-mono text-xs font-bold text-[#1D9E75]">
              {formatPct(alert.suggested_ney * 100)} NEY
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleSmartExit}
        disabled={!alert.suggested_pool_id}
        className="w-full py-2.5 font-mono text-xs font-bold uppercase tracking-[0.1em] bg-[#810100] text-[#EDEBDD] hover:bg-[#630000] transition-colors duration-150 rounded-[2px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        One-Click Smart Exit →
      </button>
    </div>
  );
}
