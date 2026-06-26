'use client'
import { useState, useRef, useEffect } from 'react'
import { useWallet } from './WalletProvider'
import { formatAddress } from '@/lib/format'

export function WalletBadge() {
  const { publicKey, disconnect } = useWallet()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!publicKey) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-mid border border-cotton/10 px-3 py-2 rounded-lg text-sm font-mono text-cotton hover:border-cotton/20 transition-colors cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-green" />
        {formatAddress(publicKey)}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-noir-2 border border-cotton/10 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
          <div className="px-3 py-2 text-xs text-dim font-mono border-b border-cotton/10">
            {formatAddress(publicKey)}
          </div>
          <button
            onClick={() => { disconnect(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-cotton hover:bg-mid transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
