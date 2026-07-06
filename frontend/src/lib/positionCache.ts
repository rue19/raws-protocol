/**
 * Write-through localStorage cache for entry_price_ratio.
 *
 * When a deposit succeeds, we immediately write the ratio to localStorage
 * so the dashboard can display it instantly without waiting for Supabase.
 */

const CACHE_PREFIX = 'raws_entry_ratio_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedEntry {
  ratio: number;
  timestamp: number;
}

export function cacheEntryRatio(positionId: string, ratio: number): void {
  try {
    const key = CACHE_PREFIX + positionId;
    const entry: CachedEntry = { ratio, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

export function getCachedEntryRatio(positionId: string): number | null {
  try {
    const key = CACHE_PREFIX + positionId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry: CachedEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.ratio;
  } catch {
    return null;
  }
}

export function invalidateCachedEntryRatio(positionId: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + positionId);
  } catch {
    // ignore
  }
}
