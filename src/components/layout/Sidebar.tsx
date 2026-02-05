'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import { useUserRole } from '@/contexts/UserRoleContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { AccessRequestModal } from '@/components/access/AccessRequestModal'
import { ProgressionLockedItem } from '@/components/ui/ProgressionLockedItem'
import { PlanTier } from '@/lib/pricing'
import packageJson from '../../../package.json'
// Select imports removed - company selector is no longer a dropdown
import { isPersonalFeature } from '@/lib/pricing'

interface NavLink {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiredPlan?: PlanTier
  featureKey?: string
  progressionKey?: string // Key for progression-based locking
}

// CORE section links - 5 Mode Navigation (Dan/Alex design)
const coreLinks: NavLink[] = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: DiagnosisIcon },
  { name: 'Actions', href: '/dashboard/actions', icon: ActionsIcon },
  { name: 'Evidence', href: '/dashboard/evidence', icon: EvidenceIcon },
  { name: 'Deal Room', href: '/dashboard/deal-room', icon: DealRoomIcon },
]

// VALUE MODELING section (Stage 4+)
const valueModelingLinks: NavLink[] = [
  { name: 'Business Financials', href: '/dashboard/financials', icon: FinancialsIcon, requiredPlan: 'growth', featureKey: 'business-financials' },
  { name: 'DCF Valuation', href: '/dashboard/valuation', icon: ChartBarIcon, requiredPlan: 'exit-ready', featureKey: 'dcf-valuation' },
  { name: 'Retirement Calculator', href: '/dashboard/financials/retirement', icon: CalculatorIcon, requiredPlan: 'growth', featureKey: 'retirement-calculator', progressionKey: 'retirementCalculator' },
]

// Personal financials (always in financials section when unlocked)
const personalFinancialsLink: NavLink = {
  name: 'Personal Financial Statement',
  href: '/dashboard/financials/personal',
  icon: WalletIcon,
  requiredPlan: 'growth',
  featureKey: 'personal-financials',
}

// CAPITAL section (Stage 6+)
const capitalLinks: NavLink[] = [
  { name: 'Business Loans', href: '/dashboard/loans/business', icon: BankIcon, requiredPlan: 'growth', featureKey: 'business-loans' },
]

