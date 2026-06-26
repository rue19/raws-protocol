# RAW$

> The naked truth about your yield.

RAW$ is a Stellar-native DeFi yield optimizer. Deposit a single token — RAW$
automatically splits it, provides liquidity across Aquarius, Soroswap, and Phoenix,
auto-compounds your rewards every 4 hours, and shows your **Net Effective Yield**
(fees earned minus impermanent loss) — a metric no existing Stellar protocol offers.

## Live

| Resource | Link |
|----------|------|
| App | https://frontend-beta-rouge-rgheunscve.vercel.app |
| API | https://raws-api.onrender.com |
| GitHub | https://github.com/rue19/raws-protocol |

## Smart Contracts (Stellar Mainnet)

| Contract | Address | Explorer |
|----------|---------|---------|
| Vault | `<MAINNET_VAULT_CONTRACT_ID>` | [View on Stellar Expert](https://stellar.expert/explorer/public/contract/<MAINNET_VAULT_CONTRACT_ID>) |
| StableSwap AMM | `<MAINNET_AMM_CONTRACT_ID>` | [View on Stellar Expert](https://stellar.expert/explorer/public/contract/<MAINNET_AMM_CONTRACT_ID>) |

## Architecture

```
Next.js Frontend (Vercel)
       ↕ REST + WebSocket
Fastify API + Node.js Keeper (Render)
       ↕ Supabase Realtime
Supabase PostgreSQL
       ↕ Soroban RPC
Soroban Smart Contracts (Stellar Mainnet)
  ├── Vault — deposit, withdraw, harvest, dfToken shares
  └── StableSwap AMM — USDC/EURC Safe Mode pool, A=100, 0.04% fee
```

## How It Works

### Single-Asset Deposit (one click)
1. You deposit any single token (e.g. XLM)
2. Vault calculates the optimal split ratio from pool reserves
3. Contract-to-contract call: Vault → Soroswap router (swap half to the pair token)
4. Contract-to-contract call: Vault → target pool add_liquidity
5. dfTokens minted to your address, representing your share
6. All atomic — if any step fails, your funds are returned in full

### Net Effective Yield
NEY = swap fee revenue − impermanent loss

Shown live on your dashboard. Updated every 30 minutes by the keeper watchdog.
No competitor shows this number.

### Auto-Compound
Every 4 hours, the keeper harvests AQUA rewards and reinvests them.
At Stellar's $0.00015 tx fee, this is economically positive at any deposit size.

### Pool Health Alerts
If a pool's NEY is negative for 3 consecutive 30-minute periods (90 minutes),
you receive a Telegram notification + in-app alert with a one-click exit to a
better pool.

## Real Yield vs Emission Yield
The dashboard separates:
- **Real Yield** — from actual swap fees. Sustainable indefinitely.
- **Emission Yield** — from AQUA incentives. Ends when the program ends.

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

## Technical Stack

- **Smart Contracts:** Rust + Soroban SDK v22 + Stellar CLI
- **AMM:** StableSwap invariant (Curve-style, A=100) — not constant-sum
- **Frontend:** Next.js 16 + TypeScript + Tailwind v4 + Zustand + Recharts
- **Wallet:** Stellar Wallets Kit (Freighter, xBull, LOBSTR)
- **API:** Fastify v4 + TypeScript + WebSocket (live position updates)
- **Database:** Supabase (Postgres + Realtime subscriptions)
- **Keeper:** Node.js daemon + node-cron (watchdog + auto-compound)

## Local Development

### Prerequisites
- Rust + `wasm32-unknown-unknown` target
- Stellar CLI (`cargo install --locked stellar-cli --features opt`)
- Node.js >= 22

### Setup
```bash
git clone https://github.com/rue19/raws-protocol
cd raws-protocol

# Frontend
cd frontend && npm install
cp .env.local.example .env.local  # fill in your values

# Keeper
cd ../keeper && npm install
cp .env.example .env  # fill in your values
```

### Run locally
```bash
# Terminal 1 — Frontend
cd frontend && npm run dev  # http://localhost:3000

# Terminal 2 — API + Keeper
cd keeper && npm run dev    # http://localhost:3001
```

## Security

- **Keeper key isolation:** Keeper keypair is allowlisted at contract level to call
  `harvest()` only. Cannot withdraw user funds even if compromised.
- **Atomic revert:** All C2C calls have `min_out` slippage guards. Any failure
  reverts the entire transaction. Funds never at partial-execution risk.
- **No governance token:** No compliance surface. No emission schedule to manage.
- **Open source:** All contract code auditable on GitHub.

## Built for Stellar Builders Program 2026

RAW$ — Real yield or nothing.
