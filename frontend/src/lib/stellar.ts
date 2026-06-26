import { rpc, Networks } from '@stellar/stellar-sdk'

export const sorobanServer = new rpc.Server(
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL!,
  { allowHttp: false }
)

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET

export const VAULT_CONTRACT_ID = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID!
export const AMM_CONTRACT_ID = process.env.NEXT_PUBLIC_AMM_CONTRACT_ID!
