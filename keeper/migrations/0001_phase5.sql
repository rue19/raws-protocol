-- pool_snapshots: one row per pool per 30-min cycle
create table if not exists pool_snapshots (
  id bigint generated always as identity primary key,
  pool_id text not null,
  reserve_a numeric not null,
  reserve_b numeric not null,
  fee_revenue_30m numeric not null default 0,
  current_price_ratio numeric not null,
  ney numeric,
  health_status text not null check (health_status in ('GREEN','YELLOW','RED','RED_CRITICAL')),
  cycle_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists pool_snapshots_pool_cycle_uq
  on pool_snapshots (pool_id, cycle_timestamp);
create index if not exists pool_snapshots_pool_id_idx on pool_snapshots (pool_id, cycle_timestamp desc);

-- positions: reference record created in Phase 3 deposit flow — keeper only READS entry_price_ratio from here
-- expected columns: user_address, pool_id, lp_tokens, entry_price_ratio, entry_timestamp, dftokens, is_active

-- compound_log: one row per successful harvest
create table if not exists compound_log (
  id bigint generated always as identity primary key,
  pool_id text not null,
  user_address text,
  pending_rewards numeric not null,
  harvest_tx_hash text not null unique,
  reinvested_amount numeric,
  status text not null check (status in ('PENDING','SUCCESS','FAILED')) default 'PENDING',
  executed_at timestamptz not null default now()
);

-- alerts: one row per RED x3 event
create table if not exists alerts (
  id bigint generated always as identity primary key,
  pool_id text not null,
  user_address text,
  alert_type text not null default 'SMART_EXIT',
  current_loss_rate numeric not null,
  suggested_pool_id text,
  projected_ney_improvement numeric,
  status text not null check (status in ('OPEN','ACKED','RESOLVED')) default 'OPEN',
  created_at timestamptz not null default now()
);
create index if not exists alerts_pool_status_idx on alerts (pool_id, status);