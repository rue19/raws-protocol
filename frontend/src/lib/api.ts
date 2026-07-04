import type { PositionWithNEY, PoolWithHealth, CompoundLog, Alert } from '@/types';

// All API routes are now internal Next.js API routes
const BASE = '/api/v1';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.NEXT_PUBLIC_API_SECRET;
  if (secret) headers['Authorization'] = `Bearer ${secret}`;
  return headers;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getPositions: (address: string) =>
    get<{ positions: PositionWithNEY[]; total_value_usd: number | null }>
    (`/positions/${address}`),

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
