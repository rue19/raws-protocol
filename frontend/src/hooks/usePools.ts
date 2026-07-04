'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { PoolWithHealth } from '@/types'

export function usePools(params?: { protocol?: string; safe_mode?: boolean }) {
  const [pools, setPools] = useState<PoolWithHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    api.getPools(params)
      .then(({ pools }) => { if (!cancelled) setPools(pools) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [params?.protocol, params?.safe_mode])

  return { pools, loading, error }
}
