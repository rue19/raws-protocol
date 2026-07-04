'use client'
import { Wallet } from 'lucide-react'
import { useWallet } from '@/components/wallet/WalletProvider'
import { formatAddress } from '@/lib/utils'

export function LandingConnectButton() {
  const { isConnected, publicKey, connect, disconnect } = useWallet()

  if (isConnected && publicKey) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 whitespace-nowrap border border-white/15 rounded-full px-3 sm:px-4 py-2 text-xs text-white/80 hover:border-white/30 hover:text-white transition-colors cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] shrink-0" />
        {formatAddress(publicKey)}
      </button>
    )
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 whitespace-nowrap border border-white/15 rounded-full px-3 sm:px-4 py-2 text-xs text-white/80 hover:border-white/30 hover:text-white transition-colors cursor-pointer"
    >
      <Wallet size={14} className="shrink-0" />
      connect wallet
    </button>
  )
}
