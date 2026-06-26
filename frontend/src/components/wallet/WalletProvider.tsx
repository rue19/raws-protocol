'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit'
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils'

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

  useEffect(() => {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: Networks.TESTNET,
    })

    const saved = localStorage.getItem('raws_wallet')
    if (saved) {
      try {
        const { pubkey } = JSON.parse(saved)
        setPublicKey(pubkey)
      } catch {
        localStorage.removeItem('raws_wallet')
      }
    }
  }, [])

  const connect = useCallback(async () => {
    try {
      const { address } = await StellarWalletsKit.authModal()
      setPublicKey(address)
      localStorage.setItem('raws_wallet', JSON.stringify({ pubkey: address }))
    } catch {
      // User cancelled
    }
  }, [])

  const disconnect = useCallback(() => {
    StellarWalletsKit.disconnect()
    setPublicKey(null)
    localStorage.removeItem('raws_wallet')
  }, [])

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
