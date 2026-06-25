import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  STELLAR_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  SOROBAN_RPC_URL: z.string().url(),
  HORIZON_URL: z.string().url(),
  VAULT_CONTRACT_ID: z.string().min(1),
  AMM_CONTRACT_ID: z.string().min(1),
  KEEPER_SECRET_KEY: z.string().min(1),
  KEEPER_PUBLIC_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AQUARIUS_API_URL: z.string().url().default("https://api.aquarius.finance"),
  SOROSWAP_API_URL: z.string().url().default("https://api.soroswap.finance"),
  WATCHDOG_INTERVAL_CRON: z.string().default("*/30 * * * *"),
  COMPOUND_INTERVAL_CRON: z.string().default("0 */4 * * *"),
  YELLOW_THRESHOLD: z.coerce.number().default(-0.10),
  RED_STREAK_TO_ALERT: z.coerce.number().int().positive().default(3),
  MIN_COMPOUND_THRESHOLD_STROOPS: z.coerce.number().int().positive().default(10000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  PORT: z.coerce.number().int().positive().default(10000),
});

let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    const messages = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
    console.error("Configuration validation failed:\n" + messages);
    process.exit(1);
  }
  throw err;
}

export { config };