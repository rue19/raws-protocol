import { Keypair, TransactionBuilder, Networks, rpc, Contract } from "@stellar/stellar-sdk";
import { Address, xdr, nativeToScVal, scValToNative } from "@stellar/stellar-base";
import { config } from "../config";
import { logger } from "../lib/logger";

const keeperKeypair = Keypair.fromSecret(config.KEEPER_SECRET_KEY);
const server = new rpc.Server(config.STELLAR_RPC_URL);

const networkPassphrase =
  config.STELLAR_NETWORK === "testnet"
    ? Networks.TESTNET
    : Networks.PUBLIC;

const SLIPPAGE_BPS = 50n;
const BPS_BASE = 10_000n;

function calcMinOut(quoted: bigint): bigint {
  return (quoted * (BPS_BASE - SLIPPAGE_BPS)) / BPS_BASE;
}

function i128Val(n: number | bigint): xdr.ScVal {
  return nativeToScVal(Number(n), { type: "i128" });
}

function addrVal(s: string): xdr.ScVal {
  return Address.fromString(s).toScVal();
}

function vecVal(items: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items);
}

async function buildAndSendTx(ops: xdr.Operation[]): Promise<string> {
  const account = await server.getAccount(keeperKeypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: "300000",
    networkPassphrase,
  });
  for (const op of ops) {
    tx.addOperation(op);
  }
  const built = tx.setTimeout(60).build();
  const prepared = await server.prepareTransaction(built);
  prepared.sign(keeperKeypair);

  const sendResult = await server.sendTransaction(prepared);
  if (sendResult.status === "ERROR") {
    throw new Error(`tx rejected: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  const start = Date.now();
  while (getResult.status === "NOT_FOUND" && Date.now() - start < 30000) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }
  if (getResult.status !== "SUCCESS") {
    throw new Error(`tx failed: ${getResult.status}`);
  }
  return sendResult.hash;
}

async function simulateView(contractId: string, fn: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(
    await server.getAccount(keeperKeypair.publicKey()),
    { fee: "0", networkPassphrase }
  )
    .addOperation(contract.call(fn, ...args))
    .setTimeout(0)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if ("error" in simResult) {
    throw new Error(`simulateView failed: ${JSON.stringify(simResult.error)}`);
  }
  return simResult.result?.retval ?? xdr.ScVal.scvVoid();
}

export async function claimAndCompound(
  aquaRewardAmount: bigint,
  lpTokenAddress: string
): Promise<string> {
  if (aquaRewardAmount <= 0n) {
    throw new Error("claimAndCompound: no AQUA rewards to compound");
  }

  const vaultAddr = config.VAULT_CONTRACT_ID;
  const routerAddr = config.SOROSWAP_ROUTER_ADDRESS;
  const aquaAddr = config.AQUA_TOKEN_ADDRESS;
  const keeperAddr = keeperKeypair.publicKey();

  // Step 1: Get expected LP output from router via simulation
  const swapPath = vecVal([addrVal(aquaAddr), addrVal(lpTokenAddress)]);
  const amountsOutVal = await simulateView(routerAddr, "get_amounts_out", [
    i128Val(aquaRewardAmount),
    swapPath,
  ]);
  const amountsOutArr = scValToNative(amountsOutVal) as number[];
  const quotedLp = BigInt(amountsOutArr[1] ?? amountsOutArr[0] ?? 0);
  const minLpOut = calcMinOut(quotedLp);

  logger.info(
    { aquaAmount: aquaRewardAmount.toString(), quotedLp: quotedLp.toString(), minLpOut: minLpOut.toString() },
    "swap quote received"
  );

  // Step 2: Build multi-op tx
  const aquaClient = new Contract(aquaAddr);
  const routerClient = new Contract(routerAddr);
  const vaultClient = new Contract(vaultAddr);

  const ops: xdr.Operation[] = [
    // 2a: Transfer AQUA from keeper to router
    aquaClient.call(
      "transfer",
      addrVal(keeperAddr),
      addrVal(routerAddr),
      i128Val(aquaRewardAmount)
    ),
    // 2b: Swap on router: exchange(token_in, amount_in, min_amount_out, path)
    routerClient.call(
      "exchange",
      addrVal(aquaAddr),
      i128Val(aquaRewardAmount),
      i128Val(minLpOut),
      vecVal([addrVal(aquaAddr), addrVal(lpTokenAddress)])
    ),
    // 2c: Call vault.harvest with the LP token amount
    vaultClient.call(
      "harvest",
      addrVal(keeperAddr),
      addrVal(lpTokenAddress),
      i128Val(minLpOut)
    ),
  ];

  const txHash = await buildAndSendTx(ops);
  logger.info(
    { aquaAmount: aquaRewardAmount.toString(), lpOut: minLpOut.toString(), txHash },
    "claim-and-compound pipeline complete"
  );
  return txHash;
}
