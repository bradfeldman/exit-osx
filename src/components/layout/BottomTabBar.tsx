'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { HomeIcon, DiagnosisIcon, ActionsIcon, EvidenceIcon, DealRoomIcon } from './nav-icons'

const tabs = [
  { name: 'Value', href: '/dashboard', icon: HomeIcon },
  { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: DiagnosisIcon },
  { name: 'Actions', href: '/dashboard/actions', icon: ActionsIcon },
  { name: 'Evidence', href: '/dashboard/evidence', icon: EvidenceIcon },
  { name: 'Deal Room', href: '/dashboard/deal-room', icon: DealRoomIcon },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
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
      </div>
    </nav>
  )
}
