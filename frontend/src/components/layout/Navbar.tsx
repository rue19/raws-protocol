'use client'
import Link from 'next/link'
import { ConnectButton } from '@/components/wallet/ConnectButton'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-noir/95 backdrop-blur-sm border-b border-cotton/8">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-2xl font-serif text-cherry font-bold">RAW$</span>
            <span className="text-dim text-xs font-mono">· Stellar Testnet</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/dashboard"
              className="font-mono text-xs text-dim hover:text-cotton transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/pools"
              className="font-mono text-xs text-dim hover:text-cotton transition-colors"
            >
              Pools
            </Link>
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  )
}
