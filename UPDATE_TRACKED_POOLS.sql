-- RAW$ Phase 10 — Update tracked_pools for Mainnet
-- Run in Supabase SQL Editor at: https://supabase.com/dashboard/project/bujntjysxdodgcttoxar/sql

-- Step 1: Clear testnet pool entries
DELETE FROM tracked_pools;

-- Step 2: Insert mainnet pool addresses
-- NOTE: Verify current pool addresses at each protocol's app before running:
-- Aquarius: https://aqua.network/pools
-- Soroswap: https://app.soroswap.finance/liquidity
-- Phoenix: https://phoenix-hub.io/pools

INSERT INTO tracked_pools (
  pool_id, protocol, token_a_code, token_b_code,
  token_a_issuer, token_b_issuer, contract_address,
  is_safe_mode, is_active
) VALUES
  -- Aquarius XLM/USDC (mainnet)
  ('aquarius:XLM/USDC', 'aquarius', 'XLM', 'USDC',
   NULL,
   'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
   NULL, false, true),

  -- Aquarius XLM/EURC (mainnet)
  ('aquarius:XLM/EURC', 'aquarius', 'XLM', 'EURC',
   NULL,
   'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP',
   NULL, false, true),

  -- Soroswap XLM/USDC (mainnet)
  ('soroswap:XLM/USDC', 'soroswap', 'XLM', 'USDC',
   NULL,
   'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
   NULL, false, true),

  -- Phoenix XLM/USDC (mainnet)
  ('phoenix:XLM/USDC', 'phoenix', 'XLM', 'USDC',
   NULL,
   'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
   NULL, false, true),

  -- RAW$ AMM USDC/EURC (Safe Mode — our own contract)
  ('raws_amm:USDC/EURC', 'raws_amm', 'USDC', 'EURC',
   'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
   'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP',
   '<MAINNET_AMM_CONTRACT_ID>',
   true, true);

-- Verify
SELECT pool_id, protocol, is_safe_mode FROM tracked_pools ORDER BY protocol;
-- Expected: 5 rows
