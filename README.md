# RAW$

> The naked truth about your yield.

RAW$ is a Stellar-native yield optimizer vault that shows you your **actual** profit
after impermanent loss — not a fake APY number. Deposit a single token, and RAW$
automatically splits it, LPs across Aquarius/Soroswap/Phoenix, auto-compounds your
rewards, and alerts you when a pool starts losing money.

## Why RAW$

Every yield optimizer shows you APY. None of them subtract impermanent loss. RAW$ does.

## Architecture

```
Client (Next.js / Vercel)
     ↕ REST + WebSocket
App API + Keeper (Node.js / Render)
     ↕ Supabase Realtime
Database (Supabase PostgreSQL)
     ↕ Stellar RPC
Soroban Smart Contracts (Stellar Testnet)
```

The off-chain keeper is the brain of the protocol — it monitors pool health every 30 minutes, auto-compounds rewards every 4 hours, and fires smart-exit alerts when impermanent loss exceeds safe thresholds.

## Monorepo Structure

| Folder | Contents |
|--------|----------|
| `/contracts` | Soroban/Rust smart contracts (vault + AMM) |
| `/frontend` | Next.js TypeScript frontend |
| `/keeper` | Off-chain Node.js keeper (Horizon polling, IL watchdog, auto-compound) |

## Tech Stack — $0 Infrastructure

| Layer | Tool | Cost |
|-------|------|------|
| Frontend | Next.js + Vercel | Free |
| API/Keeper | Node.js + Render | Free |
| Database | Supabase | Free |
| Contracts | Soroban + Stellar RPC | Free |
| Notifications | Telegram Bot API | Free |

## Local Setup

### Prerequisites
- Rust + `wasm32-unknown-unknown` target
- Stellar CLI (`cargo install --locked stellar-cli`)
- Node.js 20+

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/raws-protocol
cd raws-protocol

npm install    # root workspace (if configured)
cd frontend && npm install
```

### 2. Configure environment

**Frontend:**
```bash
cp frontend/.env.local.example frontend/.env.local
# Fill in your Stellar keypairs and contract addresses
```

**Keeper:**
```bash
cp keeper/.env.example keeper/.env
# Fill in Stellar RPC, Supabase credentials, keeper keypair
```

### 3. Deploy contracts to testnet
```bash
cd contracts
stellar keys generate raws-deployer --network testnet
stellar keys fund raws-deployer --network testnet
cargo build --target wasm32-unknown-unknown --release
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/raws_vault.wasm \
  --source raws-deployer \
  --network testnet
```

### 4. Run locally

**Frontend:**
```bash
cd frontend && npm run dev
```

**Keeper (requires .env with valid credentials):**
```bash
cd keeper && npm run dev
```

## Build Roadmap

| Step | Milestone | Status |
|------|-----------|--------|
| 1 | Project Setup & Environment | Done |
| 2 | Core Vault Contract (20 tests) | Done |
| 3 | Single-Asset Deposit Router (11 tests) | Done |
| 4 | Native StableSwap AMM (12 tests) | Done |
| 5 | Off-Chain Keeper & IL Watchdog | Done (21 tests) |
| 6 | Backend API | |
| 7 | Frontend Wallet & Deposit UI | |
| 8 | Frontend Dashboard & Alerts | |
| 9 | Testing & Polish | |
| 10 | Mainnet Deploy & Submission | |

## Smart Contracts

| Contract | Testnet Address |
|----------|----------------|
| Vault | CC4LKQ5BIVLIBC6ZCJIZPBVLD7JRXQKGT7IL6UM7QDHBDTVGYNBV6IQ3 |
| AMM (StableSwap) | CDTNHVUFYEZXZX3UNFF7C3SGOUBOEQA2HMQJ6YLYUPEXH35Y6VGT7IKR |

## Testnet Token Addresses

| Token | Address |
|-------|---------|
| USDC | CBT5F2FSLHR4JERVHBIIQXQLONE4HZ5E4KC7W7NTR5NGPSH6KQ4AX4Y7 |
| EURC | (add after testnet deployment) |
| XLM (wrapped) | CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC |

## Soroswap Integration

| Contract | Testnet Address |
|----------|----------------|
| Soroswap Router | CDGHOS7DDZ7DB24J7TMFDEAIR7LS7GLMT5J5KEZMUF6MSX5BFHCXQIB3 |

## RAW$ StableSwap AMM

Phase 4 introduces RAW$'s own on-chain StableSwap AMM — a two-token pool (USDC/EURC) using the Curve StableSwap invariant.

### Key Parameters
| Parameter | Value |
|-----------|-------|
| Amplification (A) | 100 |
| Swap Fee | 0.04% (4 bps) |
| Tokens | USDC / EURC (both 6 decimals) |
| Math | All i128, Newton's method |

### Contract Functions
| Function | Description |
|----------|-------------|
| `init()` | Deploy pool with mandatory initial deposit (inflation attack guard) |
| `exchange()` | Swap token A ↔ B with slippage guard |
| `add_liquidity()` | Deposit both tokens, receive LP shares |
| `remove_liquidity()` | Burn LP shares, receive proportional tokens |
| `get_balances()` | Read pool reserves |
| `get_total_shares()` | Read total LP supply |
| `get_user_shares()` | Read user LP balance |

### Test Coverage (12 tests)
- `get_d()` — balanced pool, empty pool, invariant preservation
- `get_y()` — output never exceeds balance
- Slippage near peg (A=100 keeps <0.1%)
- Depeg scenarios — graceful degradation, pool never drains
- `add_liquidity()` — proportional share minting
- `remove_liquidity()` — proportional withdrawal
- Fee accrual — LPs earn from swap fees
- Invalid token panic, ANN==400 constant check

## RAW$ Keeper (Phase 5)

The off-chain keeper is a Node.js service deployed on Render that monitors the vault and AMM pools.

### Scheduled Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| `watchdog` | Every 30 min | Polls Horizon for pool reserves & fees, computes IL, classifies pool health (GREEN/YELLOW/RED/RED_CRITICAL), upserts to `pool_snapshots` |
| `harvester` | Every 4 hours | Queries Aquarius for pending rewards, calls vault `harvest()` via the authorized keeper keypair, logs to `compound_log` |

### IL Classifier (Deterministic — No AI)

- **GREEN** — Net Effective Yield (NEY) > 0 (fees > IL)
- **YELLOW** — NEY between 0 and threshold (-10%)
- **RED** — NEY below threshold
- **RED_CRITICAL** — 3 consecutive RED periods → triggers `SMART_EXIT` alert

### Key Design Rules

1. **Off-chain observes, on-chain executes** — keeper never holds user funds
2. **Keeper keypair is restricted** — only authorized for `harvest()` on-chain
3. **Idempotent** — all cron jobs safe to run twice without double-effects
4. **No partial trust in DB** — Supabase is a performance cache; keeper logs & retries if down

## Built for Stellar Buildathon 2026

RAW$ · Real yield or nothing.