// EXIT TOOLS section (Stage 7)
const exitToolsLinks: NavLink[] = [
  { name: 'Data Room', href: '/dashboard/data-room', icon: FolderIcon, requiredPlan: 'exit-ready', featureKey: 'data-room' },
  { name: 'Deal Tracker', href: '/dashboard/deal-tracker', icon: TargetIcon, requiredPlan: 'exit-ready', featureKey: 'deal-tracker' },
  { name: 'Contacts', href: '/dashboard/contacts', icon: ContactsIcon, requiredPlan: 'exit-ready', featureKey: 'deal-tracker' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading, isSelectedCompanySubscribingOwner } = useCompany()
  const { isSuperAdmin } = useUserRole()
  const subscription = useSubscription()
  const progression = useProgression()
  const [developerExpanded, setDeveloperExpanded] = useState(false)
  const [globalExpanded, setGlobalExpanded] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [lockedFeature, setLockedFeature] = useState<{ key: string; name: string } | null>(null)
  const [requestAccessModalOpen, setRequestAccessModalOpen] = useState(false)
  const [requestAccessFeature, setRequestAccessFeature] = useState<{ key: string; name: string } | null>(null)

  // Defensive: if subscription is still loading, allow all features to prevent UI breaking
  const canAccessFeature = subscription.isLoading
    ? () => true
    : subscription.canAccessFeature

  const shouldShowRequestAccess = subscription.isLoading
    ? () => false
    : subscription.shouldShowRequestAccess

  // Progression unlocks
  const { stage, unlocks, getUnlockHint, isProgressionLocked } = progression

  const handleLockedClick = (featureKey: string, featureName: string) => {
    // Check if this is a personal feature that staff can request access to
    if (isPersonalFeature(featureKey) && shouldShowRequestAccess(featureKey)) {
      setRequestAccessFeature({ key: featureKey, name: featureName })
      setRequestAccessModalOpen(true)
    } else {
      setLockedFeature({ key: featureKey, name: featureName })
      setUpgradeModalOpen(true)
    }
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  // Helper to render a nav link with both subscription and progression locking
  const renderNavLink = (link: NavLink, options?: { showBadge?: boolean; badgeType?: 'warning' | 'alert' }) => {
    // Special case for Home (/dashboard) - only match exact path
    const isActive = link.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === link.href || pathname.startsWith(link.href + '/')
    const IconComponent = link.icon

    // Check subscription lock first
    const isSubscriptionLocked = link.featureKey && !canAccessFeature(link.featureKey)

    // Check progression lock
    const progressionLocked = link.progressionKey && isProgressionLocked(link.progressionKey)
    const unlockHint = link.progressionKey ? getUnlockHint(link.progressionKey) : null

    // If progression locked (and not subscription locked), show progression locked item
    if (progressionLocked && !isSubscriptionLocked && unlockHint) {
      return (
        <li key={link.href}>
          <ProgressionLockedItem
            name={link.name}
            icon={IconComponent}
            unlockHint={unlockHint}
          />
        </li>
      )
    }

    // If subscription locked, show subscription locked button
    if (isSubscriptionLocked) {
      return (
        <li key={link.href}>
          <button
            onClick={() => handleLockedClick(link.featureKey!, link.name)}
            className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors text-sidebar-foreground/50 hover:bg-sidebar-accent/50"
          >
            <IconComponent className="h-5 w-5 shrink-0 text-sidebar-foreground/40" />
            <span className="flex-1 text-left">{link.name}</span>
            <LockIcon className="h-4 w-4 text-sidebar-foreground/40" />
          </button>
        </li>
      )
    }

    // Normal unlocked link
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
          {options?.showBadge && options.badgeType === 'warning' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white">
              !
            </span>
          )}
          {options?.showBadge && options.badgeType === 'alert' && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sidebar px-6 pb-4">
        {/* Logo */}
        <a href="https://exitosx.com" target="_blank" rel="noopener noreferrer" className="flex h-16 shrink-0 items-center">
          {/* Wordmark - Light version for dark sidebar */}
          <svg viewBox="0 0 800 200" className="h-7 w-auto" aria-label="Exit OSx">
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
        </a>

        {/* Company Selector */}
        <div className="-mt-2 mb-2">
          {!isLoading && companies.length === 0 && (
            <button
              onClick={() => router.push('/dashboard/company/setup')}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-primary hover:bg-sidebar-accent transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Company
            </button>
          )}
          {!isLoading && companies.length > 0 && selectedCompany && (
            <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent/50 border border-sidebar-border rounded-md text-sidebar-foreground">
              {isSelectedCompanySubscribingOwner ? (
                <CrownIcon className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <BuildingIcon className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
              )}
              <span className="truncate font-medium">{selectedCompany.name}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          {/* CORE Section - matching demo structure */}
          <div className="mb-4">
            <ul role="list" className="space-y-1">
              {coreLinks.map((link) => renderNavLink(link))}
            </ul>
          </div>

          {/* VALUE MODELING Section - Stage 4+ */}
          {stage >= 4 && (
            <div className="mb-4 pt-4 border-t border-sidebar-border/50">
              <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-2">
                Value Modeling
                {stage === 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-normal normal-case">
                    New
                  </span>
                )}
              </p>
              <ul role="list" className="mt-1 space-y-1">
                {valueModelingLinks.map((link) => renderNavLink(link))}
                {/* Personal Financial Statement */}
                {renderNavLink(personalFinancialsLink)}
              </ul>
            </div>
          )}

          {/* Show locked Value Modeling preview for stages 1-3 */}
          {stage >= 1 && stage < 4 && (
            <div className="mb-4 pt-4 border-t border-sidebar-border/50">
              <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/30 uppercase tracking-wider">
                Value Modeling
              </p>
              <ul role="list" className="mt-1 space-y-1">
                <li>
                  <ProgressionLockedItem
                    name="Business Financials"
                    icon={FinancialsIcon}
                    unlockHint="Upload business financials to unlock"
                  />
                </li>
              </ul>
            </div>
          )}

          {/* CAPITAL Section - Stage 6+ */}
          {stage >= 6 && (
            <div className="mb-4 pt-4 border-t border-sidebar-border/50">
              <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-2">
                Capital
                {stage === 6 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-normal normal-case">
                    New
                  </span>
                )}
              </p>
              <ul role="list" className="mt-1 space-y-1">
                {capitalLinks.map((link) => renderNavLink(link))}
              </ul>
            </div>
          )}

          {/* EXIT TOOLS Section - Stage 7 */}
          {stage >= 7 && (
            <div className="mb-4 pt-4 border-t border-sidebar-border/50">
              <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-2">
                Exit Tools
                {stage === 7 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-normal normal-case">
                    New
                  </span>
                )}
              </p>
              <ul role="list" className="mt-1 space-y-1">
                {exitToolsLinks.map((link) => renderNavLink(link))}
              </ul>
            </div>
          )}

          {/* ADMIN Section */}
          <div className="flex-1 pt-4 border-t border-sidebar-border/50">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Admin
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {/* Company Settings */}
              <li>
                <Link
                  href="/dashboard/settings/company"
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                    pathname === '/dashboard/settings/company'
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <SettingsIcon className={cn(
                    'h-5 w-5 shrink-0',
                    pathname === '/dashboard/settings/company'
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                  )} />
                  Settings
                </Link>
              </li>

              {/* Developer section - Super Admin only */}
              {isSuperAdmin && (
                <li>
                  <button
                    onClick={() => setDeveloperExpanded(!developerExpanded)}
                    className="flex items-center justify-between w-full gap-x-3 p-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-x-3">
                      <CodeIcon className="h-5 w-5 shrink-0 text-sidebar-foreground/60" />
                      Developer
                    </div>
                    <ChevronIcon
                      className={cn(
                        'h-4 w-4 transition-transform text-sidebar-foreground/60',
                        developerExpanded ? 'rotate-180' : ''
                      )}
                    />
                  </button>
                  <ul className={cn(
                    'ml-7 space-y-1 overflow-hidden transition-all duration-200',
                    developerExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                  )}>
                    <li>
                      <Link
                        href="/dashboard/developer/multiple-adjustment"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/developer/multiple-adjustment')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        Multiple Adjustment
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/company/bri-weights"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname === '/dashboard/company/bri-weights'
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        BRI Weights
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/developer/snapshot"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/developer/snapshot')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        Snapshot
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/developer/industry-multiples"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/developer/industry-multiples')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        Industry Multiples
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/developer/task-viewer"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/developer/task-viewer')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        Task Viewer
                      </Link>
                    </li>
                  </ul>
                </li>
              )}

              {/* Global section - Super Admin only */}
              {isSuperAdmin && (
                <li>
                  <button
                    onClick={() => setGlobalExpanded(!globalExpanded)}
                    className="flex items-center justify-between w-full gap-x-3 p-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-x-3">
                      <GearIcon className="h-5 w-5 shrink-0 text-sidebar-foreground/60" />
                      Global
                    </div>
                    <ChevronIcon
                      className={cn(
                        'h-4 w-4 transition-transform text-sidebar-foreground/60',
                        globalExpanded ? 'rotate-180' : ''
                      )}
                    />
                  </button>
                  <ul className={cn(
                    'ml-7 space-y-1 overflow-hidden transition-all duration-200',
                    globalExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                  )}>
                    <li>
                      <Link
                        href="/dashboard/developer/bri-weighting"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/developer/bri-weighting')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        BRI Weighting
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/global/add-question"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/global/add-question')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        Add Question
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/global/add-task"
                        className={cn(
                          'block rounded-md px-2 py-1.5 text-sm transition-colors',
                          pathname.startsWith('/dashboard/global/add-task')
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        Add Task
                      </Link>
                    </li>
                  </ul>
                </li>
              )}
            </ul>
          </div>
        </nav>

        {/* Version & Company */}
        <div className="mt-auto pt-4 pb-2 space-y-1">
          <p className="text-xs text-sidebar-foreground/40 text-center">
            Exit OSx v{packageJson.version}
          </p>
          <p className="text-[10px] text-sidebar-foreground/30 text-center leading-tight">
            Exit OSx is a Pasadena Private Financial Group Company
          </p>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={lockedFeature?.key}
        featureDisplayName={lockedFeature?.name}
      />

      {/* Request Access Modal */}
      {requestAccessFeature && (
        <AccessRequestModal
          open={requestAccessModalOpen}
          onOpenChange={setRequestAccessModalOpen}
          feature={requestAccessFeature.key}
          featureDisplayName={requestAccessFeature.name}
        />
      )}
    </div>
  )
}

// Simple icon components
function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
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

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
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

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  )
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
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

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
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

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 5 5.5.75-4 4 1 5.75-5-2.75-5 2.75 1-5.75-4-4L9.5 8 12 3z" />
    </svg>
  )
}

function ContactsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
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
