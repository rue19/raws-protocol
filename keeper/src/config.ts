import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  // Server
  PORT:                    z.string().default('3001'),
  API_SECRET:              z.string().min(16),
  NODE_ENV:                z.enum(['development', 'production']).default('development'),

  // Stellar
  STELLAR_NETWORK:         z.enum(['testnet', 'mainnet']),
  STELLAR_RPC_URL:         z.string().url(),
  STELLAR_HORIZON_URL:     z.string().url(),
  STELLAR_NETWORK_PASSPHRASE: z.string(),

  // Keeper keypair
  KEEPER_PUBLIC_KEY:       z.string().startsWith('G'),
  KEEPER_SECRET_KEY:       z.string().startsWith('S'),

  // Contracts
  VAULT_CONTRACT_ID:       z.string().startsWith('C'),
  AMM_CONTRACT_ID:         z.string().startsWith('C'),

  // Supabase
  SUPABASE_URL:            z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  // Telegram
  TELEGRAM_BOT_TOKEN:      z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // External APIs
  AQUARIUS_API_URL:        z.string().url().default('https://api.aqua.network/api/v1'),

  // Cron intervals
  WATCHDOG_INTERVAL_MINUTES: z.string().default('30'),
  COMPOUND_INTERVAL_HOURS:   z.string().default('4'),
  RED_ALERT_THRESHOLD:       z.string().default('3'),

  // CORS
  FRONTEND_URL:            z.string().url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
