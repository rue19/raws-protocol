-- Table: user_preferences
-- Stores per-wallet notification settings
create table if not exists user_preferences (
  id                 uuid primary key default uuid_generate_v4(),
  user_address       text not null unique,       -- Stellar G... address
  telegram_chat_id   text,                       -- Telegram chat ID (nullable = not linked)
  email              text,                       -- optional email (future use)
  alerts_enabled     boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_user_prefs_address on user_preferences(user_address);
create index idx_user_prefs_telegram on user_preferences(telegram_chat_id)
  where telegram_chat_id is not null;

-- RLS: users read/update only their own preferences
alter table user_preferences enable row level security;
create policy "Users manage own preferences" on user_preferences
  for all using (true);  -- keeper uses service role, tighten in Phase 9

-- Enable Realtime on this table
alter publication supabase_realtime add table user_preferences;
