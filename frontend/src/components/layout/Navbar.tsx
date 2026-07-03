'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ConnectButton } from '@/components/wallet/ConnectButton'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pools', label: 'Pools' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-noir/95 backdrop-blur-sm border-b border-cotton/8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/logo.svg" alt="RAW$" className="h-8 w-auto shrink-0 filter brightness-0 invert" />
            <span className="hidden sm:inline text-dim text-xs font-mono truncate">
              · Stellar Testnet
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-xs text-dim hover:text-cotton transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ConnectButton />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded text-dim hover:text-cotton transition-colors cursor-pointer"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-menu"
        className={`sm:hidden overflow-hidden border-t border-cotton/8 transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-3 font-mono text-xs text-dim hover:text-cotton transition-colors border-b border-cotton/8 last:border-b-0"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
