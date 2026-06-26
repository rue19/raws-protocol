import { useEffect, useRef } from 'react'
import { getSorobanServer } from '@/lib/stellar'
import type { TxPollResult } from '@/types'

export function useTxPoller(
  txHash: string | null,
  onResult: (result: TxPollResult, response?: any) => void
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const TIMEOUT_MS = 30_000
  const POLL_MS = 500

  useEffect(() => {
    if (!txHash) return
    startTimeRef.current = Date.now()

    intervalRef.current = setInterval(async () => {
      if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        onResult('TIMEOUT')
        return
      }

      try {
        const response = await getSorobanServer().getTransaction(txHash)
        if (response.status === 'SUCCESS') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          onResult('CONFIRMED', response)
        } else if (response.status === 'FAILED') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          onResult('FAILED', response)
        }
      } catch {
        // RPC error — keep polling
      }
    }, POLL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [txHash, onResult])
}
