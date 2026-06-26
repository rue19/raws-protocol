'use client'
import { ConnectButton } from '@/components/wallet/ConnectButton'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-noir/95 backdrop-blur-sm border-b border-cotton/8">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-serif text-cherry font-bold">RAW$</span>
          <span className="text-dim text-xs font-mono">· Stellar Testnet</span>
        </div>
        <ConnectButton />
      </div>
    </nav>
  )
}
