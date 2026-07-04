import { clsx, type ClassValue } from 'clsx';
import { twMerge }               from 'tailwind-merge';

/** Merge Tailwind classes safely — use this everywhere instead of template literals */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Formatting helpers ───────────────────────────────────────────────────────

/** Format a number as USD */
export function formatUSD(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style:           'currency',
    currency:        'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format a percentage with sign */
export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Format a Stellar address to short form: GABCD...WXYZ */
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

/** Alias used by deposit components */
export const formatAddress = shortAddress;

/** Format a plain number with commas */
export function formatAmount(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Format APR with sign */
export const formatAPR = formatPct;

/** Format NEY with sign */
export const formatNEY = formatPct;

/** Format TVL as compact USD */
export function formatTVL(tvl: number): string {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}

/** Format a timestamp to relative time: "2h ago" */
export function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Health helpers ───────────────────────────────────────────────────────────

/** Return Tailwind text colour class based on health status */
export function healthColor(status: string): string {
  switch (status) {
    case 'GREEN':        return 'text-[#2dbe6c]';
    case 'YELLOW':       return 'text-[#f59e0b]';
    case 'RED':
    case 'RED_CRITICAL': return 'text-[#e53935]';
    default:             return 'text-[#6b7280]';
  }
}

/** Return health dot colour for inline indicators */
export function healthDotColor(status: string): string {
  switch (status) {
    case 'GREEN':        return 'bg-[#2dbe6c]';
    case 'YELLOW':       return 'bg-[#f59e0b]';
    case 'RED':
    case 'RED_CRITICAL': return 'bg-[#e53935]';
    default:             return 'bg-[#6b7280]';
  }
}
