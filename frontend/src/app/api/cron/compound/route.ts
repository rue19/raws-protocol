import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/keeper/db';
import { ratelimit } from '@/lib/ratelimit';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  rpc,
  Contract,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';

const AQUARIUS_API = process.env.AQUARIUS_API_URL ?? 'https://api.aqua.network/api/v1';

async function getPendingRewards(lpAddress: string): Promise<bigint> {
  try {
    const res = await fetch(`${AQUARIUS_API}/lp/${lpAddress}/rewards`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return BigInt(0);
    const data = (await res.json()) as { rewards?: string };
    return BigInt(data.rewards || '0');
  } catch {
    return BigInt(0);
  }
}

async function callHarvest(
  server: rpc.Server,
  keeperKeypair: Keypair,
  networkPassphrase: string,
  vaultContractId: string,
  poolId: string,
  lpTokenAddress: string,
): Promise<{ txHash: string; gasCostXlm: number } | 'SKIPPED_LOW_REWARDS'> {
  const vault = new Contract(vaultContractId);
  const account = await server.getAccount(keeperKeypair.publicKey());
  const keeperAddress = Address.fromString(keeperKeypair.publicKey());
  const rewardAmount = await getPendingRewards(lpTokenAddress);

  if (rewardAmount < BigInt(10000)) {
    return 'SKIPPED_LOW_REWARDS';
  }

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase,
  })
    .addOperation(
      vault.call(
        'harvest',
        keeperAddress.toScVal(),
        nativeToScVal(lpTokenAddress, { type: 'address' }),
        nativeToScVal(Number(rewardAmount), { type: 'i128' }),
      ),
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keeperKeypair);

  const sendResult = await server.sendTransaction(prepared);
  if (sendResult.status === 'ERROR') {
    throw new Error(`harvest tx rejected: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  const start = Date.now();
  while (getResult.status === 'NOT_FOUND' && Date.now() - start < 15000) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }
  if (getResult.status !== 'SUCCESS') {
    throw new Error(`harvest tx failed: ${getResult.status}`);
  }

  const STROOPS_PER_XLM = 10_000_000;
  const gasCostXlm = Number(getResult.resultXdr.feeCharged()) / STROOPS_PER_XLM;
  return { txHash: sendResult.hash, gasCostXlm };
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secretKey = process.env.KEEPER_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Server misconfigured — KEEPER_SECRET_KEY not set' }, { status: 500 });
  }

  const vaultContractId = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

  if (!vaultContractId || !rpcUrl) {
    return NextResponse.json({ error: 'Server misconfigured — missing Stellar env vars' }, { status: 500 });
  }

  const keeperKeypair = Keypair.fromSecret(secretKey);
  const server = new rpc.Server(rpcUrl);
  const networkPassphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

  try {
    const { data: positions } = await db
      .from('positions')
      .select('*')
      .eq('is_active', true);

    if (!positions || positions.length === 0) {
      return NextResponse.json({ ok: true, message: 'No active positions', processed: 0 });
    }

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    for (const pos of positions) {
      try {
        const { count } = await db
          .from('compound_log')
          .select('id', { count: 'exact', head: true })
          .eq('pool_id', pos.pool_id)
          .gte('compounded_at', fourHoursAgo.toISOString());

        if ((count ?? 0) > 0) continue;

        const lpToken = pos.pool_id;
        const result = await callHarvest(
          server,
          keeperKeypair,
          networkPassphrase,
          vaultContractId,
          pos.pool_id,
          lpToken,
        );

        if (result === 'SKIPPED_LOW_REWARDS') {
          skipped++;
          continue;
        }

        const { txHash, gasCostXlm } = result;

        await db.from('compound_log').insert({
          pool_id: pos.pool_id,
          user_address: pos.user_address,
          position_id: pos.id,
          rewards_harvested: 0,
          tx_hash: txHash,
          gas_cost_xlm: gasCostXlm,
          compounded_at: new Date().toISOString(),
        });

        processed++;
      } catch (err) {
        console.error(`Compound cron failed for position ${pos.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Compound cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
