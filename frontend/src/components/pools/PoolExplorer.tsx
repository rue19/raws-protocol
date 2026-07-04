'use client'
import { useState, useMemo } from 'react'
import { usePools } from '@/hooks/usePools'
import { PoolCard } from './PoolCard'
import { useWallet } from '@/components/wallet/WalletProvider'
import { DepositModal } from '@/components/deposit/DepositModal'
import type { PoolWithHealth } from '@/types'

type FilterType = 'all' | 'real_yield' | 'safe_mode'
type SortBy = 'ney' | 'apy' | 'tvl' | 'protocol'

export function PoolExplorer() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortBy>('ney')
  const [depositPool, setDepositPool] = useState<PoolWithHealth | null>(null)

  const params = useMemo(
    () => ({
      protocol: undefined as string | undefined,
      safe_mode: filter === 'safe_mode' ? true : undefined,
    }),
    [filter]
  )

  const { pools, loading, error } = usePools(params)
  const { isConnected } = useWallet()

  const filtered = useMemo(() => {
    if (filter === 'real_yield') return pools.filter((p) => p.emission_yield_apy === 0)
    return pools
  }, [pools, filter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'ney') return (b.ney_score ?? -Infinity) - (a.ney_score ?? -Infinity)
      if (sortBy === 'apy') return b.total_apy - a.total_apy
      if (sortBy === 'tvl') return (b.tvl_usd ?? 0) - (a.tvl_usd ?? 0)
      return a.protocol.localeCompare(b.protocol)
    })
  }, [filtered, sortBy])

  const maxApr = useMemo(() => Math.max(...pools.map((p) => p.total_apy), 1), [pools])

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pt-14 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-[#0f1b2d] mb-1">Pool Explorer</h1>
        <p className="text-[#6b7280] text-sm">Live NEY scores across Stellar AMM pools</p>
      </div>

      {!isConnected && (
        <div className="mb-6 bg-[#810100]/10 border border-[#810100]/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[#0f1b2d] text-sm font-medium">Connect your wallet to deposit into any pool</p>
            <p className="text-[#6b7280] text-xs">Freighter · xBull · and more supported</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6 text-sm">
        <div className="flex flex-wrap gap-4">
          {(['all', 'real_yield', 'safe_mode'] as FilterType[]).map((f) => (
            <label key={f} className="flex items-center gap-1.5 text-[#6b7280] hover:text-[#0f1b2d] cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === f}
                onChange={() => setFilter(f)}
                className="accent-[#810100]"
              />
              {f === 'all' ? 'All pools' : f === 'real_yield' ? 'Real yield only' : 'Safe Mode only'}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[#6b7280] sm:ml-auto">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-white border border-[#ddd0b3] rounded-lg px-2 py-1 text-[#0f1b2d] text-sm"
          >
            <option value="ney">NEY Score</option>
            <option value="apy">Total APY</option>
            <option value="tvl">TVL</option>
            <option value="protocol">Protocol</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-[#e53935]/10 border border-[#e53935]/30 rounded-xl p-4 mb-6 text-[#e53935] text-sm">
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
        <div className="bg-white border border-[#ddd0b3] rounded-xl p-8 text-center">
          <p className="text-[#0f1b2d] text-lg font-mono font-bold mb-2">No pools match your filter</p>
          <p className="text-[#6b7280] text-sm mb-4">Try &quot;All pools&quot; to see everything</p>
          <button
            onClick={() => setFilter('all')}
            className="text-[#810100] text-sm hover:underline cursor-pointer"
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
