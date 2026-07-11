# RAW$

**The naked truth about your yield.**

---

## What It Does

RAW$ is a Stellar-native yield optimizer where you deposit a single token and the protocol automatically:

1. Splits your deposit into the optimal ratio for the target pool
2. LPs across Aquarius, Soroswap, and Phoenix in one atomic transaction
3. Auto-compounds rewards every 4 hours (viable at any deposit size — Stellar fees are $0.00015)
4. Displays your **Net Effective Yield (NEY)** = fees earned − impermanent loss — a metric no existing Stellar protocol offers
5. Alerts you when a pool has been losing money for 90 minutes and offers a one-click exit

---

## Why This Doesn't Exist Yet

Every yield optimizer on Stellar (and most on Ethereum) shows you APY.
None subtract impermanent loss. None separate real yield from token emissions.
RAW$ is the first protocol that shows you what you actually made.

---

## Technical Architecture

```
Next.js Frontend (Vercel)
       ↕ REST + WebSocket
Fastify API + Node.js Keeper (Render)
       ↕ Supabase Realtime
Supabase PostgreSQL (5 tables, time-series pool snapshots)
       ↕ Stellar RPC
Soroban Smart Contracts (Stellar Testnet → Mainnet)
  ├── Vault Contract — deposit, withdraw, harvest, dfToken shares
  └── StableSwap AMM — USDC/EURC Safe Mode pool, 0.04% fee, A=100
```

**Key technical decisions:**
- **StableSwap invariant (A=100)** for the native AMM — not constant-sum (which drains to zero on depeg). Referenced Aquarius open-source implementation.
- **Soroban C2C atomic execution** — single-asset deposit does swap + LP in one transaction. Any failure = full revert. User funds never at partial-execution risk.
- **Keeper key isolation** — keeper keypair allowlisted at contract level to call `harvest()` only. Cannot withdraw user funds even if compromised.
- **Deterministic NEY** — IL formula uses Stellar's fixed 30bps fee and public Horizon pool reserve data. No oracle dependency.

---

## $0 Infrastructure

| Layer | Tool | Cost |
|-------|------|------|
| Frontend | Next.js + Vercel | Free |
| API + Keeper | Node.js + Render | Free |
| Database | Supabase | Free |
| Stellar RPC | SDF Public | Free |
| Notifications | Telegram Bot API | Free |
| CI/CD | GitHub Actions | Free |
| **Total** | | **$0/month** |

---

## Live Links

- **Mainnet App:** https://rawstellar.vercel.app
- **GitHub:** https://github.com/rue19/raws-protocol
- **API:** https://raws-api.onrender.com
- **Vault Contract:** `CALAEFXRQCI4KQH7QSUAEB6ABIR62VWSJXOT3PSN4ZUQ5UKOPEIGKG5V` (Stellar Mainnet)
- **AMM Contract:** `CCYLFR7CBMKDVSE5UPIT52UIE6SEARRXMJTXJ4TFNFIMC7EBVWM6XSKV` (Stellar Mainnet)

---

## Test Results (Phase 9)

| Category | Result |
|----------|--------|
| Frontend TypeScript | 0 errors |
| Keeper TypeScript | 0 errors |
| Rust Vault Tests | 31/31 passing |
| Rust AMM Tests | 12/12 passing |
| On-chain Security | 4/4 passing (keeper isolation, cross-user, auth) |
| IL Watchdog | 3/3 passing (alert fires at RED×3, not at RED×2, dismiss works) |
| Multi-user Isolation | 2/2 passing (positions + alerts scoped per user) |
| WebSocket Validation | 2/2 passing (invalid address + SQL injection rejected) |
| Brand Consistency | All hex values correct, zero Tailwind defaults |

---

## What's Next (Post-Buildathon)

- Mainnet deploy with community audit
- Keeper key replaced with 3-of-5 multisig
- Cross-pool rebalancing (auto-move between Aquarius/Soroswap/Phoenix)
- Mobile PWA via the Stellar Wallets Kit deep-link support
