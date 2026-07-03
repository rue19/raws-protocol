'use client'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { LandingConnectButton } from './LandingConnectButton'

export function LandingHeader() {
  return (
    <header className="relative z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 sm:px-8 py-6">
      <div className="flex justify-start min-w-0">
        <LandingConnectButton />
      </div>

      <nav className="flex items-center gap-5 sm:gap-7 lg:gap-9 text-sm text-white/70">
        <Link
          href="/pools"
          className="hidden sm:flex items-center gap-1 hover:text-white transition-colors"
        >
          pools <ChevronDown size={13} />
        </Link>
        <Link href="/dashboard" className="hidden sm:inline hover:text-white transition-colors">
          dashboard
        </Link>
        <span className="hidden lg:inline text-white/30 cursor-default">analytics</span>

        <Link href="/" className="flex items-center px-1 sm:px-2">
          <img src="/logo.svg" alt="RAW$" className="h-6 sm:h-7 w-auto filter brightness-0 invert" />
        </Link>

        <span className="hidden lg:inline text-white/30 cursor-default">docs</span>
        <span className="hidden lg:inline text-white/30 cursor-default">faq</span>
        <span className="hidden md:inline text-white/30 cursor-default">about</span>
      </nav>

      <div aria-hidden className="min-w-0" />
    </header>
  )
}
