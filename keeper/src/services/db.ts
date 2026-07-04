import { db } from '../db';
import type { Position, PoolSnapshot, CompoundLog } from '../types/index';

export async function getActivePoolIds(): Promise<string[]> {
  const { data, error } = await db
    .from('tracked_pools')
    .select('pool_id')
    .eq('is_active', true);

  if (error) throw new Error(`DB error fetching active pools: ${error.message}`);
  return (data ?? []).map((r: { pool_id: string }) => r.pool_id);
}

export async function getActivePositionsForPool(poolId: string): Promise<Position[]> {
  const { data, error } = await db
    .from('positions')
    .select('*')
    .eq('pool_id', poolId)
    .eq('is_active', true);

  if (error) throw new Error(`DB error fetching positions for ${poolId}: ${error.message}`);
  return (data ?? []) as Position[];
}

export async function getActivePositions(): Promise<Position[]> {
  const { data, error } = await db
    .from('positions')
    .select('*')
    .eq('is_active', true);

  if (error) throw new Error(`DB error fetching active positions: ${error.message}`);
  return (data ?? []) as Position[];
}

export async function getRecentSnapshots(poolId: string, limit: number): Promise<PoolSnapshot[]> {
  const { data, error } = await db
    .from('pool_snapshots')
    .select('*')
    .eq('pool_id', poolId)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`DB error fetching snapshots for ${poolId}: ${error.message}`);
  return (data ?? []) as PoolSnapshot[];
}

export async function upsertPoolSnapshot(snapshot: PoolSnapshot): Promise<void> {
  const { error } = await db
    .from('pool_snapshots')
    .upsert(snapshot, { onConflict: 'pool_id,captured_at' });

  if (error) throw new Error(`DB error upserting snapshot: ${error.message}`);
}

export async function hasRecentCompoundLog(poolId: string, since: Date): Promise<boolean> {
  const { count, error } = await db
    .from('compound_log')
    .select('id', { count: 'exact', head: true })
    .eq('pool_id', poolId)
    .gte('compounded_at', since.toISOString());

  if (error) throw new Error(`DB error checking compound log: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function insertCompoundLog(log: {
  pool_id: string;
  user_address: string;
  position_id: string;
  rewards_harvested: number;
  tx_hash: string;
  gas_cost_xlm: number;
}): Promise<CompoundLog> {
  const { data, error } = await db
    .from('compound_log')
    .insert({
      ...log,
      compounded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`DB error inserting compound log: ${error.message}`);
  return data as CompoundLog;
}

export async function updateCompoundLog(
  id: string,
  update: { tx_hash: string; rewards_usd_value?: number }
): Promise<void> {
  const { error } = await db
    .from('compound_log')
    .update(update)
    .eq('id', id);

  if (error) throw new Error(`DB error updating compound log: ${error.message}`);
}

export async function insertAlert(alert: {
  user_address: string;
  position_id: string;
  pool_id: string;
  alert_type: 'RED_CRITICAL' | 'YELLOW_WARNING' | 'COMPOUND';
  message: string;
  suggested_pool_id: string | null;
  suggested_ney: number | null;
}): Promise<void> {
  const { error } = await db
    .from('alerts')
    .insert({
      ...alert,
      is_read: false,
      is_actioned: false,
      telegram_sent: false,
      created_at: new Date().toISOString(),
    });

  if (error) throw new Error(`DB error inserting alert: ${error.message}`);
}
