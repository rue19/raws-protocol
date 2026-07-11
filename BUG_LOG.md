# RAW$ Phase 9 Bug Log

## Open Bugs

_(All known bugs fixed)_

## Fixed Bugs

| ID | Severity | Component | Description | Fix Applied | Fixed At |
|----|----------|-----------|-------------|-------------|----------|
| BUG-001 | P1 | Frontend | Prerender crash — `supabaseUrl is required` | Lazy `getSupabase()` + env var guard in usePools | Phase 8 hotfix |
| BUG-002 | P1 | Frontend | Prerender crash — `Invalid URL` from stellar rpc.Server | Lazy `getSorobanServer()` + env var guard | Phase 8 hotfix |
| BUG-003 | P1 | Frontend | `npm ci` fails — lock file out of sync with package.json | Regenerated lock file + `vercel.json` using `npm install` | Phase 8 hotfix |
| BUG-004 | P2 | Frontend | Vercel build uses Node 20, stellar-sdk v16 requires Node 22 | Added `.nvmrc` (22) + `engines: { node: ">=22" }` | Phase 8 hotfix |
| BUG-005 | P2 | API Rate Limit | Rate limiter configured (100/min) but not enforcing in production — Render proxy stripped req.ip | Added `trustProxy: true` to Fastify server options | Phase 9 |
| BUG-006 | P1 | API Alerts | Alert dismiss endpoint used PATCH but frontend sends POST | Changed `fastify.patch` to `fastify.post` in alerts.ts | Phase 9 |

## Test Results Summary

### Automated Code Audits
| Suite | Tests Run | Passed | Failed | Notes |
|-------|-----------|--------|--------|-------|
| TS Frontend | 1 | 1 | 0 | `npx tsc --noEmit` — zero errors |
| TS Keeper | 1 | 1 | 0 | `npx tsc --noEmit` — zero errors |
| Rust AMM | 12 | 12 | 0 | All passing (1 deprecated warning) |
| Rust Vault | 31 | 31 | 0 | All passing |
| Tailwind Audit | 1 | 1 | 0 | Zero forbidden colour classes |
| Brand Audit | 1 | 1 | 0 | All hex values correct |
| Division-by-zero | 1 | 1 | 0 | All guards in place |

### Security Tests (On-chain)
| Suite | Test | Result | Notes |
|-------|------|--------|-------|
| 4.1 | Keeper key cannot withdraw user funds | PASS | `from.require_auth()` blocks unauthorized caller |
| 4.2 | Keeper key cannot deposit for user | PASS | Token transfer auth blocks unauthorized deposit |
| 4.3 | Attacker cannot withdraw user's position | PASS | Auth check blocks cross-user withdrawal |
| 4.4 | API rate limit enforcement | PASS | BUG-005 fixed — trustProxy added to Fastify |
| 4.5 | WebSocket invalid address rejected | PASS | Regex validation + immediate close |
| 4.5 | WebSocket SQL injection rejected | PASS | Address format validation rejects injection |

### IL Watchdog Tests
| Suite | Test | Result | Notes |
|-------|------|--------|-------|
| 3.1 | 3 RED periods trigger alert | PASS | Alert inserted into Supabase with correct pool/user |
| 3.2 | Alert dismissal works | PASS | PATCH→POST fix. is_read=true, alert gone on refresh |
| 3.3 | 2 RED periods do NOT trigger alert | PASS | Below threshold correctly prevents false positive |

### Multi-User Isolation
| Suite | Test | Result | Notes |
|-------|------|--------|-------|
| 5.1 | User A positions not visible to User B | PASS | API returns empty positions for User B |
| 5.1 | Alerts scoped per user | PASS | User A sees 1 alert, User B sees 0 |

### Frontend Tests (Code Verification)
| Suite | Test | Result | Notes |
|-------|------|--------|-------|
| 2.3 | Double-spend — withdraw more than balance | PASS | Contract rejects with "insufficient dfTokens" |
| 1.2 | Pool explorer code — no NaN/undefined | PASS | Division-by-zero guards in place |
| 1.4 | Dashboard — lazy init prevents prerender crash | PASS | Both supabase + stellar use lazy getters |
| 6.5 | Brand — no default Tailwind colours | PASS | Zero forbidden class matches |

## Testnet Wallets

| Wallet | Public Key | Purpose | Funded |
|--------|-----------|---------|--------|
| test-user-a | `GBFONW7XJPQOCS76KI56RWZAPEZTSJTB57DUX2BG5MX6DEJXJ6MDLAWO` | Primary test user | Yes (XLM) |
| test-user-b | `GCSKZM27Q6MJRAHQK36MOA3CDW4MXV54Q24DC7KQ5EN32AX225VLTS73` | Multi-user isolation | Yes (XLM) |
| test-attacker | `GCLDI7DVAT4YT2LXIB5HQ3AFQNXTUTWR47CDYQZJTBQKVNAFAZWBCCKS` | Security testing | Yes (XLM) |
