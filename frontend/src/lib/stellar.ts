import { rpc, Networks, Horizon } from '@stellar/stellar-sdk'

let _server: rpc.Server | null = null
let _horizon: Horizon.Server | null = null

export function getSorobanServer(): rpc.Server {
  if (_server) return _server
  const url = process.env.NEXT_PUBLIC_STELLAR_RPC_URL
  if (!url) throw new Error('NEXT_PUBLIC_STELLAR_RPC_URL missing')
  _server = new rpc.Server(url, { allowHttp: false })
  return _server
}

export function getHorizonServer(): Horizon.Server {
  if (_horizon) return _horizon
  const url = process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'
  _horizon = new Horizon.Server(url)
  return _horizon
}

/** @deprecated Use getSorobanServer() instead */
export const sorobanServer = typeof window !== 'undefined'
  ? (() => { try { return getSorobanServer() } catch { return null as unknown as rpc.Server } })()
  : (null as unknown as rpc.Server)

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET

export const VAULT_CONTRACT_ID = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID ?? ''
export const AMM_CONTRACT_ID = process.env.NEXT_PUBLIC_AMM_CONTRACT_ID ?? ''
export const SOROSWAP_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_SOROSWAP_ROUTER_ADDRESS ?? ''
