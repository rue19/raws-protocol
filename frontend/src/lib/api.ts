import type { PositionWithNEY, PoolWithHealth, CompoundLog, Alert } from '@/types';

// All API routes are now internal Next.js API routes
const BASE = '/api/v1';

const DEFAULT_HEADERS = { 'Content-Type': 'application/json' } as const;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface ChainPosition {
  userAddress: string;
  lpTokenAddress: string;
  dfTokenShares: number;
  lpTokenAmount: number;
}

export const api = {
  getPositions: (address: string) =>
    get<{ positions: PositionWithNEY[]; total_value_usd: number | null }>
    (`/positions/${address}`),

  /**
   * Fallback: reconstruct positions from on-chain contract events via Horizon.
   * Returns raw chain-derived positions when Supabase is unavailable.
   */
  getPositionsFromChain: (address: string) =>
    get<{ positions: ChainPosition[]; source: string; fetched_at: string }>
    (`/positions/${address}/chain`),

  getPools: (params?: { protocol?: string; safe_mode?: boolean }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return get<{ pools: PoolWithHealth[] }>(`/pools${qs}`);
  },

  getPool: (poolId: string) =>
    get<{ pool: PoolWithHealth; snapshots: unknown[] }>
    (`/pools/${encodeURIComponent(poolId)}`),

  getCompoundLog: (address: string, limit = 20) =>
    get<{ logs: CompoundLog[]; total_rewards_usd: number; total_compound_count: number }>
    (`/compound-log/${address}?limit=${limit}`),

  getAlerts: (address: string) =>
    get<{ alerts: Alert[] }>(`/alerts/${address}`),

  markAlertRead: (id: string) =>
    post<{ success: boolean }>(`/alerts/${id}/read`, {}),

  subscribeAlerts: (address: string, telegram_chat_id: string) =>
    post<{ success: boolean }>('/alerts/subscribe', { address, telegram_chat_id }),
};
