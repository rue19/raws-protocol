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

## Monorepo Structure

| Folder | Contents |
|--------|----------|
| `/contracts` | Soroban/Rust smart contracts (vault) |
| `/frontend` | Next.js TypeScript frontend |

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
- Node.js 18+

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/raws-protocol
cd raws-protocol

cd frontend && npm install
```

### 2. Configure environment
```bash
cp frontend/.env.local.example frontend/.env.local
# Fill in your Stellar keypairs and contract addresses
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
# Frontend
cd frontend && npm run dev
```

## Build Roadmap

| Step | Milestone | Status |
|------|-----------|--------|
| 1 | Project Setup & Environment | Done |
| 2 | Core Vault Contract (20 tests) | Done |
| 3 | Single-Asset Deposit Router (11 tests) | Done |
| 4 | Native StableSwap AMM | |
| 5 | Off-Chain Keeper & IL Watchdog | |
| 6 | Backend API | |
| 7 | Frontend Wallet & Deposit UI | |
| 8 | Frontend Dashboard & Alerts | |
| 9 | Testing & Polish | |
| 10 | Mainnet Deploy & Submission | |

## Smart Contracts

| Contract | Testnet Address |
|----------|----------------|
| Vault | CC4LKQ5BIVLIBC6ZCJIZPBVLD7JRXQKGT7IL6UM7QDHBDTVGYNBV6IQ3 |

## Testnet Token Addresses

| Token | Address |
|-------|---------|
| USDC | CBT5F2FSLHR4JERVHBIIQXQLONE4HZ5E4KC7W7NTR5NGPSH6KQ4AX4Y7 |
| XLM (wrapped) | CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC |

## Soroswap Integration

| Contract | Testnet Address |
|----------|----------------|
| Soroswap Router | CDGHOS7DDZ7DB24J7TMFDEAIR7LS7GLMT5J5KEZMUF6MSX5BFHCXQIB3 |

## Built for Stellar Buildathon 2026

RAW$ · Real yield or nothing.
