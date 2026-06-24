import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

export function initDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured — running without database');
    return null as any;
  }

  supabase = createClient(url, key);
  console.log('Supabase connected');
  return supabase;
}

export function getDb(): SupabaseClient {
  if (!supabase) {
    throw new Error('Database not initialized — call initDb() first');
  }
  return supabase;
}

// ─── Pool Snapshots ────────────────────────────────────────────────

export interface PoolSnapshot {
  id?: string;
  pool_address: string;
  token_a: string;
  token_b: string;
  balance_a: string;
  balance_b: string;
  total_shares: string;
  amp_factor: number;
  fee: number;
  timestamp: string;
}

export async function savePoolSnapshot(snapshot: PoolSnapshot): Promise<void> {
  const db = getDb();
  const { error } = await db.from('pool_snapshots').insert(snapshot);
  if (error) {
    console.error('Failed to save pool snapshot:', error.message);
  }
}

export async function getLatestSnapshot(poolAddress: string): Promise<PoolSnapshot | null> {
  const db = getDb();
  const { data, error } = await db
    .from('pool_snapshots')
    .select('*')
    .eq('pool_address', poolAddress)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

// ─── IL Alerts ─────────────────────────────────────────────────────

export interface ILAlert {
  id?: string;
  pool_address: string;
  il_percentage: string;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  notified: boolean;
}

export async function saveILAlert(alert: ILAlert): Promise<void> {
  const db = getDb();
  const { error } = await db.from('il_alerts').insert(alert);
  if (error) {
    console.error('Failed to save IL alert:', error.message);
  }
}

export async function getRecentAlerts(poolAddress: string, limit: number = 10): Promise<ILAlert[]> {
  const db = getDb();
  const { data, error } = await db
    .from('il_alerts')
    .select('*')
    .eq('pool_address', poolAddress)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ─── Compound Events ───────────────────────────────────────────────

export interface CompoundEvent {
  id?: string;
  pool_address: string;
  reward_amount: string;
  new_total_lp: string;
  timestamp: string;
  tx_hash: string;
}

export async function saveCompoundEvent(event: CompoundEvent): Promise<void> {
  const db = getDb();
  const { error } = await db.from('compound_events').insert(event);
  if (error) {
    console.error('Failed to save compound event:', error.message);
  }
}
