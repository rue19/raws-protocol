export type HealthStatus = 'GREEN' | 'YELLOW' | 'RED' | 'RED_CRITICAL' | 'UNKNOWN';

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
