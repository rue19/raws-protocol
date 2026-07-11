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

const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE!

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

    // Reconcile: prefer kit's active address over stale raws_wallet
    const kitKey = localStorage.getItem('@StellarWalletsKit/activeAddress')
    const savedRaw = localStorage.getItem('raws_wallet')
    const savedPubkey = savedRaw ? (() => { try { return JSON.parse(savedRaw).pubkey } catch { return null } })() : null

    // Kit's stored address takes priority (most recently connected)
    const resolved = kitKey || savedPubkey

    if (resolved) {
      // Validate mainnet address format
      if (/^G[A-Z2-7]{55}$/.test(resolved)) {
        setPublicKey(resolved)
        setWalletAddress(resolved)
        // Keep both storage keys in sync
        localStorage.setItem('raws_wallet', JSON.stringify({ pubkey: resolved }))
        if (kitKey !== resolved) {
          localStorage.setItem('@StellarWalletsKit/activeAddress', resolved)
        }
      } else {
        // Stale or wrong-network address -- clear it
        localStorage.removeItem('raws_wallet')
        localStorage.removeItem('@StellarWalletsKit/activeAddress')
        localStorage.removeItem('@StellarWalletsKit/selectedModuleId')
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

      // Validate: must be a mainnet G... address
      if (!/^G[A-Z2-7]{55}$/.test(address)) {
        console.error('Connected address is not a valid Stellar mainnet public key:', address)
        return
      }

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
    localStorage.removeItem('@StellarWalletsKit/activeAddress')
    localStorage.removeItem('@StellarWalletsKit/selectedModuleId')
  }, [syncStore])

  const signXdr = useCallback(async (xdr: string): Promise<string> => {
    if (!publicKey) throw new Error('Wallet not connected')
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      address: publicKey,
      networkPassphrase: NETWORK_PASSPHRASE,
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
