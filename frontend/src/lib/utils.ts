import { clsx, type ClassValue } from 'clsx';
import { twMerge }               from 'tailwind-merge';

/** Merge Tailwind classes safely — use this everywhere instead of template literals */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

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

/** Return Tailwind text colour class based on health status */
export function healthColor(status: string): string {
  switch (status) {
    case 'GREEN':        return 'text-[#1D9E75]';
    case 'YELLOW':       return 'text-[#BA7517]';
    case 'RED':
    case 'RED_CRITICAL': return 'text-[#C0392B]';
    default:             return 'text-[#7A6A6A]';
  }
}

/** Return health dot colour for inline indicators */
export function healthDotColor(status: string): string {
  switch (status) {
    case 'GREEN':        return 'bg-[#1D9E75]';
    case 'YELLOW':       return 'bg-[#BA7517]';
    case 'RED':
    case 'RED_CRITICAL': return 'bg-[#C0392B]';
    default:             return 'bg-[#7A6A6A]';
  }
}
