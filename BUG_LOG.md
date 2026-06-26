# RAW$ Phase 9 Bug Log

## Open Bugs

| ID | Severity | Component | Description | Steps | Status |
|----|----------|-----------|-------------|-------|--------|
| BUG-005 | P2 | API Rate Limit | Rate limiter configured (100/min) but not enforcing in production — all 105 requests returned 200 | Fire 105 rapid requests to /api/v1/pools | OPEN — Render proxy likely strips req.ip |

_(1 P2 bug open — does not block Phase 10)_

## Fixed Bugs

| ID | Severity | Component | Description | Fix Applied | Fixed At |
|----|----------|-----------|-------------|-------------|----------|
| BUG-001 | P1 | Frontend | Prerender crash — `supabaseUrl is required` | Lazy `getSupabase()` + env var guard in usePools | Phase 8 hotfix |
| BUG-002 | P1 | Frontend | Prerender crash — `Invalid URL` from stellar rpc.Server | Lazy `getSorobanServer()` + env var guard | Phase 8 hotfix |
| BUG-003 | P1 | Frontend | `npm ci` fails — lock file out of sync with package.json | Regenerated lock file + `vercel.json` using `npm install` | Phase 8 hotfix |
| BUG-004 | P2 | Frontend | Vercel build uses Node 20, stellar-sdk v16 requires Node 22 | Added `.nvmrc` (22) + `engines: { node: ">=22" }` | Phase 8 hotfix |

## Test Results Summary

| Suite | Tests Run | Passed | Failed | Notes |
|-------|-----------|--------|--------|-------|
| TS Frontend | 1 | 1 | 0 | `npx tsc --noEmit` — zero errors |
| TS Keeper | 1 | 1 | 0 | `npx tsc --noEmit` — zero errors |
| Rust AMM | 12 | 12 | 0 | All passing (1 deprecated warning) |
| Rust Vault | 31 | 31 | 0 | All passing |
| Tailwind Audit | 1 | 1 | 0 | Zero forbidden colour classes |
| Brand Audit | 1 | 1 | 0 | All hex values correct |
| Division-by-zero | 1 | 1 | 0 | All guards in place |
| Rate Limit | 1 | 0 | 1 | BUG-005: Not enforcing in production |
| WebSocket Validation | 2 | 2 | 0 | Invalid + SQL injection rejected |

## Testnet Wallets

| Wallet | Public Key | Purpose |
|--------|-----------|---------|
| test-user-a | `GBFONW7XJPQOCS76KI56RWZAPEZTSJTB57DUX2BG5MX6DEJXJ6MDLAWO` | Primary test user |
| test-user-b | `GCSKZM27Q6MJRAHQK36MOA3CDW4MXV54Q24DC7KQ5EN32AX225VLTS73` | Multi-user isolation |
| test-attacker | `GCLDI7DVAT4YT2LXIB5HQ3AFQNXTUTWR47CDYQZJTBQKVNAFAZWBCCKS` | Security testing |
