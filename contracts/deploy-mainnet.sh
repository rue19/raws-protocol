#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RAW$ Protocol — Mainnet Deployment Script
# ============================================================
#
# Usage:
#   ./deploy-mainnet.sh              Run full deployment
#   ./deploy-mainnet.sh --resume     Resume from last successful step
#   ./deploy-mainnet.sh --status     Show current deployment state
#   ./deploy-mainnet.sh --dry-run    Print commands without executing
#
# Setup:
#   1. Copy deploy-mainnet.env.example to deploy-mainnet.env
#   2. Fill in all required values
#   3. source deploy-mainnet.env && ./deploy-mainnet.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="${SCRIPT_DIR}/deploy-state.json"
LOG_FILE="${SCRIPT_DIR}/deploy-$(date -u +%Y%m%dT%H%M%SZ).log"

NETWORK="mainnet"
RPC_URL="https://mainnet.stellar.org/soroban/rpc"
PASSPHRASE="Public Global Stellar Network ; September 2015"
WASM_DIR="${SCRIPT_DIR}/target/wasm32-unknown-unknown/release"

DRY_RUN=false
RESUME=false
STATUS_ONLY=false

# --- Parse flags ---
for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --resume)   RESUME=true ;;
    --status)   STATUS_ONLY=true ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--resume] [--status]"
      exit 0
      ;;
  esac
done

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${CYAN}[$(date -u +%H:%M:%S)]${NC} $*" | tee -a "$LOG_FILE"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*" | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*" | tee -a "$LOG_FILE"; exit 1; }

# --- State management ---
state_done() {
  local step="$1"
  if [[ -f "$STATE_FILE" ]]; then
    grep -q "\"step_${step}\"" "$STATE_FILE" 2>/dev/null && return 0
  fi
  return 1
}

state_save() {
  local step="$1" result="$2"
  local tmp
  if [[ -f "$STATE_FILE" ]]; then
    tmp=$(cat "$STATE_FILE")
  else
    tmp="{}"
  fi
  echo "$tmp" | python3 -c "
import sys, json
d = json.load(sys.stdin)
d['step_${step}'] = {'status': 'done', 'result': '''${result}''', 'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'}
json.dump(d, sys.stdout, indent=2)
" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
}

state_get() {
  local step="$1"
  if [[ -f "$STATE_FILE" ]]; then
    python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('step_${step}', {}).get('result', ''))
" < "$STATE_FILE" 2>/dev/null
  fi
}

run_cmd() {
  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $*"
    return 0
  fi
  eval "$@" 2>&1 | tee -a "$LOG_FILE"
}

skip_or_run() {
  local step="$1"
  local desc="$2"
  local cmd="$3"

  if state_done "$step" && $RESUME; then
    local prev_result
    prev_result=$(state_get "$step")
    ok "Step ${step}: ${desc} (already done: ${prev_result})"
    echo "$prev_result"
    return 0
  fi

  log "Step ${step}: ${desc}"
  local output
  output=$(eval "$cmd" 2>&1)
  echo "$output" | tee -a "$LOG_FILE"

  local exit_code=${PIPESTATUS[0]}
  if [[ $exit_code -ne 0 ]]; then
    fail "Step ${step} failed with exit code ${exit_code}"
  fi

  state_save "$step" "$output"
  echo "$output"
}

# --- Validate environment ---
validate_env() {
  local required=(
    DEPLOYER_SECRET_KEY
    ADMIN_ADDRESS
    KEEPER_ADDRESS
    SOROSWAP_ROUTER_ADDRESS
    WRAPPED_XLM_ADDRESS
    USDC_ADDRESS
    AQUA_TOKEN_ADDRESS
  )
  local missing=()
  for var in "${required[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      missing+=("$var")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    fail "Missing required env vars: ${missing[*]}\n  Copy deploy-mainnet.env.example to deploy-mainnet.env and fill in values."
  fi
}

confirm_immutable() {
  local fn="$1"
  local params="$2"
  echo ""
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}WARNING: IMMUTABLE CALL AHEAD${NC}"
  echo -e "${RED}This call CANNOT be undone.${NC}"
  echo -e "${RED}========================================${NC}"
  echo "  Contract: $3"
  echo "  Function: $fn"
  echo "  Parameters: $params"
  echo -e "${RED}========================================${NC}"
  read -p "Type 'YES-IMMUTABLE' to proceed: " confirmation
  if [[ "$confirmation" != "YES-IMMUTABLE" ]]; then
    echo "Aborted by user."
    exit 1
  fi
}

