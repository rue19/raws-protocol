import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "production",
      STELLAR_NETWORK: "testnet",
      SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
      HORIZON_URL: "https://horizon-testnet.stellar.org",
      VAULT_CONTRACT_ID: "CC4LKQ5BIVLIBC6ZCJIZPBVLD7JRXQKGT7IL6UM7QDHBDTVGYNBV6IQ3",
      AMM_CONTRACT_ID: "CDTNHVUFYEZXZX3UNFF7C3SGOUBOEQA2HMQJ6YLYUPEXH35Y6VGT7IKR",
      KEEPER_SECRET_KEY: "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGFC4",
      KEEPER_PUBLIC_KEY: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      AQUARIUS_API_URL: "https://api.aquarius.finance",
      SOROSWAP_API_URL: "https://api.soroswap.finance",
      WATCHDOG_INTERVAL_CRON: "*/30 * * * *",
      COMPOUND_INTERVAL_CRON: "0 */4 * * *",
      YELLOW_THRESHOLD: "-0.10",
      RED_STREAK_TO_ALERT: "3",
      MIN_COMPOUND_THRESHOLD_STROOPS: "10000",
      LOG_LEVEL: "fatal",
      PORT: "10000",
    },
  },
});