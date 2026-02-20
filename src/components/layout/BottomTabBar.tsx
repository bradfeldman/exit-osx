'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { HomeIcon, ActionsIcon, EvidenceIcon, DiagnosisIcon } from './nav-icons'
import { MoreHorizontal } from 'lucide-react'
import { MoreSheet } from './MoreSheet'

const tabs = [
  { name: 'Value', href: '/dashboard', icon: HomeIcon },
  { name: 'Actions', href: '/dashboard/action-center', icon: ActionsIcon },
  { name: 'Evidence', href: '/dashboard/evidence', icon: EvidenceIcon },
  { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: DiagnosisIcon },
]

// Routes accessible through the More sheet — More tab shows active when on these
const moreRoutes = [
  '/dashboard/deal-room',
  '/dashboard/financials',
  '/dashboard/valuation',
  '/dashboard/loans',
  '/dashboard/settings',
]

export function BottomTabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = moreRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  return (
    <>
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around">
          {tabs.map((tab) => {
            const isActive = tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === tab.href || pathname.startsWith(tab.href + '/')
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[48px] transition-colors active:scale-95',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}
                <Icon className="h-6 w-6" />
                <span className={cn(
                  'text-[11px] leading-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>{tab.name}</span>
              </Link>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[48px] transition-colors active:scale-95',
              isMoreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {isMoreActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
            <MoreHorizontal className="h-6 w-6" />
            <span className={cn(
              'text-[11px] leading-tight',
              isMoreActive ? 'font-semibold' : 'font-medium'
            )}>More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
