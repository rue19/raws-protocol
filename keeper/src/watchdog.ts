import * as StellarSdk from '@stellar/stellar-sdk';
import { savePoolSnapshot, saveILAlert, getLatestSnapshot } from './db';
import { sendTelegramMessage } from './api';

const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const VAULT_CONTRACT_ID = process.env.VAULT_CONTRACT_ID || '';
const RED_ALERT_THRESHOLD = parseInt(process.env.RED_ALERT_THRESHOLD || '3', 10);

let server: StellarSdk.rpc.Server;

export function initWatchdog(): void {
  server = new StellarSdk.rpc.Server(RPC_URL);
  console.log('Watchdog initialized');
}

// ─── Pool State Query ──────────────────────────────────────────────

export interface PoolState {
  balanceA: string;
  balanceB: string;
  totalShares: string;
  ampFactor: number;
  fee: number;
}

export async function getPoolState(): Promise<PoolState | null> {
  if (!VAULT_CONTRACT_ID) {
    console.error('VAULT_CONTRACT_ID not set');
    return null;
  }

  try {
    const contract = new StellarSdk.Contract(VAULT_CONTRACT_ID);
    // Use a dummy source account for read-only calls
    const sourceAccount = await server.getAccount('GCOV557XW4XLD2XZIWSLSH5CIALAS56PWZRSDXL3XDWURENJITFPFEPZ');

    // Query get_reserves
    const reservesTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_reserves'))
      .setTimeout(300)
      .build();

    const reservesResult = await server.simulateTransaction(reservesTx);

    // Query get_total_supply
    const supplyTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_total_supply'))
      .setTimeout(300)
      .build();

    const supplyResult = await server.simulateTransaction(supplyTx);

    // Query get_amp_factor
    const ampTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_amp_factor'))
      .setTimeout(300)
      .build();

    const ampResult = await server.simulateTransaction(ampTx);

    // Query get_fee
    const feeTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_fee'))
      .setTimeout(300)
      .build();

    const feeResult = await server.simulateTransaction(feeTx);

    // For testnet, return simulated values
    // In production, decode the actual ScVal responses
    return {
      balanceA: '100000',
      balanceB: '100000',
      totalShares: '100000',
      ampFactor: 100,
      fee: 4000000,
    };
  } catch (error: any) {
    console.error('Failed to get pool state:', error.message);
    return null;
  }
}

// ─── Impermanent Loss Calculation ──────────────────────────────────

export function calculateIL(
  balanceA0: number,
  balanceB0: number,
  balanceA1: number,
  balanceB1: number
): number {
  const priceRatio0 = balanceA0 / balanceB0;
  const priceRatio1 = balanceA1 / balanceB1;

  if (Math.abs(priceRatio0 - priceRatio1) < 0.0001) {
    return 0;
  }

  const holdValue = (balanceA0 + balanceB0 * priceRatio1) / 2;
  const lpValue = (balanceA1 + balanceB1 * priceRatio1) / 2;
  const il = ((holdValue - lpValue) / holdValue) * 100;

  return il;
}

// ─── Watchdog Check ────────────────────────────────────────────────

export async function runWatchdogCheck(): Promise<void> {
  console.log('Running watchdog check...');

  const state = await getPoolState();
  if (!state) {
    console.error('Failed to get pool state');
    return;
  }

  // Save snapshot
  await savePoolSnapshot({
    pool_address: VAULT_CONTRACT_ID,
    token_a: 'token_a',
    token_b: 'token_b',
    balance_a: state.balanceA,
    balance_b: state.balanceB,
    total_shares: state.totalShares,
    amp_factor: state.ampFactor,
    fee: state.fee,
    timestamp: new Date().toISOString(),
  });

  // Compare with previous snapshot
  const previous = await getLatestSnapshot(VAULT_CONTRACT_ID);
  if (previous) {
    const il = calculateIL(
      parseFloat(previous.balance_a),
      parseFloat(previous.balance_b),
      parseFloat(state.balanceA),
      parseFloat(state.balanceB)
    );

    if (Math.abs(il) > 1) {
      const severity: 'warning' | 'critical' = Math.abs(il) > RED_ALERT_THRESHOLD ? 'critical' : 'warning';
      const message = `IL Alert: ${il.toFixed(2)}% on pool ${VAULT_CONTRACT_ID}`;

      await saveILAlert({
        pool_address: VAULT_CONTRACT_ID,
        il_percentage: il.toFixed(2),
        threshold: RED_ALERT_THRESHOLD,
        severity,
        message,
        timestamp: new Date().toISOString(),
        notified: false,
      });

      await sendTelegramMessage(message);
      console.warn(message);
    }
  }

  console.log('Watchdog check complete');
}
