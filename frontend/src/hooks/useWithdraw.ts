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
import type { TxPollResult } from '@/types'

export type WithdrawPhase =
  | 'INPUTTING'
  | 'SIMULATING'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTING'
  | 'POLLING'
  | 'CONFIRMED'
  | 'ERROR'

export interface WithdrawState {
  phase: WithdrawPhase
  amount: string  // dfToken amount to withdraw
  txHash: string | null
  errorMessage: string | null
}

interface UseWithdrawParams {
  lpTokenAddress: string  // The LP token contract address to withdraw from
  maxAmount: number       // Maximum dfTokens the user has
}

export function useWithdraw({ lpTokenAddress, maxAmount }: UseWithdrawParams) {
  const { publicKey, signXdr } = useWallet()
  const [state, setState] = useState<WithdrawState>({
    phase: 'INPUTTING',
    amount: maxAmount.toString(),
    txHash: null,
    errorMessage: null,
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

  const executeWithdraw = useCallback(async () => {
    if (!publicKey) return

    try {
      setState((s) => ({ ...s, phase: 'SIMULATING' }))

      const amount = parseFloat(state.amount)
      const amountStroop = BigInt(Math.round(amount * 10_000_000))

      const account = await getSorobanServer().getAccount(publicKey)
      const contract = new Contract(VAULT_CONTRACT_ID)
      const operation = contract.call(
        'withdraw',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(lpTokenAddress, { type: 'address' }),
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
  }, [publicKey, state.amount, lpTokenAddress, signXdr])

  const reset = useCallback(() => {
    setState({
      phase: 'INPUTTING',
      amount: maxAmount.toString(),
      txHash: null,
      errorMessage: null,
    })
  }, [maxAmount])

  return { state, setState, executeWithdraw, reset }
}
