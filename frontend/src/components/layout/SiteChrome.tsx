'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { DashboardSidebar } from './DashboardSidebar'

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/pools') || pathname.startsWith('/alerts')

  if (isLanding) {
    return <main id="main-content" className="flex-1">{children}</main>
  }

  if (isDashboard) {
    return (
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main id="main-content" className="flex-1 md:ml-[220px] min-h-screen bg-[#faf3e4]">
          {children}
        </main>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 bg-[#faf3e4]">{children}</main>
    </>
  )
}
