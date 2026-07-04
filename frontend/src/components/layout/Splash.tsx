'use client'
import { useWallet } from '@/components/wallet/WalletProvider'

export function Splash() {
  const { connect } = useWallet()

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center text-center px-6">
        <div className="mb-10 animate-fade-in">
          <svg width="120" height="140" viewBox="0 0 36 42" fill="none">
            <path d="M18 3C18 3 7 9 7 19C7 25 11 29 15 31L15 39" stroke="#F7E7B4" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M18 3C18 3 29 9 29 19C29 25 25 29 21 31L21 39" stroke="#F7E7B4" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="15" y1="39" x2="21" y2="39" stroke="#F7E7B4" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="18" cy="19" r="4.5" stroke="#F7E7B4" strokeWidth="2.5"/>
            <path d="M18 3 Q20.5 0 23 3" stroke="#F7E7B4" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        <h1 className="text-6xl md:text-8xl font-display font-bold text-cream tracking-[0.1em] mb-4 animate-fade-in [animation-delay:200ms] fill-mode-forwards opacity-0">
          RAW$
        </h1>
        
        <p className="text-lg md:text-xl font-medium text-dim tracking-[0.2em] mb-12 animate-fade-in [animation-delay:400ms] fill-mode-forwards opacity-0">
          REAL YIELD. NO BULLSHIT.
        </p>

        <button
          onClick={connect}
          className="group relative flex items-center gap-3 bg-cream text-prussian px-10 py-5 rounded-lg font-bold text-lg tracking-wide hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98] animate-fade-in [animation-delay:600ms] fill-mode-forwards opacity-0"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
          CONNECT WALLET
        </button>
      </div>

      {/* Decorative footer elements */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center text-dim text-xs font-medium tracking-widest opacity-40">
        BUILT ON STELLAR · SOROBAN ENABLED
      </div>
    </div>
  )
}