# --- Status ---
if $STATUS_ONLY; then
  if [[ -f "$STATE_FILE" ]]; then
    echo "=== Deployment State ==="
    python3 -c "
import json
with open('$STATE_FILE') as f:
    d = json.load(f)
steps = {
    1: 'Build WASM',
    2: 'Optimize WASM',
    3: 'Deploy Vault',
    4: 'Verify Vault',
    5: 'Deploy AMM',
    6: 'Verify AMM',
    7: 'Initialize Vault',
    8: 'Set Soroswap Router (IMMUTABLE)',
    9: 'Set AMM Address (IMMUTABLE)',
    10: 'Initialize AMM',
    11: 'Extend TTL',
    12: 'Update addresses',
}
for i, desc in steps.items():
    key = f'step_{i}'
    if key in d and d[key].get('status') == 'done':
        print(f'  [DONE] Step {i}: {desc}')
        if d[key].get('result'):
            r = d[key]['result'].strip().split('\n')[-1][:80]
            print(f'         -> {r}')
    else:
        print(f'  [TODO] Step {i}: {desc}')
"
  else
    echo "No deployment state found. Run the full deployment first."
  fi
  exit 0
fi

# ============================================================
# MAIN DEPLOYMENT
# ============================================================

log "=========================================="
log "RAW$ Mainnet Deployment — Starting"
log "=========================================="
validate_env

VAULT_CONTRACT_ID=""
AMM_CONTRACT_ID=""

# --- Step 1: Build WASM ---
if ! state_done 1 || ! $RESUME; then
  log "Step 1: Building contracts..."
  run_cmd "cd '${SCRIPT_DIR}' && cargo build --target wasm32-unknown-unknown --release"
  state_save 1 "build_complete"
  ok "Step 1: WASM built"
else
  ok "Step 1: Already built (resume)"
fi

# --- Step 2: Optimize WASM ---
if ! state_done 2 || ! $RESUME; then
  log "Step 2: Optimizing WASM..."
  run_cmd "cd '${SCRIPT_DIR}' && stellar contract optimize --wasm '${WASM_DIR}/raws_vault.wasm'"
  run_cmd "cd '${SCRIPT_DIR}' && stellar contract optimize --wasm '${WASM_DIR}/raws_amm.wasm'"
  local vault_size
  vault_size=$(wc -c < "${WASM_DIR}/raws_vault.optimized.wasm")
  amm_size=$(wc -c < "${WASM_DIR}/raws_amm.optimized.wasm")
  log "  Vault WASM: ${vault_size} bytes"
  log "  AMM WASM: ${amm_size} bytes"
  state_save 2 "vault=${vault_size}B,amm=${amm_size}B"
  ok "Step 2: WASM optimized"
else
  ok "Step 2: Already optimized (resume)"
fi

# --- Step 3: Deploy Vault ---
if ! state_done 3 || ! $RESUME; then
  VAULT_CONTRACT_ID=$(skip_or_run 3 "Deploy Vault" \
    "cd '${SCRIPT_DIR}' && stellar contract deploy --wasm '${WASM_DIR}/raws_vault.optimized.wasm' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK}")
  VAULT_CONTRACT_ID=$(echo "$VAULT_CONTRACT_ID" | grep -oP 'C[A-Z0-9]{55}' | head -1)
  if [[ -z "$VAULT_CONTRACT_ID" ]]; then
    fail "Step 3: Could not extract vault contract ID"
  fi
  state_save 3 "$VAULT_CONTRACT_ID"
  ok "Step 3: Vault deployed: $VAULT_CONTRACT_ID"
else
  VAULT_CONTRACT_ID=$(state_get 3)
  ok "Step 3: Vault already deployed: $VAULT_CONTRACT_ID"
fi

