'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCompany } from '@/contexts/CompanyContext'
import { useUserRole } from '@/contexts/UserRoleContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useAssessmentStatus } from '@/hooks/useAssessmentStatus'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { AccessRequestModal } from '@/components/access/AccessRequestModal'
import { PlanTier } from '@/lib/pricing'
import packageJson from '../../../package.json'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isPersonalFeature } from '@/lib/pricing'

interface NavLink {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiredPlan?: PlanTier
  featureKey?: string
}

const assessmentLinks: NavLink[] = [
  { name: 'Baseline Assessment', href: '/dashboard/assessment/company', icon: BriefcaseIcon, requiredPlan: 'growth', featureKey: 'company-assessment' },
  { name: 'Risk Assessment', href: '/dashboard/assessment/risk', icon: ShieldIcon, requiredPlan: 'growth', featureKey: 'risk-assessment' },
]

const financialsLinks: NavLink[] = [
  { name: 'Business Financials', href: '/dashboard/financials', icon: FinancialsIcon, requiredPlan: 'growth', featureKey: 'business-financials' },
  { name: 'DCF Valuation', href: '/dashboard/valuation', icon: ChartBarIcon, requiredPlan: 'exit-ready', featureKey: 'dcf-valuation' },
  { name: 'Personal Financial Statement', href: '/dashboard/financials/personal', icon: WalletIcon, requiredPlan: 'growth', featureKey: 'personal-financials' },
  { name: 'Retirement Calculator', href: '/dashboard/financials/retirement', icon: CalculatorIcon, requiredPlan: 'growth', featureKey: 'retirement-calculator' },
]

const loanCenterLinks: NavLink[] = [
  { name: 'Business Loans', href: '/dashboard/loans/business', icon: BankIcon, requiredPlan: 'growth', featureKey: 'business-loans' },
]

const dealRoomLinks: NavLink[] = [
  { name: 'Data Room', href: '/dashboard/data-room', icon: FolderIcon, requiredPlan: 'exit-ready', featureKey: 'data-room' },
  { name: 'Deal Tracker', href: '/dashboard/deal-tracker', icon: TargetIcon, requiredPlan: 'exit-ready', featureKey: 'deal-tracker' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading, isSelectedCompanySubscribingOwner } = useCompany()
  const { isSuperAdmin } = useUserRole()
  const subscription = useSubscription()
  const { hasInitialAssessment, hasPendingAssessment } = useAssessmentStatus()
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

  const handleCompanyChange = (companyId: string) => {
    if (companyId === '___add_new___') {
      router.push('/dashboard/company/setup')
      return
    }
    setSelectedCompanyId(companyId)

    // Redirect to dashboard if not already there
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
    } else {
      router.refresh()
    }
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  // Check if we're on the company setup page (adding a new company)
  const isOnSetupPage = pathname === '/dashboard/company/setup'

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sidebar px-6 pb-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex h-16 shrink-0 items-center">
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
        </Link>

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
          {!isLoading && companies.length > 0 && (
            <Select
              value={isOnSetupPage ? '___add_new___' : (selectedCompanyId || undefined)}
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent focus:ring-sidebar-primary focus:ring-offset-sidebar">
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
                      {isSelectedCompanySubscribingOwner ? (
                        <CrownIcon className="h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <BuildingIcon className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                      )}
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
                    <span className="flex items-center gap-2">
                      {company.isSubscribingOwner && (
                        <CrownIcon className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {company.name}
                      {company.role === 'staff' && (
                        <span className="text-xs text-muted-foreground">(Staff)</span>
                      )}
                    </span>
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
        <nav className="flex flex-1 flex-col">
          {/* SCORECARD Section */}
          <div className="mb-4">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Scorecard
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {/* Scorecard */}
              <li>
                <Link
                  href="/dashboard"
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                    pathname === '/dashboard'
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <DollarIcon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      pathname === '/dashboard' ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                    )}
                  />
                  Exit OSx Scorecard
                </Link>
              </li>

            </ul>
          </div>

          {/* ASSESSMENTS Section */}
          <div className="mb-4 pt-4 border-t border-sidebar-border/50">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Assessments
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {assessmentLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                const IconComponent = link.icon
                const isLocked = link.featureKey && !canAccessFeature(link.featureKey)
                // Show badge on Risk link when:
                // 1. Initial assessment is not complete (amber !)
                // 2. There's an open assessment waiting (red dot)
                // 3. A new assessment is available (red dot)
                const needsInitialAssessment = link.name === 'Risk Assessment' && !hasInitialAssessment
                const hasPendingRiskAssessment = link.name === 'Risk Assessment' && hasInitialAssessment && hasPendingAssessment

                if (isLocked) {
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
                      {needsInitialAssessment && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white">
                          !
                        </span>
                      )}
                      {hasPendingRiskAssessment && (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}

              {/* Action Plan */}
              <li>
                <Link
                  href="/dashboard/playbook"
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                    pathname.startsWith('/dashboard/playbook')
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <ListIcon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      pathname.startsWith('/dashboard/playbook') ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                    )}
                  />
                  Action Plan
                </Link>
              </li>
            </ul>
          </div>

          {/* FINANCIALS Section */}
          <div className="mb-4 pt-4 border-t border-sidebar-border/50">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Financials
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {financialsLinks.map((link) => {
                // Special handling for Business Financials - only active for main page and statements subpages
                const isActive = link.href === '/dashboard/financials'
                  ? pathname === link.href || pathname.startsWith('/dashboard/financials/statements')
                  : pathname === link.href || pathname.startsWith(link.href + '/')
                const IconComponent = link.icon
                const isLocked = link.featureKey && !canAccessFeature(link.featureKey)

                if (isLocked) {
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
                      {link.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* LOAN CENTER Section */}
          <div className="mb-4 pt-4 border-t border-sidebar-border/50">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Capital
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {loanCenterLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                const IconComponent = link.icon
                const isLocked = link.featureKey && !canAccessFeature(link.featureKey)

                if (isLocked) {
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
                      {link.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* DEAL ROOM Section */}
          <div className="mb-4 pt-4 border-t border-sidebar-border/50">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Deal Room
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {dealRoomLinks.map((link) => {
                const isActive = pathname.startsWith(link.href)
                const IconComponent = link.icon
                const isLocked = link.featureKey && !canAccessFeature(link.featureKey)

                if (isLocked) {
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
                      {link.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ADMIN Section */}
          <div className="flex-1 pt-4 border-t border-sidebar-border/50">
            <p className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Admin
            </p>
            <ul role="list" className="mt-1 space-y-1">
              {/* Team Settings */}
              <li>
                <Link
                  href="/dashboard/settings/organization"
                  className={cn(
                    'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                    pathname.startsWith('/dashboard/settings/organization')
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <UsersIcon className={cn(
                    'h-5 w-5 shrink-0',
                    pathname.startsWith('/dashboard/settings/organization')
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                  )} />
                  Exit Team
                </Link>
              </li>

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

function _ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
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

function _ScaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
    </svg>
  )
}

function _CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  )
}

function _ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
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

function _QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

function _TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
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

function _UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
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
