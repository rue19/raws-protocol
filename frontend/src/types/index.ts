// ── Phase 8 Dashboard Types ──────────────────────────────────────────────────

export type HealthStatus = 'GREEN' | 'YELLOW' | 'RED' | 'RED_CRITICAL' | 'UNKNOWN';

export interface Position {
  id:                string;
  user_address:      string;
  pool_id:           string;
  pool_protocol:     'aquarius' | 'soroswap' | 'phoenix' | 'raws_amm';
  vault_mode:        'SafeMode' | 'YieldMode';
  lp_token_amount:   number;
  df_token_shares:   number;
  entry_price_ratio: number;
  entry_timestamp:   string;
  is_active:         boolean;
  tx_hash:           string | null;
}

export interface PositionWithNEY extends Position {
  current_value_usd:  number | null;
  il_percent:         number;
  fee_earned_usd:     number | null;
  ney_score:          number | null;
  health_status:      HealthStatus;
  compound_count:     number;
  last_compounded_at: string | null;
}

export interface PoolSnapshot {
  id:                 string;
  pool_id:            string;
  price_ratio:        number;
  fee_revenue_period: number;
  health_status:      string;
  ney_score:          number | null;
  total_tvl_usd:      number | null;
  captured_at:        string;
}

export interface PoolWithHealth {
  id:                 string;
  pool_id:            string;
  protocol:           string;
  token_a_code:       string;
  token_b_code:       string;
  is_safe_mode:       boolean;
  latest_snapshot:    PoolSnapshot | null;
  ney_score:          number | null;
  health_status:      HealthStatus;
  real_yield_apy:     number;
  emission_yield_apy: number;
  total_apy:          number;
  tvl_usd:            number | null;
  consecutive_red:    number;
}

export interface CompoundLog {
  id:                string;
  position_id:       string;
  pool_id:           string;
  rewards_harvested: number;
  rewards_usd_value: number | null;
  lp_tokens_added:   number;
  tx_hash:           string;
  gas_cost_xlm:      number;
  compounded_at:     string;
}

export interface Alert {
  id:                string;
  user_address:      string;
  position_id:       string;
  pool_id:           string;
  alert_type:        'RED_CRITICAL' | 'YELLOW_WARNING' | 'COMPOUND';
  message:           string;
  suggested_pool_id: string | null;
  suggested_ney:     number | null;
  is_read:           boolean;
  is_actioned:       boolean;
  created_at:        string;
}

// ── Phase 7 Pool Explorer / Deposit Types ────────────────────────────────────

export interface Pool {
  pool_id: string;
  pool_name: string;
  protocol: string;
  ney_score: number;
  health_status: HealthStatus;
  real_yield_apr: number;
  emission_yield_apr: number;
  total_apr: number;
  reserve_a: number;
  reserve_b: number;
  tvl_usd: number;
  snapshot_at: string;
}

export type DepositPhase =
  | 'INPUTTING'
  | 'SIMULATING'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTING'
  | 'POLLING'
  | 'CONFIRMED'
  | 'ERROR';

export interface DepositState {
  phase: DepositPhase;
  amount: string;
  asset: string;
  slippage: number;
  splitPreview: { tokenA: string; amountA: number; tokenB: string; amountB: number } | null;
  estimatedNEY: number | null;
  txHash: string | null;
  errorMessage: string | null;
  simulatedFee: string | null;
}

export type TxPollResult = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'TIMEOUT';
