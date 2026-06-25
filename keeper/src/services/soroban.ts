import { Keypair, TransactionBuilder, Networks, rpc, Contract, nativeToScVal, Address } from "@stellar/stellar-sdk";
import { config } from "../config";
import { logger } from "../lib/logger";
import { getPendingRewards } from "./aquarius";

const keeperKeypair = Keypair.fromSecret(config.KEEPER_SECRET_KEY);
const server = new rpc.Server(config.SOROBAN_RPC_URL);

const networkPassphrase =
  config.STELLAR_NETWORK === "testnet"
    ? Networks.TESTNET
    : Networks.PUBLIC;

export async function callHarvest(poolId: string, lpTokenAddress?: string): Promise<string> {
  const vault = new Contract(config.VAULT_CONTRACT_ID);
  const account = await server.getAccount(keeperKeypair.publicKey());

  const keeperAddress = Address.fromString(keeperKeypair.publicKey());

  const lpToken = lpTokenAddress || poolId;
  const rewardAmount = await getPendingRewards(lpToken);

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(
      vault.call(
        "harvest",
        keeperAddress.toScVal(),
        nativeToScVal(lpToken, { type: "address" }),
        nativeToScVal(Number(rewardAmount), { type: "i128" })
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keeperKeypair);

  const sendResult = await server.sendTransaction(prepared);
  if (sendResult.status === "ERROR") {
    throw new Error(`harvest tx rejected: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  const start = Date.now();
  while (getResult.status === "NOT_FOUND" && Date.now() - start < 15000) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }
  if (getResult.status !== "SUCCESS") {
    throw new Error(`harvest tx failed: ${getResult.status}`);
  }
  return sendResult.hash;
}