# --- Step 4: Verify Vault ---
if ! state_done 4 || ! $RESUME; then
  log "Step 4: Verifying vault..."
  local version
  version=$(run_cmd "cd '${SCRIPT_DIR}' && stellar contract invoke --id '${VAULT_CONTRACT_ID}' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} -- version")
  if echo "$version" | grep -q "1"; then
    state_save 4 "version=1"
    ok "Step 4: Vault verified"
  else
    fail "Step 4: Vault verification failed"
  fi
else
  ok "Step 4: Already verified (resume)"
fi

# --- Step 5: Deploy AMM ---
if ! state_done 5 || ! $RESUME; then
  AMM_CONTRACT_ID=$(skip_or_run 5 "Deploy AMM" \
    "cd '${SCRIPT_DIR}' && stellar contract deploy --wasm '${WASM_DIR}/raws_amm.optimized.wasm' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK}")
  AMM_CONTRACT_ID=$(echo "$AMM_CONTRACT_ID" | grep -oP 'C[A-Z0-9]{55}' | head -1)
  if [[ -z "$AMM_CONTRACT_ID" ]]; then
    fail "Step 5: Could not extract AMM contract ID"
  fi
  state_save 5 "$AMM_CONTRACT_ID"
  ok "Step 5: AMM deployed: $AMM_CONTRACT_ID"
else
  AMM_CONTRACT_ID=$(state_get 5)
  ok "Step 5: Already deployed: $AMM_CONTRACT_ID"
fi

# --- Step 6: Verify AMM ---
if ! state_done 6 || ! $RESUME; then
  log "Step 6: Verifying AMM (should error with not initialized)..."
  run_cmd "cd '${SCRIPT_DIR}' && stellar contract invoke --id '${AMM_CONTRACT_ID}' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} -- get_token_a" || true
  state_save 6 "live"
  ok "Step 6: AMM is live"
else
  ok "Step 6: Already verified (resume)"
fi

# --- Step 7: Initialize Vault ---
if ! state_done 7 || ! $RESUME; then
  confirm_immutable "initialize" "admin=${ADMIN_ADDRESS}, keeper=${KEEPER_ADDRESS}, mode=SafeMode" "$VAULT_CONTRACT_ID"
  skip_or_run 7 "Initialize Vault" \
    "cd '${SCRIPT_DIR}' && stellar contract invoke --id '${VAULT_CONTRACT_ID}' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} -- initialize --admin '${ADMIN_ADDRESS}' --keeper '${KEEPER_ADDRESS}' --mode SafeMode"
  ok "Step 7: Vault initialized"
else
  ok "Step 7: Already initialized (resume)"
fi

# --- Step 8: Set Soroswap Router (IMMUTABLE) ---
if ! state_done 8 || ! $RESUME; then
  confirm_immutable "set_soroswap_router" "router=${SOROSWAP_ROUTER_ADDRESS}" "$VAULT_CONTRACT_ID"
  skip_or_run 8 "Set Soroswap Router" \
    "cd '${SCRIPT_DIR}' && stellar contract invoke --id '${VAULT_CONTRACT_ID}' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} -- set_soroswap_router --caller '${ADMIN_ADDRESS}' --router '${SOROSWAP_ROUTER_ADDRESS}'"
  ok "Step 8: Soroswap router set (IMMUTABLE)"
else
  ok "Step 8: Already set (resume)"
fi

# --- Step 9: Set AMM Address (IMMUTABLE) ---
if ! state_done 9 || ! $RESUME; then
  confirm_immutable "set_amm_address" "amm=${AMM_CONTRACT_ID}" "$VAULT_CONTRACT_ID"
  skip_or_run 9 "Set AMM Address" \
    "cd '${SCRIPT_DIR}' && stellar contract invoke --id '${VAULT_CONTRACT_ID}' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} -- set_amm_address --caller '${ADMIN_ADDRESS}' --amm '${AMM_CONTRACT_ID}'"
  ok "Step 9: AMM address set (IMMUTABLE)"
else
  ok "Step 9: Already set (resume)"
fi

