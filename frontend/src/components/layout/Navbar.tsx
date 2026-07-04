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
    <nav className="sticky top-0 z-50 bg-[#faf3e4]/95 backdrop-blur-sm border-b border-[#e5d9bf]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <svg width="20" height="24" viewBox="0 0 36 42" fill="none">
              <path d="M18 3C18 3 7 9 7 19C7 25 11 29 15 31L15 39" stroke="#0f1b2d" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M18 3C18 3 29 9 29 19C29 25 25 29 21 31L21 39" stroke="#0f1b2d" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="15" y1="39" x2="21" y2="39" stroke="#0f1b2d" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="18" cy="19" r="4.5" stroke="#0f1b2d" strokeWidth="2.5"/>
            </svg>
            <span className="hidden sm:inline font-mono text-xs text-[#6b7280] truncate">
              · Stellar Testnet
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-xs text-[#6b7280] hover:text-[#0f1b2d] transition-colors"
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
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded text-[#6b7280] hover:text-[#0f1b2d] transition-colors cursor-pointer"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-menu"
        className={`sm:hidden overflow-hidden border-t border-[#e5d9bf] transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-3 font-mono text-xs text-[#6b7280] hover:text-[#0f1b2d] transition-colors border-b border-[#e5d9bf] last:border-b-0"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
