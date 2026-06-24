import * as StellarSdk from '@stellar/stellar-sdk';
import { saveCompoundEvent } from './db';

const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const VAULT_CONTRACT_ID = process.env.VAULT_CONTRACT_ID || '';
const KEEPER_SECRET_KEY = process.env.KEEPER_SECRET_KEY || '';

let server: StellarSdk.rpc.Server;
let keeperKeypair: StellarSdk.Keypair;

export function initHarvester(): void {
  if (!KEEPER_SECRET_KEY) {
    console.warn('KEEPER_SECRET_KEY not set — harvest disabled');
    return;
  }
  server = new StellarSdk.rpc.Server(RPC_URL);
  keeperKeypair = StellarSdk.Keypair.fromSecret(KEEPER_SECRET_KEY);
  console.log(`Harvester initialized — keeper: ${keeperKeypair.publicKey()}`);
}

export async function harvest(
  lpTokenAddress: string,
  rewardAmount: number
): Promise<string | null> {
  if (!VAULT_CONTRACT_ID) {
    console.error('VAULT_CONTRACT_ID not set');
    return null;
  }

  if (!server || !keeperKeypair) {
    console.error('Harvester not initialized');
    return null;
  }

  try {
    const sourceAccount = await server.getAccount(keeperKeypair.publicKey());

    const contract = new StellarSdk.Contract(VAULT_CONTRACT_ID);
    const caller = StellarSdk.Address.fromString(keeperKeypair.publicKey());
    const token = StellarSdk.Address.fromString(lpTokenAddress);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'harvest',
          caller.toScVal(),
          token.toScVal(),
          StellarSdk.nativeToScVal(rewardAmount, { type: 'i128' })
        )
      )
      .setTimeout(300)
      .build();

    tx.sign(keeperKeypair);

    const result = await server.sendTransaction(tx);

    if (result.status === 'PENDING') {
      const txHash = result.hash;
      let attempts = 0;
      while (attempts < 30) {
        await sleep(2000);
        const txResult = await server.getTransaction(txHash);
        if (txResult.status === 'SUCCESS') {
          console.log(`Harvest successful: ${txHash}`);
          return txHash;
        }
        if (txResult.status === 'FAILED') {
          console.error(`Harvest failed: ${txHash}`);
          return null;
        }
        attempts++;
      }
      console.error(`Harvest timeout after ${attempts} attempts`);
      return null;
    }

    console.error(`Harvest error: ${JSON.stringify(result)}`);
    return null;
  } catch (error: any) {
    console.error('Harvest error:', error.message);
    return null;
  }
}

export async function compoundRewards(
  lpTokenAddress: string,
  rewardAmount: number
): Promise<void> {
  const txHash = await harvest(lpTokenAddress, rewardAmount);

  if (txHash) {
    await saveCompoundEvent({
      pool_address: VAULT_CONTRACT_ID,
      reward_amount: String(rewardAmount),
      new_total_lp: '',
      timestamp: new Date().toISOString(),
      tx_hash: txHash,
    });
    console.log(`Compound event saved: ${txHash}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
