'use client'
import { HealthDot } from './HealthDot'
import { NEYScore } from './NEYScore'
import { YieldBars } from './YieldBars'
import { useWallet } from '@/components/wallet/WalletProvider'
import { formatTVL, timeAgo } from '@/lib/format'
import type { Pool } from '@/types'

interface PoolCardProps {
  pool: Pool
  maxApr: number
  onDeposit: (pool: Pool) => void
}

export function PoolCard({ pool, maxApr, onDeposit }: PoolCardProps) {
  const { isConnected } = useWallet()

  return (
    <div className="bg-mid border border-cotton/10 rounded-xl p-5 flex flex-col gap-4 hover:border-cotton/15 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <HealthDot status={pool.health_status} />
          <div>
            <h3 className="text-cotton font-serif text-lg">{pool.pool_name}</h3>
            <p className="text-dim text-xs">{formatTVL(pool.tvl_usd)} TVL</p>
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            pool.protocol === 'RAW$ Native'
              ? 'bg-cherry/15 text-cherry'
              : 'bg-cotton/8 text-dim'
          }`}
        >
          {pool.protocol}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-dim text-xs mb-1">NEY Score</span>
          <NEYScore ney={pool.ney_score} health={pool.health_status} />
        </div>
        <div className="flex-1 mx-6">
          <YieldBars
            realYield={pool.real_yield_apr}
            emissionYield={pool.emission_yield_apr}
            maxApr={maxApr}
          />
        </div>
        <div className="text-right">
          <span className="text-dim text-xs">Total APR</span>
          <p className="font-mono text-cotton">{pool.total_apr.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-cotton/5">
        <span className="text-dim text-xs">{timeAgo(pool.snapshot_at)}</span>
        <button
          onClick={() => onDeposit(pool)}
          disabled={!isConnected}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isConnected
              ? 'bg-cherry text-cotton hover:bg-cherry-dim cursor-pointer'
              : 'bg-mid text-dim border border-cotton/10 cursor-not-allowed'
          }`}
          title={!isConnected ? 'Connect Wallet to deposit' : 'Deposit'}
        >
          Deposit →
        </button>
      </div>
    </div>
  )
}
