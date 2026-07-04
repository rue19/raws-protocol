'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AlertsPage() {
  const { 
    walletAddress, alerts, setAlerts, 
    isLoadingPositions, setLoadingPositions 
  } = useStore();

  const loadAlerts = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingPositions(true);
    try {
      const data = await api.getAlerts(walletAddress);
      setAlerts(data.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoadingPositions(false);
    }
  }, [walletAddress, setAlerts, setLoadingPositions]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  if (!walletAddress) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 pt-14 md:pt-20 text-center">
        <h1 className="text-4xl font-bold text-[#0f1b2d] mb-4 tracking-tight uppercase">Security Alerts</h1>
        <p className="text-[#6b7280] font-medium tracking-tight">Connect your wallet to view critical risk notifications for your positions.</p>
      </div>
    );
  }

  const unreadAlerts = alerts.filter(a => !a.is_read);
  const readAlerts = alerts.filter(a => a.is_read);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pt-14 md:pt-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-[#0f1b2d] mb-2 tracking-tight uppercase">Security Alerts</h1>
          <p className="text-[#6b7280] font-medium tracking-tight text-sm">Real-time risk monitoring for your Stellar DeFi positions.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-[#ddd0b3] rounded-lg px-4 py-2 flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-[#2dbe6c] animate-pulse" />
             <span className="text-[#6b7280] text-[10px] font-bold tracking-widest uppercase">Monitoring Active</span>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Unread Alerts */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-sm font-bold tracking-widest uppercase text-[#0f1b2d]">UNRESOLVED ISSUES</h2>
            {unreadAlerts.length > 0 && (
              <span className="bg-[#e53935] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {unreadAlerts.length}
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {isLoadingPositions ? (
              [1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
            ) : unreadAlerts.length === 0 ? (
              <div className="bg-white border border-[#ddd0b3] rounded-xl p-12 text-center">
                <p className="text-[#6b7280] text-[10px] font-bold tracking-widest uppercase mb-1">ALL CLEAR</p>
                <p className="text-[#9ca3af] text-xs font-medium">No active risk notifications for your account.</p>
              </div>
            ) : (
              unreadAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </section>

        {/* Read/History Section */}
        {readAlerts.length > 0 && (
          <section>
            <h2 className="text-sm font-bold tracking-widest uppercase text-[#6b7280] mb-6">HISTORY</h2>
            <div className="space-y-4 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
              {readAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Security Footer */}
      <div className="mt-20 border-t border-[#e5d9bf] pt-10 text-center">
        <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em]">
          RAW$ AUTO-GUARDIAN PROTOCOL V1.4 · SECURED BY SOROBAN
        </p>
      </div>
    </div>
  );
}
