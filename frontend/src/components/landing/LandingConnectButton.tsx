'use client'
import { Wallet } from 'lucide-react'
import { useWallet } from '@/components/wallet/WalletProvider'
import { formatAddress } from '@/lib/format'

export function LandingConnectButton() {
  const { isConnected, publicKey, connect, disconnect } = useWallet()

  if (isConnected && publicKey) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 border border-white/15 rounded-full px-4 py-2 text-xs text-white/80 hover:border-white/30 hover:text-white transition-colors cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
        {formatAddress(publicKey)}
      </button>
    )
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 border border-white/15 rounded-full px-4 py-2 text-xs text-white/80 hover:border-white/30 hover:text-white transition-colors cursor-pointer"
    >
      <Wallet size={14} />
      connect wallet
    </button>
  )
}
