import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export const db = getDb();

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
