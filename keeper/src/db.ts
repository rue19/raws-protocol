import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

// Use SERVICE ROLE key — keeper has full DB write access
// NEVER expose this key to frontend
let _client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (!_client) {
    _client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _client;
}

// Named export for convenience
export const db = getDb();
