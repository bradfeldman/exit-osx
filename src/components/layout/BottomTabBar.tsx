'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { HomeIcon, DiagnosisIcon, ActionsIcon, EvidenceIcon } from './nav-icons'
import { MoreHorizontal } from 'lucide-react'
import { MoreSheet } from './MoreSheet'

const tabs = [
  { name: 'Value', href: '/dashboard', icon: HomeIcon },
  { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: DiagnosisIcon },
  { name: 'Actions', href: '/dashboard/actions', icon: ActionsIcon },
  { name: 'Evidence', href: '/dashboard/evidence', icon: EvidenceIcon },
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14 items-center justify-around">
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
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{tab.name}</span>
              </Link>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors',
              isMoreActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
