'use client'
import { useState } from 'react'
import { usePools } from '@/hooks/usePools'
import { PoolCard } from './PoolCard'
import { useWallet } from '@/components/wallet/WalletProvider'
import { DepositModal } from '@/components/deposit/DepositModal'
import type { Pool } from '@/types'

type FilterType = 'all' | 'real_yield' | 'safe_mode'
type SortBy = 'ney' | 'apr' | 'tvl' | 'protocol'

export function PoolExplorer() {
  const { pools, loading, error } = usePools()
  const { isConnected } = useWallet()
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortBy>('ney')
  const [depositPool, setDepositPool] = useState<Pool | null>(null)

  const filtered = pools.filter((p) => {
    if (filter === 'real_yield') return p.emission_yield_apr === 0
    if (filter === 'safe_mode') return p.pool_id.includes('raws')
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'ney') return b.ney_score - a.ney_score
    if (sortBy === 'apr') return b.total_apr - a.total_apr
    if (sortBy === 'tvl') return b.tvl_usd - a.tvl_usd
    return a.protocol.localeCompare(b.protocol)
  })

  const maxApr = Math.max(...pools.map((p) => p.total_apr), 1)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-cotton mb-1">Pool Explorer</h1>
        <p className="text-dim text-sm">Live NEY scores across Stellar AMM pools</p>
      </div>

      {!isConnected && (
        <div className="mb-6 bg-cherry/8 border border-cherry/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-cotton text-sm font-medium">Connect your wallet to deposit into any pool</p>
            <p className="text-dim text-xs">Freighter · xBull · and more supported</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6 text-sm">
        <div className="flex flex-wrap gap-4">
          {(['all', 'real_yield', 'safe_mode'] as FilterType[]).map((f) => (
            <label key={f} className="flex items-center gap-1.5 text-dim hover:text-cotton cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === f}
                onChange={() => setFilter(f)}
                className="accent-cherry"
              />
              {f === 'all' ? 'All pools' : f === 'real_yield' ? 'Real yield only' : 'Safe Mode only'}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 text-dim sm:ml-auto">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-noir-2 border border-cotton/15 rounded-lg px-2 py-1 text-cotton text-sm"
          >
            <option value="ney">NEY Score</option>
            <option value="apr">Total APR</option>
            <option value="tvl">TVL</option>
            <option value="protocol">Protocol</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red/10 border border-red/30 rounded-xl p-4 mb-6 text-red text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-mid border border-cotton/10 rounded-xl p-8 text-center">
          <p className="text-cotton text-lg font-serif mb-2">No pools match your filter</p>
          <p className="text-dim text-sm mb-4">Try &quot;All pools&quot; to see everything</p>
          <button
            onClick={() => setFilter('all')}
            className="text-cherry text-sm hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((pool) => (
            <PoolCard
              key={pool.pool_id}
              pool={pool}
              maxApr={maxApr}
              onDeposit={setDepositPool}
            />
          ))}
        </div>
      )}

      {depositPool && (
        <DepositModal pool={depositPool} onClose={() => setDepositPool(null)} />
      )}
    </div>
  )
}
