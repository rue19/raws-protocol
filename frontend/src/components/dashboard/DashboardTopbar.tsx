'use client';

import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';

export function DashboardTopbar() {
  const { walletAddress } = useStore();
  const [lastUpdated, setLastUpdated] = useState('12s ago');

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated((prev) => {
        const sec = parseInt(prev) || 12;
        return `${sec + 1}s ago`;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between py-5 border-b border-[#e5d9bf] mb-5">
      <div>
        <h1 className="font-mono text-[24px] font-bold text-[#0f1b2d] leading-tight">Dashboard</h1>
        <p className="text-[13px] text-[#6b7280] mt-0.5">Overview of your positions, yields, and activity.</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Live badge */}
        <div className="flex items-center gap-1.5 bg-[rgba(15,27,45,0.06)] border border-[#ddd0b3] rounded-[20px] px-3 py-1.5 text-[12px] text-[#6b7280]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#2dbe6c] shadow-[0_0_0_2px_rgba(45,190,108,0.25)] animate-[pulse_2s_infinite]" />
          <span className="font-semibold text-[#0f1b2d]">Live</span>
          <span className="text-[#9ca3af]">Updated {lastUpdated}</span>
          <button className="bg-transparent border-none text-[#9ca3af] cursor-pointer flex items-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {/* Wallet pill */}
        {walletAddress && (
          <div className="flex items-center gap-[7px] bg-[#0f1b2d] text-[#F5E6C8] rounded-[8px] px-3 py-[7px] font-mono text-[13px] font-semibold cursor-pointer">
            <span className="w-[7px] h-[7px] rounded-full bg-[#2dbe6c]" />
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>
    </header>
  );
}
