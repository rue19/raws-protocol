'use client'
import { useWallet } from './WalletProvider'
import { WalletBadge } from './WalletBadge'

export function ConnectButton() {
  const { isConnected, connect } = useWallet()

  if (isConnected) return <WalletBadge />

  return (
    <button
      onClick={connect}
      className="bg-cherry text-cotton px-4 py-2 rounded-lg text-sm font-medium hover:bg-cherry-dim transition-colors cursor-pointer"
    >
      Connect Wallet
    </button>
  )
}
