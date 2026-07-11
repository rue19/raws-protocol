'use client'
import { useState, useCallback } from 'react'
import { useWallet } from '@/components/wallet/WalletProvider'
import { getSorobanServer, NETWORK_PASSPHRASE, VAULT_CONTRACT_ID } from '@/lib/stellar'
import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  BASE_FEE,
  TimeoutInfinite,
  rpc,
} from '@stellar/stellar-sdk'
import { useTxPoller } from './useTxPoller'
import type { DepositState, PoolWithHealth, TxPollResult } from '@/types'

const XLM_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
const USDC_SAC = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'

export function useDeposit(pool: PoolWithHealth) {
  const { publicKey, signXdr } = useWallet()
  const [state, setState] = useState<DepositState>({
    phase: 'INPUTTING',
    amount: '',
    asset: 'XLM',
    slippage: 0.5,
    splitPreview: null,
    estimatedNEY: pool.ney_score,
    txHash: null,
    errorMessage: null,
    simulatedFee: null,
  })

  const handleTxResult = useCallback((result: TxPollResult, _response?: any) => {
    if (result === 'CONFIRMED') {
      setState((s) => ({ ...s, phase: 'CONFIRMED' }))
    } else if (result === 'FAILED') {
      setState((s) => ({
        ...s,
        phase: 'ERROR',
        errorMessage: 'Transaction failed on-chain. Your funds were not moved.',
      }))
    } else if (result === 'TIMEOUT') {
      setState((s) => ({
        ...s,
        phase: 'ERROR',
        errorMessage: `Transaction timed out. Hash: ${s.txHash}`,
      }))
    }
  }, [])

  useTxPoller(state.txHash, handleTxResult)

  const getTokenAddress = useCallback(() => {
    const asset = state.asset.toUpperCase()
    if (asset === 'USDC') return USDC_SAC
    return XLM_SAC
  }, [state.asset])

  const executeDeposit = useCallback(async () => {
    if (!publicKey) return

    try {
      setState((s) => ({ ...s, phase: 'SIMULATING' }))

      const amount = parseFloat(state.amount)
      const amountStroop = BigInt(Math.round(amount * 10_000_000))
      const tokenAddress = getTokenAddress()

      const account = await getSorobanServer().getAccount(publicKey)
      const contract = new Contract(VAULT_CONTRACT_ID)

      const operation = contract.call(
        'deposit',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(tokenAddress, { type: 'address' }),
        nativeToScVal(amountStroop, { type: 'i128' })
      )

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(TimeoutInfinite)
        .build()

      const simResult = await getSorobanServer().simulateTransaction(tx)
      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`)
      }

      setState((s) => ({ ...s, phase: 'AWAITING_SIGNATURE' }))

      const assembledTx = rpc.assembleTransaction(tx, simResult).build()
      const signedXdr = await signXdr(assembledTx.toXDR())

      setState((s) => ({ ...s, phase: 'SUBMITTING' }))

      const envelope = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
      const { hash } = await getSorobanServer().sendTransaction(envelope)

      setState((s) => ({ ...s, phase: 'POLLING', txHash: hash }))
    } catch (err: any) {
      const msg = err?.message || 'Unknown error'
      if (msg.includes('cancel') || msg.includes('reject')) {
        setState((s) => ({ ...s, phase: 'INPUTTING', errorMessage: null }))
      } else {
        setState((s) => ({ ...s, phase: 'ERROR', errorMessage: msg }))
      }
    }
  }, [publicKey, state.amount, state.asset, signXdr, getTokenAddress])

  const reset = useCallback(() => {
    setState({
      phase: 'INPUTTING',
      amount: '',
      asset: 'XLM',
      slippage: 0.5,
      splitPreview: null,
      estimatedNEY: pool.ney_score,
      txHash: null,
      errorMessage: null,
      simulatedFee: null,
    })
  }, [pool])

  return { state, setState, executeDeposit, reset }
}
