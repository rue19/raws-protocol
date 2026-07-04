'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/pools', label: 'Pools', icon: 'ellipses' },
];

const iconPaths: Record<string, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  ellipses: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM2 12c0-2.21 4.48-4 10-4s10 1.79 10 4-4.48 4-10 4S2 14.21 2 12z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
};

function SidebarContent({ pathname, walletAddress, unreadCount }: {
  pathname: string;
  walletAddress: string | null;
  unreadCount: number;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-[18px] border-b border-white/[0.07]">
        <div className="logo-icon">
          <svg width="28" height="34" viewBox="0 0 36 42" fill="none">
            <path d="M18 3C18 3 7 9 7 19C7 25 11 29 15 31L15 39" stroke="#F5E6C8" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M18 3C18 3 29 9 29 19C29 25 25 29 21 31L21 39" stroke="#F5E6C8" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="15" y1="39" x2="21" y2="39" stroke="#F5E6C8" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="18" cy="19" r="4.5" stroke="#F5E6C8" strokeWidth="2.5"/>
            <path d="M18 3 Q20.5 0 23 3" stroke="#F5E6C8" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[#F5E6C8] font-mono text-lg font-bold tracking-[0.04em]">RAW$</span>
          <span className="text-[rgba(245,230,200,0.4)] text-[10px] tracking-[0.1em] mt-[3px]">REAL YIELD. NO BULLSHIT.</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2.5 pt-3.5 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={iconPaths[link.icon]} />
            </svg>
            {link.label}
          </Link>
        ))}
        <Link href="/alerts" className="sidebar-link" style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPaths.bell} />
          </svg>
          Alerts
          {unreadCount > 0 && (
            <span className="ml-auto bg-[#f59e0b] text-white text-[10px] font-bold px-1.5 py-[1px] rounded-full leading-[1.5]">{unreadCount}</span>
          )}
        </Link>
      </nav>

      {/* Wallet Card */}
      <div className="mx-2.5 mb-2.5 bg-[#162035] border border-white/10 rounded-[10px] p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-[7px] h-[7px] rounded-full bg-[#2dbe6c] shadow-[0_0_0_2px_rgba(45,190,108,0.3)]" />
          <span className="text-[10px] font-bold tracking-[0.12em] text-[#2dbe6c]">
            {walletAddress ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
        {walletAddress ? (
          <>
            <div className="flex items-center gap-1.5 font-mono text-[15px] font-bold text-[#F5E6C8] mb-2">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </div>
            <div className="text-[10px] font-semibold tracking-[0.1em] text-[rgba(245,230,200,0.4)] mb-[3px]">Balance</div>
            <div className="font-mono text-[15px] font-bold text-[#F5E6C8] leading-tight mb-0.5">Loading...</div>
            <div className="text-[11px] text-[rgba(245,230,200,0.45)] mb-3">--</div>
          </>
        ) : (
          <div className="font-mono text-xs text-[rgba(245,230,200,0.5)] mb-2">
            Connect your wallet
          </div>
        )}
      </div>

      {/* Help */}
      <div className="mx-2.5 mb-0.5 flex items-center gap-2.5 p-2.5 bg-white/[0.04] rounded-lg border border-white/[0.07]">
        <div className="text-[rgba(245,230,200,0.35)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div>
          <div className="text-[12px] text-[rgba(245,230,200,0.5)] mb-0.5">Need help?</div>
          <a href="#" className="text-[11px] font-semibold text-[rgba(245,230,200,0.7)] no-underline hover:text-[#F5E6C8] transition-colors">View Docs →</a>
        </div>
      </div>

      {/* Brand footer */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 border-t border-white/[0.07] mt-1.5">
        <svg width="16" height="20" viewBox="0 0 36 42" fill="none">
          <path d="M18 3C18 3 7 9 7 19C7 25 11 29 15 31L15 39" stroke="#F5E6C8" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M18 3C18 3 29 9 29 19C29 25 25 29 21 31L21 39" stroke="#F5E6C8" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="15" y1="39" x2="21" y2="39" stroke="#F5E6C8" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="18" cy="19" r="4.5" stroke="#F5E6C8" strokeWidth="2.5"/>
        </svg>
        <span className="text-[10px] text-[rgba(245,230,200,0.35)] tracking-[0.04em] leading-tight">RAW$ . Real yield. No bullshit.</span>
      </div>
    </>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { walletAddress, alerts } = useStore();
  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-[60] md:hidden bg-[#0f1b2d] border border-white/10 rounded-lg p-2 text-[#F5E6C8] hover:bg-[#162035] transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[220px] min-w-[220px] bg-[#0f1b2d] flex-col z-50">
        <SidebarContent pathname={pathname} walletAddress={walletAddress} unreadCount={unreadCount} />
      </aside>

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[260px] bg-[#0f1b2d] flex flex-col z-[58] transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={closeMobile}
          className="absolute top-4 right-4 text-[rgba(245,230,200,0.5)] hover:text-[#F5E6C8] transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <SidebarContent pathname={pathname} walletAddress={walletAddress} unreadCount={unreadCount} />
      </aside>
    </>
  );
}
