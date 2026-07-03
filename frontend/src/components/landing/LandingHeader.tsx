'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Menu, X } from 'lucide-react'
import { LandingConnectButton } from './LandingConnectButton'

const comingSoon = ['analytics', 'docs', 'faq', 'about']

export function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative z-20">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 sm:px-8 py-6">
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

        <div className="flex justify-end min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-landing-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full border border-white/15 text-white/80 hover:border-white/30 hover:text-white transition-colors cursor-pointer"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-landing-menu"
        className={`sm:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col px-6 pb-4 text-sm">
          <Link
            href="/pools"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between py-3 border-t border-white/10 text-white/80 hover:text-white transition-colors"
          >
            pools <ChevronDown size={13} />
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="py-3 border-t border-white/10 text-white/80 hover:text-white transition-colors"
          >
            dashboard
          </Link>
          {comingSoon.map((label, i) => (
            <span
              key={label}
              className={`py-3 border-t border-white/10 text-white/30 cursor-default ${
                i === comingSoon.length - 1 ? 'border-b' : ''
              }`}
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
    </header>
  )
}
