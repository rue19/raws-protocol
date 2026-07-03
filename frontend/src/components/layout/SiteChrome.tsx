'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/** Landing page ("/") owns its own header/footer — everything else gets the shared app chrome. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  if (isLanding) {
    return <main className="flex-1">{children}</main>
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
