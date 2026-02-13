'use client'

import { Fragment, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading } = useCompany()
  const { progressionData } = useProgression()
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Delayed close to prevent accidental closes when hovering near edge or using dropdowns
  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      onClose()
    }, 150)
  }, [onClose])

  // Cancel close if mouse re-enters
  const handleMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const handleCompanyChange = (companyId: string) => {
    if (companyId === '___add_new___') {
      router.push('/dashboard/company/setup')
      onClose()
      return
    }
    setSelectedCompanyId(companyId)
    router.refresh()
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  // Check if we're on the company setup page (adding a new company)
  const isOnSetupPage = pathname === '/dashboard/company/setup'

  const handleLinkClick = () => {
    onClose()
  }

  // No company: Don't show mobile nav
  if (!isOpen || !progressionData?.hasCompany) return null

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer - closes when mouse leaves (with delay) */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar lg:hidden overflow-y-auto"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        <div className="flex flex-col h-full px-4 pb-4">
          {/* Close button */}
          <div className="flex h-16 items-center justify-between">
            <svg viewBox="0 0 800 200" className="h-6 w-auto" aria-label="Exit OSx">
              <g transform="translate(0.000000,200.000000) scale(0.100000,-0.100000)">
                <path fill="#FFFFFF" d="M2725,1759c-28-28-210-208-406-400l-357-349l-93,140l-94,139h-195c-107,1-201-3-208-7c-9-6,33-74,149-243
                  c88-129,168-242,178-252c17-18,19-17,50,9c17,14,33,25,35,23c11-12,36-70,35-81c0-13-41-49-426-382c-106-92-195-171-198-176
                  c-4-6,51-10,152-10l158,1l823,819l823,820h-188h-189L2725,1759z"/>
                <path fill="#FFFFFF" d="M317,1683C290,1464,169,198,175,192c3-4,193-9,420-10l413-4l86,84c47,46,86,91,86,101c0,16-23,17-335,17H510
                  v23c0,12,9,114,20,227s20,213,20,223c0,16,18,17,239,17c283,0,359,6,365,29c2,9,7,51,11,94l7,77H876H580v23c0,20,21,249,36,385
                  l5,52h319h318l7,91c4,49,4,93,0,97s-217,8-474,10l-468,4L317,1683z"/>
                <path fill="#FFFFFF" d="M4715,1580c-284-41-503-258-565-561c-25-119-27-301-4-402c51-228,208-387,439-443c47-12,111-17,195-17
                  c376,0,613,176,701,521c25,100,27,390,3,473c-58,196-217,355-414,413C5005,1584,4801,1593,4715,1580z M4997,1370
                  c62-26,135-101,163-165c11-25,25-75,31-112c15-85,6-315-16-403c-37-151-132-287-232-333c-40-18-66-22-153-22c-124,0-173,18-238,90
                  c-81,87-112,184-112,350c0,340,105,549,310,616C4797,1407,4941,1395,4997,1370z"/>
                <path fill="#FFFFFF" d="M6079,1571c-144-20-284-88-349-171c-53-67-73-126-78-228c-4-88-3-96,27-157c53-108,115-148,351-230
                  c248-86,290-118,290-222c0-151-97-210-324-200c-129,5-190,21-319,79c-40,19-71,28-77,22c-4-5-12-49-17-97c-11-105-12-104,110-142
                  c115-37,204-48,372-49c115-1,165,3,213,17c158,45,250,114,309,234c36,74,38,80,38,182c0,99-2,110-30,160c-52,94-128,141-360,221
                  c-178,62-214,79-248,120c-75,89-23,225,100,261c106,31,310,9,447-48c32-13,62-21,67-16c4,4,9,51,11,103l3,95l-55,17
                  C6434,1563,6197,1587,6079,1571z"/>
                <path fill="#FFFFFF" d="M3430,1501c-64-15-123-30-131-33c-12-5-18-29-23-100c-3-51-9-114-13-140l-5-47l-92-3l-91-3l-8-63
                  c-13-92-12-92,89-92h87l-7-47c-23-169-56-565-51-606c10-69,58-135,124-169c49-26,62-28,170-28c118,0,224,18,247,43
                  c12,12,36,128,28,136c-2,2-29-1-60-8c-108-21-179-8-204,38c-16,30-12,116,15,375c14,131,25,244,25,252c0,11,26,14,134,14h135l6,58
                  c3,31,8,67,11,80c4,22,4,22-132,22h-136l6,33c5,28,36,290,36,310C3590,1535,3551,1530,3430,1501z"/>
                <path fill="#FFFFFF" d="M2734,1193l-71-4l-12-122c-7-67-30-288-52-491c-22-204-37-376-35-383c7-17,271-19,281-2c7,10,36,274,86,772
                  c12,119,19,220,15,224C2938,1196,2833,1199,2734,1193z"/>
                <path fill="#FFFFFF" d="M6721.4,876.2l-23.8-4.5l121.8-177.5c118.8-173,121.8-178.2,108.4-193.1c-6.7-8.2-74.3-79.5-149.3-158.2
                  c-75-78-141.1-149.3-147-157.4c-10.4-15.6-10.4-15.6,106.9-15.6h117.3l89.1,107.7c48.3,59.4,90.6,107.7,93.6,107.7
                  c3,0,34.9-48.3,71.3-107.7l65.4-106.9l124-0.7h124.8l-75,109.9c-166.4,242.1-159.7,230.2-147,250.3c5.9,10.4,71.3,81.7,145.6,158.9
                  c75,77.2,144.1,150.8,155.2,163.4l19.3,23h-115.9H7291l-76.5-87.6c-42.3-47.5-88.4-101-103.2-118.8l-27.5-31.9L7011,759.7
                  l-73.5,122.5l-96.5-0.7C6788.2,881.4,6734,879.2,6721.4,876.2z"/>
                <path fill="#FFFFFF" d="M2028,587l-118-112l102-148l101-147h204c111,0,203,3,202,8c-1,18-347,507-360,509C2151,698,2092,649,2028,587z"/>
              </g>
              <polygon fill="#B87333" points="181.9,126.2 315.1,19 277.4,19 196.2,99 178.4,118.1"/>
            </svg>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Company Selector */}
          <div className="mb-4">
            {!isLoading && companies.length === 0 && (
              <button
                onClick={() => {
                  router.push('/dashboard/company/setup')
                  onClose()
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-primary hover:bg-sidebar-accent transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Company
              </button>
            )}
            {!isLoading && companies.length > 0 && (
              <Select
                value={isOnSetupPage ? '___add_new___' : (selectedCompanyId || undefined)}
                onValueChange={handleCompanyChange}
              >
                <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                  <div className="flex items-center gap-2 truncate">
                    {isOnSetupPage ? (
                      <>
                        <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-primary">New Company</span>
                      </>
                    ) : (
                      <>
                        <BuildingIcon className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                        <SelectValue placeholder="Select company">
                          {selectedCompany?.name || 'Select company'}
                        </SelectValue>
                      </>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                  <div className="border-t border-border my-1" />
                  <SelectItem value="___add_new___" className="text-primary">
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add Company
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {/* CORE Section -- 5-Mode Navigation (all unlocked) */}
            {[
              { name: 'Value', href: '/dashboard', icon: HomeIcon, exact: true },
              { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: DiagnosisIcon },
              { name: 'Actions', href: '/dashboard/actions', icon: ActionsIcon },
              { name: 'Evidence', href: '/dashboard/evidence', icon: EvidenceIcon },
              { name: 'Deal Room', href: '/dashboard/deal-room', icon: DealRoomIcon },
            ].map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(link.href + '/')
              const Icon = link.icon

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.name}
                </Link>
              )
            })}

            {/* VALUE MODELING Section - always visible, no gating */}
            {progressionData && (
              <>
                <div className="pt-4 border-t border-sidebar-border mt-4">
                  <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Value Modeling
                  </p>
                </div>

                <Link
                  href="/dashboard/financials"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === '/dashboard/financials' || pathname.startsWith('/dashboard/financials/statements')
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <FinancialsIcon className="h-5 w-5" />
                  Business Financials
                </Link>

                <Link
                  href="/dashboard/financials/retirement"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === '/dashboard/financials/retirement'
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <CalculatorIcon className="h-5 w-5" />
                  Retirement Calculator
                </Link>

                <Link
                  href="/dashboard/financials/personal"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === '/dashboard/financials/personal'
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <WalletIcon className="h-5 w-5" />
                  Personal Financials
                </Link>
              </>
            )}

            {/* CAPITAL Section - always visible, no gating */}
            {progressionData && (
              <>
                <div className="pt-4 border-t border-sidebar-border mt-4">
                  <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Capital
                  </p>
                </div>

                <Link
                  href="/dashboard/loans/business"
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith('/dashboard/loans')
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <BankIcon className="h-5 w-5" />
                  Business Loans
                </Link>
              </>
            )}

            {/* Settings */}
            <div className="pt-4 border-t border-sidebar-border mt-4 space-y-1">
              <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Admin
              </p>
              <Link
                href="/dashboard/settings"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname?.startsWith('/dashboard/settings')
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <SettingsIcon className="h-5 w-5" />
                Settings
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </Fragment>
  )
}

// Icon components
function FinancialsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
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

// 5-Mode Navigation Icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function DiagnosisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  )
}

function ActionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function EvidenceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function DealRoomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

