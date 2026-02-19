'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { HomeIcon, DiagnosisIcon, ActionsIcon, EvidenceIcon, DealRoomIcon } from './nav-icons'
import packageJson from '../../../package.json'

interface NavLink {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  exactMatch?: boolean    // Only highlight on exact pathname match
}

// CORE section links - 5 Mode Navigation (all unlocked, no gating)
const coreLinks: NavLink[] = [
  { name: 'Value', href: '/dashboard', icon: HomeIcon },
  { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: DiagnosisIcon },
  { name: 'Actions', href: '/dashboard/actions', icon: ActionsIcon },
  { name: 'Evidence', href: '/dashboard/evidence', icon: EvidenceIcon },
  { name: 'Deal Room', href: '/dashboard/deal-room', icon: DealRoomIcon },
]

// VALUE MODELING section (no subscription/progression gating)
const valueModelingLinks: NavLink[] = [
  { name: 'Business Financials', href: '/dashboard/financials', icon: FinancialsIcon, exactMatch: true },
  { name: 'DCF Valuation', href: '/dashboard/valuation', icon: DCFIcon },
]

const retirementCalculatorLink: NavLink = {
  name: 'Retirement Calculator', href: '/dashboard/financials/retirement', icon: CalculatorIcon,
}

// Personal financials (always visible, no gating)
const personalFinancialsLink: NavLink = {
  name: 'Personal Financial Statement',
  href: '/dashboard/financials/personal',
  icon: WalletIcon,
}

// CAPITAL section (no subscription gating)
const capitalLinks: NavLink[] = [
  { name: 'Business Loans', href: '/dashboard/loans/business', icon: BankIcon },
]

// EXIT TOOLS section removed -- consolidated into Mode 5 (Deal Room) at /dashboard/deal-room

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { companies, isLoading } = useCompany()
  const { progressionData } = useProgression()

  // Helper to render a nav link (all items unlocked, no gating)
  const renderNavLink = (link: NavLink) => {
    // Special case for Value (/dashboard) - only match exact path
    const isActive = link.href === '/dashboard'
      ? pathname === '/dashboard'
      : link.exactMatch
        ? pathname === link.href
        : pathname === link.href || pathname.startsWith(link.href + '/')
    const IconComponent = link.icon

    return (
      <li key={link.href}>
        <Link
          href={link.href}
          className={cn(
            'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <IconComponent
            className={cn(
              'h-5 w-5 shrink-0',
              isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
            )}
          />
          <span className="flex-1">{link.name}</span>
        </Link>
      </li>
    )
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sidebar border-r border-sidebar-border px-6 pb-4">
        {/* Logo */}
        <a href="https://exitosx.com" target="_blank" rel="noopener noreferrer" className="flex h-16 shrink-0 items-center gap-2.5 pb-4 mb-2 border-b border-sidebar-border/50">
          <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" fill="none" aria-label="Exit OS">
            <rect width="32" height="32" rx="8" fill="var(--sidebar-primary)" />
            <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.3px' }}>Exit OS</span>
        </a>

        {/* Add Company button (company name moved to Header - BF-006) */}
        {!isLoading && companies.length === 0 && (
          <div className="-mt-2 mb-2">
            <button
              onClick={() => router.push('/dashboard/company/setup')}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-primary hover:bg-sidebar-accent transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Company
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          {/* CORE Section - matching demo structure */}
          <div className="mb-4">
            <ul role="list" className="space-y-1">
              {coreLinks.map((link) => renderNavLink(link))}
            </ul>
          </div>

          {/* FINANCIAL TOOLS Section - always visible so users see the full map */}
          {progressionData && (
            <div className="mb-4 pt-4 border-t border-sidebar-border/50">
              <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Financial Tools
              </p>
              <ul role="list" className="mt-1 space-y-1">
                {valueModelingLinks.map((link) => renderNavLink(link))}
                {renderNavLink(personalFinancialsLink)}
                {renderNavLink(retirementCalculatorLink)}
              </ul>
            </div>
          )}

          {/* CAPITAL Section - always visible so users see the full journey */}
          {progressionData && (
            <div className="mb-4 pt-4 border-t border-sidebar-border/50">
              <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Capital
              </p>
              <ul role="list" className="mt-1 space-y-1">
                {capitalLinks.map((link) => renderNavLink(link))}
              </ul>
            </div>
          )}

          {/* Settings */}
          <div className="flex-1 pt-4 border-t border-sidebar-border/50">
            <ul role="list" className="space-y-1">
              <li>
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                    pathname?.startsWith('/dashboard/settings')
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <SettingsIcon className={cn(
                    'h-5 w-5 shrink-0',
                    pathname?.startsWith('/dashboard/settings')
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                  )} />
                  Settings
                </Link>
              </li>

            </ul>
          </div>
        </nav>

        {/* Version & Company */}
        <div className="mt-auto pt-4 pb-2 space-y-1">
          <p className="text-xs text-sidebar-foreground/40 text-center">
            Exit OSx v{packageJson.version}
          </p>
        </div>
      </div>

    </div>
  )
}

// Simple icon components
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function FinancialsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  )
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
    </svg>
  )
}

function BankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
    </svg>
  )
}

function DCFIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

