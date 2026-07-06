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

const SLIPPAGE_BPS = BigInt(50)
const BPS_BASE = BigInt(10_000)

export type DepositSingleAssetPhase =
  | 'INPUTTING'
  | 'SIMULATING'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTING'
  | 'POLLING'
  | 'CONFIRMED'
  | 'ERROR'

export interface DepositSingleAssetState {
  phase: DepositSingleAssetPhase
  amount: string  // Token amount to deposit
  txHash: string | null
  errorMessage: string | null
}

interface UseDepositSingleAssetParams {
  tokenAddress: string   // The token contract address to deposit
  targetPoolAddress: string  // The target pool contract address
  maxAmount: number      // Maximum tokens the user has
  slippagePercent?: number  // Default 0.5%
}

export function useDepositSingleAsset({
  tokenAddress,
  targetPoolAddress,
  maxAmount,
  slippagePercent = 0.5,
}: UseDepositSingleAssetParams) {
  const { publicKey, signXdr } = useWallet()
  const [state, setState] = useState<DepositSingleAssetState>({
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

  const executeDeposit = useCallback(async () => {
    if (!publicKey) return

    try {
      setState((s) => ({ ...s, phase: 'SIMULATING' }))

      const amount = parseFloat(state.amount)
      const amountStroop = BigInt(Math.round(amount * 10_000_000))
      
      // Build the tx first for simulation to get expected output
      const account = await getSorobanServer().getAccount(publicKey)
      const contract = new Contract(VAULT_CONTRACT_ID)
      const operation = contract.call(
        'deposit_single_asset',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(tokenAddress, { type: 'address' }),
        nativeToScVal(amountStroop, { type: 'i128' }),
        nativeToScVal(targetPoolAddress, { type: 'address' }),
        nativeToScVal(BigInt(0), { type: 'i128' }) // placeholder for simulation
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

      // Extract expected LP output from simulation and apply slippage
      const simReturn = simResult.result?.retval
      let minLpOut = BigInt(0)
      if (simReturn) {
        const quotedLp = BigInt(simReturn.toString())
        minLpOut = (quotedLp * (BPS_BASE - SLIPPAGE_BPS)) / BPS_BASE
        if (minLpOut < BigInt(0)) minLpOut = BigInt(0)
      }

      // Rebuild tx with the real minLpOut
      const finalOperation = contract.call(
        'deposit_single_asset',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(tokenAddress, { type: 'address' }),
        nativeToScVal(amountStroop, { type: 'i128' }),
        nativeToScVal(targetPoolAddress, { type: 'address' }),
        nativeToScVal(minLpOut, { type: 'i128' })
      )

      const finalTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(finalOperation)
        .setTimeout(TimeoutInfinite)
        .build()

      const finalSimResult = await getSorobanServer().simulateTransaction(finalTx)
      if (rpc.Api.isSimulationError(finalSimResult)) {
        throw new Error(`Simulation failed: ${finalSimResult.error}`)
      }

      setState((s) => ({ ...s, phase: 'AWAITING_SIGNATURE' }))

      const assembledTx = rpc.assembleTransaction(finalTx, finalSimResult).build()
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
  }, [publicKey, state.amount, tokenAddress, targetPoolAddress, signXdr])

  const reset = useCallback(() => {
    setState({
      phase: 'INPUTTING',
      amount: maxAmount.toString(),
      txHash: null,
      errorMessage: null,
    })
  }, [maxAmount])

  return { state, setState, executeDeposit, reset }
}
