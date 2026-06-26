// Legacy Phase 5 types — kept for backward compatibility with jobs/ and lib/
// Phase 6 types are in types/index.ts

export interface PoolSnapshot {
  pool_id: string;
  reserve_a: bigint;
  reserve_b: bigint;
  fee_revenue_30m: bigint;
  current_price_ratio: number;
  entry_price_ratio?: number;
  ney?: number;
  health_status?: HealthStatus;
  cycle_timestamp: Date;
}

export type HealthStatus = "GREEN" | "YELLOW" | "RED" | "RED_CRITICAL";

export interface Position {
  user_address: string;
  pool_id: string;
  lp_tokens: bigint;
  entry_price_ratio: number;
  entry_timestamp: Date;
  dftokens: bigint;
  is_active: boolean;
  lp_address?: string;
}

export interface CompoundLog {
  id: number;
  pool_id: string;
  user_address: string;
  pending_rewards: bigint;
  harvest_tx_hash: string;
  reinvested_amount?: bigint;
  status: "PENDING" | "SUCCESS" | "FAILED";
  executed_at: Date;
}

export interface AlertRecord {
  id: number;
  pool_id: string;
  user_address: string;
  alert_type: string;
  current_loss_rate: number;
  suggested_pool_id: string | null;
  projected_ney_improvement: number | null;
  status: "OPEN" | "ACKED" | "RESOLVED";
  created_at: Date;
}

export interface HorizonError extends Error {
  statusCode?: number;
  poolId?: string;
}
