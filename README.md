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
Soroban Smart Contracts (Stellar Mainnet)
```

## Monorepo Structure

| Folder | Contents |
|--------|----------|
| `/contracts` | Soroban/Rust smart contracts (vault + AMM) |
| `/frontend` | Next.js 14 TypeScript frontend |
| `/keeper` | Node.js keeper daemon + Fastify REST API |

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
- Stellar CLI (`cargo install --locked stellar-cli --features opt`)
- Node.js 18+

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/raws-protocol
cd raws-protocol

cd frontend && npm install
cd ../keeper && npm install
```

### 2. Configure environment
```bash
cp frontend/.env.local.example frontend/.env.local
cp keeper/.env.example keeper/.env
# Fill in your Supabase keys and Stellar keypairs
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
```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Keeper
cd keeper && npx tsx src/index.ts
```

## Build Roadmap

| Step | Milestone | Status |
|------|-----------|--------|
| 1 | Project Setup & Environment | Done |
| 2 | Core Vault Contract (20 tests) | Done |
| 3 | Single-Asset Deposit Router (11 tests) | Done |
| 4 | Native StableSwap AMM (40 tests) | Done |
| 5 | Off-Chain Keeper & IL Watchdog | Done |
| 6 | Backend API | |
| 7 | Frontend Wallet & Deposit UI | |
| 8 | Frontend Dashboard & Alerts | |
| 9 | Testing & Polish | |
| 10 | Mainnet Deploy & Submission | |

## Smart Contracts

| Contract | Testnet Address |
|----------|----------------|
| Vault | CC4LKQ5BIVLIBC6ZCJIZPBVLD7JRXQKGT7IL6UM7QDHBDTVGYNBV6IQ3 |
| StableSwap AMM | CDTNHVUFYEZXZX3UNFF7C3SGOUBOEQA2HMQJ6YLYUPEXH35Y6VGT7IKR |

## Built for Stellar Builders Program 2026

RAW$ · Real yield or nothing.
