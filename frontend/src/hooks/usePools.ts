'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Pool } from '@/types'

export function usePools() {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setLoading(false)
      return
    }
    const supabase = getSupabase()

    const fetchPools = async () => {
      const { data, error } = await supabase
        .from('pool_snapshots')
        .select('*')
        .order('captured_at', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const latest = Object.values(
        (data ?? []).reduce((acc: Record<string, any>, row: any) => {
          if (!acc[row.pool_id]) acc[row.pool_id] = row
          return acc
        }, {})
      ) as Pool[]

      setPools(latest)
      setLoading(false)
    }

    fetchPools()

    const sub = supabase
      .channel('pool_snapshots')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pool_snapshots' },
        (payload) => {
          setPools((prev) => {
            const updated = [...prev]
            const idx = updated.findIndex((p) => p.pool_id === (payload.new as any).pool_id)
            if (idx >= 0) updated[idx] = payload.new as Pool
            else updated.push(payload.new as Pool)
            return updated
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  return { pools, loading, error }
}
