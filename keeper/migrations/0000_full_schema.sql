-- ============================================================
-- RAW$ Phase 6 — Full Database Schema
-- Run this ENTIRE script in Supabase SQL Editor → New Query → Run
-- ============================================================

-- 1. tracked_pools: pools the keeper monitors
create table if not exists tracked_pools (
  id             uuid primary key default uuid_generate_v4(),
  pool_id        text not null unique,
  protocol       text not null check (protocol in ('aquarius','soroswap','phoenix','raws_amm')),
  token_a_code   text not null,
  token_b_code   text not null,
  token_a_issuer text,
  token_b_issuer text,
  contract_address text,
  is_safe_mode   boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists tracked_pools_protocol_idx on tracked_pools(protocol);
create index if not exists tracked_pools_active_idx on tracked_pools(is_active) where is_active = true;

-- 2. pool_snapshots: one row per pool per 30-min cycle
create table if not exists pool_snapshots (
  id                 bigint generated always as identity primary key,
  pool_id            text not null,
  pool_protocol      text,
  reserve_a          numeric not null,
  reserve_b          numeric not null,
  price_ratio        numeric not null,
  fee_revenue_period numeric not null default 0,
  total_tvl_usd      numeric,
  ney_score          numeric,
  health_status      text not null check (health_status in ('GREEN','YELLOW','RED','RED_CRITICAL')),
  captured_at        timestamptz not null default now()
);
create unique index if not exists pool_snapshots_pool_cycle_uq
  on pool_snapshots (pool_id, captured_at);
create index if not exists pool_snapshots_pool_id_idx
  on pool_snapshots (pool_id, captured_at desc);

-- 3. positions: LP positions created by the vault contract
create table if not exists positions (
  id                 uuid primary key default uuid_generate_v4(),
  user_address       text not null,
  pool_id            text not null,
  pool_protocol      text check (pool_protocol in ('aquarius','soroswap','phoenix','raws_amm')),
  vault_mode         text check (vault_mode in ('SafeMode','YieldMode')),
  lp_token_amount    numeric not null default 0,
  df_token_shares    numeric not null default 0,
  entry_price_ratio  numeric not null default 0,
  entry_timestamp    timestamptz not null default now(),
  is_active          boolean not null default true,
  tx_hash            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists positions_user_idx on positions(user_address);
create index if not exists positions_pool_idx on positions(pool_id);
create index if not exists positions_active_idx on positions(is_active) where is_active = true;

-- 4. compound_log: one row per successful harvest
create table if not exists compound_log (
  id                 bigint generated always as identity primary key,
  position_id        uuid references positions(id),
  pool_id            text not null,
  user_address       text,
  rewards_harvested  numeric not null default 0,
  rewards_usd_value  numeric,
  lp_tokens_added    numeric not null default 0,
  tx_hash            text not null unique,
  gas_cost_xlm       numeric not null default 0,
  compounded_at      timestamptz not null default now()
);
create index if not exists compound_log_user_idx on compound_log(user_address);
create index if not exists compound_log_position_idx on compound_log(position_id);

-- 5. alerts: one row per alert event
create table if not exists alerts (
  id                 uuid primary key default uuid_generate_v4(),
  user_address       text not null,
  position_id        uuid,
  pool_id            text not null,
  alert_type         text not null check (alert_type in ('RED_CRITICAL','YELLOW_WARNING','COMPOUND')),
  message            text not null default '',
  suggested_pool_id  text,
  suggested_ney      numeric,
  is_read            boolean not null default false,
  is_actioned        boolean not null default false,
  telegram_sent      boolean not null default false,
  created_at         timestamptz not null default now()
);
create index if not exists alerts_user_idx on alerts(user_address, is_read);
create index if not exists alerts_pool_idx on alerts(pool_id);

-- 6. user_preferences: per-wallet notification settings
create table if not exists user_preferences (
  id                 uuid primary key default uuid_generate_v4(),
  user_address       text not null unique,
  telegram_chat_id   text,
  email              text,
  alerts_enabled     boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_user_prefs_address on user_preferences(user_address);
create index idx_user_prefs_telegram on user_preferences(telegram_chat_id)
  where telegram_chat_id is not null;

-- 7. RLS policies
alter table user_preferences enable row level security;
create policy "Users manage own preferences" on user_preferences
  for all using (true);

-- 8. Enable Realtime on key tables
alter publication supabase_realtime add table positions;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table user_preferences;