# --- Step 10: Initialize AMM ---
if ! state_done 10 || ! $RESUME; then
  log "Checking admin token balances..."
  local usdc_bal xlm_bal
  usdc_bal=$(run_cmd "curl -s 'https://horizon.stellar.org/accounts/${ADMIN_ADDRESS}' | python3 -c \"import sys,json; d=json.load(sys.stdin); print([b['balance'] for b in d['balances'] if b.get('asset_code')=='USDC'][0])\"" 2>/dev/null || echo "0")
  xlm_bal=$(run_cmd "curl -s 'https://horizon.stellar.org/accounts/${ADMIN_ADDRESS}' | python3 -c \"import sys,json; d=json.load(sys.stdin); print([b['balance'] for b in d['balances'] if b.get('asset_type')=='native'][0])\"" 2>/dev/null || echo "0")
  log "  USDC balance: ${usdc_bal}"
  log "  XLM balance: ${xlm_bal}"

  local usdc_whole xlm_whole
  usdc_whole=$(echo "$usdc_bal" | cut -d. -f1)
  xlm_whole=$(echo "$xlm_bal" | cut -d. -f1)
  if [[ "${usdc_whole:-0}" -lt 1 ]] || [[ "${xlm_whole:-0}" -lt 1 ]]; then
    fail "Step 10: Admin needs at least 1 USDC and 1 XLM for AMM seed liquidity"
  fi

  confirm_immutable "init" "token_a=${USDC_ADDRESS}, token_b=${WRAPPED_XLM_ADDRESS}, initial_a=5000000, initial_b=5000000" "$AMM_CONTRACT_ID"
  skip_or_run 10 "Initialize AMM" \
    "cd '${SCRIPT_DIR}' && stellar contract invoke --id '${AMM_CONTRACT_ID}' --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} -- init --token_a '${USDC_ADDRESS}' --token_b '${WRAPPED_XLM_ADDRESS}' --initial_a 5000000 --initial_b 5000000 --admin '${ADMIN_ADDRESS}'"
  ok "Step 10: AMM initialized"
else
  ok "Step 10: Already initialized (resume)"
fi

# --- Step 11: Extend TTL ---
if ! state_done 11 || ! $RESUME; then
  log "Step 11: Extending contract TTL to prevent archival..."
  WASM_HASH_VAULT=$(run_cmd "cd '${SCRIPT_DIR}' && stellar contract info hash --contract-id '${VAULT_CONTRACT_ID}' --network ${NETWORK}" | tail -1)
  WASM_HASH_AMM=$(run_cmd "cd '${SCRIPT_DIR}' && stellar contract info hash --contract-id '${AMM_CONTRACT_ID}' --network ${NETWORK}" | tail -1)

  run_cmd "cd '${SCRIPT_DIR}' && stellar contract extend --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} --id '${VAULT_CONTRACT_ID}' --ledgers-to-extend 535679 --durability persistent"
  run_cmd "cd '${SCRIPT_DIR}' && stellar contract extend --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} --id '${AMM_CONTRACT_ID}' --ledgers-to-extend 535679 --durability persistent"
  run_cmd "cd '${SCRIPT_DIR}' && stellar contract extend --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} --wasm-hash '${WASM_HASH_VAULT}' --ledgers-to-extend 535679 --durability persistent"
  run_cmd "cd '${SCRIPT_DIR}' && stellar contract extend --source '${DEPLOYER_SECRET_KEY}' --network ${NETWORK} --wasm-hash '${WASM_HASH_AMM}' --ledgers-to-extend 535679 --durability persistent"

  state_save 11 "ttl_extended"
  ok "Step 11: TTL extended (~30 days)"
else
  ok "Step 11: Already extended (resume)"
fi

# --- Step 12: Summary ---
log "=========================================="
log "RAW$ Mainnet Deployment — COMPLETE"
log "=========================================="
log ""
log "Contract Addresses:"
log "  Vault:  ${VAULT_CONTRACT_ID}"
log "  AMM:    ${AMM_CONTRACT_ID}"
log ""
log "Admin:    ${ADMIN_ADDRESS}"
log "Keeper:   ${KEEPER_ADDRESS}"
log ""
log "Next steps:"
log "  1. Update MAINNET_ADDRESSES.md with these addresses"
log "  2. Update keeper/.env for mainnet"
log "  3. Update Render environment variables"
log "  4. Update frontend/.env.local for mainnet"
log "  5. Update Vercel environment variables"
log "  6. Execute 1 XLM smoke test deposit"
log ""
log "Full log saved to: ${LOG_FILE}"
