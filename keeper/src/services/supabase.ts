import { config } from "../config";
import { logger } from "../lib/logger";
import type { Position, PoolSnapshot, CompoundLog, AlertRecord } from "../types";

interface DbRow {
  pool_id: string;
  user_address: string;
  lp_tokens: string;
  entry_price_ratio: number;
  entry_timestamp: string;
  dftokens: string;
  is_active: boolean;
  lp_address?: string;
}

const mockPositions: DbRow[] = [];

export function seedMockPositions(rows: DbRow[]): void {
  mockPositions.length = 0;
  mockPositions.push(...rows);
}

export function clearMockPositions(): void {
  mockPositions.length = 0;
}

export async function getActivePoolIds(): Promise<string[]> {
  const poolIds = new Set<string>();
  for (const row of mockPositions) {
    if (row.is_active) poolIds.add(row.pool_id);
  }
  const distinct = Array.from(poolIds);
  if (distinct.length === 0) {
    logger.warn("no active positions found in database");
  }
  return distinct;
}

export async function getActivePositionsForPool(poolId: string): Promise<Position[]> {
  const filtered = mockPositions.filter((r) => r.pool_id === poolId && r.is_active);
  return filtered.map((r) => ({
    user_address: r.user_address,
    pool_id: r.pool_id,
    lp_tokens: BigInt(r.lp_tokens),
    entry_price_ratio: r.entry_price_ratio,
    entry_timestamp: new Date(r.entry_timestamp),
    dftokens: BigInt(r.dftokens),
    is_active: r.is_active,
    lp_address: r.lp_address,
  }));
}

export async function getActivePositions(): Promise<Position[]> {
  const filtered = mockPositions.filter((r) => r.is_active);
  return filtered.map((r) => ({
    user_address: r.user_address,
    pool_id: r.pool_id,
    lp_tokens: BigInt(r.lp_tokens),
    entry_price_ratio: r.entry_price_ratio,
    entry_timestamp: new Date(r.entry_timestamp),
    dftokens: BigInt(r.dftokens),
    is_active: r.is_active,
    lp_address: r.lp_address,
  }));
}

export async function getRecentSnapshots(
  poolId: string,
  limit: number
): Promise<PoolSnapshot[]> {
  return [];
}

export async function upsertPoolSnapshot(
  snapshot: PoolSnapshot
): Promise<void> {
  logger.info({ poolId: snapshot.pool_id, status: snapshot.health_status }, "pool snapshot upserted");
}

export async function findOpenAlert(
  poolId: string,
  userAddress: string
): Promise<AlertRecord | null> {
  return null;
}

export async function insertAlert(alert: {
  pool_id: string;
  user_address: string;
  alert_type: string;
  current_loss_rate: number;
  suggested_pool_id: string | null;
  projected_ney_improvement: number | null;
  status: string;
}): Promise<void> {
  logger.warn({ poolId: alert.pool_id, user: alert.user_address }, "alert inserted");
}

export async function hasRecentCompoundLog(
  poolId: string,
  since: Date
): Promise<boolean> {
  return false;
}

export async function insertCompoundLog(log: {
  pool_id: string;
  user_address: string;
  pending_rewards: bigint;
  status: string;
  harvest_tx_hash: string;
}): Promise<CompoundLog> {
  return {
    id: Math.floor(Math.random() * 1000000),
    pool_id: log.pool_id,
    user_address: log.user_address,
    pending_rewards: log.pending_rewards,
    harvest_tx_hash: log.harvest_tx_hash,
    status: log.status as "PENDING" | "SUCCESS" | "FAILED",
    executed_at: new Date(),
  };
}

export async function updateCompoundLog(
  id: number,
  update: { status: string; harvest_tx_hash: string }
): Promise<void> {
  logger.info({ compoundLogId: id, status: update.status }, "compound log updated");
}