'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit'
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils'
import { useStore } from '@/lib/store'

interface WalletContextType {
  publicKey: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signXdr: (xdr: string) => Promise<string>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const setWalletAddress = useStore((s) => s.setWalletAddress)

  useEffect(() => {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
      ? Networks.PUBLIC
      : Networks.TESTNET

    StellarWalletsKit.init({
      modules: defaultModules(),
      network,
    })

    const saved = localStorage.getItem('raws_wallet')
    if (saved) {
      try {
        const { pubkey } = JSON.parse(saved)
        setPublicKey(pubkey)
        setWalletAddress(pubkey)
      } catch {
        localStorage.removeItem('raws_wallet')
      }
    }
  }, [setWalletAddress])

  const syncStore = useCallback((addr: string | null) => {
    setPublicKey(addr)
    setWalletAddress(addr)
  }, [setWalletAddress])

  const connect = useCallback(async () => {
    try {
      const { address } = await StellarWalletsKit.authModal()
      syncStore(address)
      localStorage.setItem('raws_wallet', JSON.stringify({ pubkey: address }))
    } catch {
      // User cancelled
    }
  }, [syncStore])

  const disconnect = useCallback(() => {
    StellarWalletsKit.disconnect()
    syncStore(null)
    localStorage.removeItem('raws_wallet')
  }, [syncStore])

  const signXdr = useCallback(async (xdr: string): Promise<string> => {
    if (!publicKey) throw new Error('Wallet not connected')
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      address: publicKey,
      networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE!,
    })
    return signedTxXdr
  }, [publicKey])

  return (
    <WalletContext.Provider value={{ publicKey, isConnected: !!publicKey, connect, disconnect, signXdr }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
