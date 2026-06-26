'use client'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { HealthDot } from '@/components/pools/HealthDot'
import { NEYScore } from '@/components/pools/NEYScore'
import { AssetInput } from './AssetInput'
import { SplitPreview } from './SplitPreview'
import { SlippageSettings } from './SlippageSettings'
import { TxStatus } from './TxStatus'
import { useDeposit } from '@/hooks/useDeposit'
import type { Pool } from '@/types'

interface DepositModalProps {
  pool: Pool
  onClose: () => void
}

export function DepositModal({ pool, onClose }: DepositModalProps) {
  const { state, setState, executeDeposit, reset } = useDeposit(pool)

  const tokens = pool.pool_id.split('/')
  const tokenA = tokens[0] || 'Token A'
  const tokenB = tokens[1] || 'Token B'
  const amount = parseFloat(state.amount) || 0
  const halfValue = amount / 2
  const reserveRatio = pool.reserve_b > 0 ? pool.reserve_b / pool.reserve_a : 1
  const splitA = halfValue
  const splitB = halfValue / reserveRatio

  const minDeposit = 1.0
  const isAmountValid = amount >= minDeposit
  const errorMsg = amount > 0 && !isAmountValid
    ? `Minimum deposit is ${minDeposit.toFixed(2)} ${state.asset}`
    : undefined

  return (
    <Modal onClose={onClose}>
      {(state.phase === 'POLLING' || state.phase === 'CONFIRMED' || state.phase === 'ERROR') ? (
        <TxStatus
          phase={state.phase}
          txHash={state.txHash}
          errorMessage={state.errorMessage}
          amount={state.amount}
          poolName={pool.pool_name}
          onDepositAgain={reset}
          onClose={onClose}
        />
      ) : state.phase === 'SIMULATING' || state.phase === 'AWAITING_SIGNATURE' || state.phase === 'SUBMITTING' ? (
        <div className="p-6 text-center">
          <Spinner size={40} />
          <p className="text-cotton mt-4 text-lg font-serif">
            {state.phase === 'SIMULATING' && 'Simulating transaction...'}
            {state.phase === 'AWAITING_SIGNATURE' && 'Check your wallet'}
            {state.phase === 'SUBMITTING' && 'Submitting to Stellar...'}
          </p>
          {state.phase === 'AWAITING_SIGNATURE' && (
            <p className="text-dim text-sm mt-1">Approve the transaction in your wallet</p>
          )}
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-serif text-cotton">Deposit into {pool.pool_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-dim text-xs">{pool.protocol}</span>
                <span className="text-dim">·</span>
                <HealthDot status={pool.health_status} />
                <NEYScore ney={pool.ney_score} health={pool.health_status} />
              </div>
            </div>
            <button onClick={onClose} className="text-dim hover:text-cotton text-xl cursor-pointer">×</button>
          </div>

          {state.errorMessage && (
            <div className="bg-red/10 border border-red/30 rounded-lg p-3 mb-4 text-red text-sm">
              {state.errorMessage}
            </div>
          )}

          <div className="mb-4">
            <AssetInput
              value={state.amount}
              onChange={(val) => setState((s) => ({ ...s, amount: val }))}
              asset={state.asset}
              error={errorMsg}
            />
          </div>

          {amount >= minDeposit && (
            <div className="mb-4">
              <SplitPreview
                tokenA={tokenA}
                tokenB={tokenB}
                amountA={splitA}
                amountB={splitB}
              />
            </div>
          )}

          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-dim">Estimated NEY</span>
              <NEYScore ney={pool.ney_score} health={pool.health_status} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dim">Real yield</span>
              <span className="text-green font-mono">{pool.real_yield_apr.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dim">Emission yield</span>
              <span className="text-amber font-mono">{pool.emission_yield_apr.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dim">Network fee</span>
              <span className="text-cotton font-mono">~0.00015 XLM</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-dim text-xs block mb-1">Slippage tolerance</label>
            <SlippageSettings
              value={state.slippage}
              onChange={(val) => setState((s) => ({ ...s, slippage: val }))}
            />
          </div>

          <button
            onClick={executeDeposit}
            disabled={!isAmountValid || amount <= 0}
            className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
              isAmountValid && amount > 0
                ? 'bg-cherry text-cotton hover:bg-cherry-dim cursor-pointer'
                : 'bg-mid text-dim cursor-not-allowed'
            }`}
          >
            Deposit →
          </button>
        </div>
      )}
    </Modal>
  )
}
