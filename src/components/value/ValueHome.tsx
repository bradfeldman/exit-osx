'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useExposure } from '@/contexts/ExposureContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { useUserRole } from '@/contexts/UserRoleContext'
import Link from 'next/link'
import { ValueHomeLoading } from './ValueHomeLoading'
import { ValueHomeError } from './ValueHomeError'
import { DisclosureTrigger } from '@/components/disclosures/DisclosureTrigger'
import { WeeklyCheckInTrigger } from '@/components/weekly-check-in/WeeklyCheckInTrigger'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { PlatformTour } from './PlatformTour'
import { SinceLastVisitBanner } from './SinceLastVisitBanner'
import { EmailVerificationBanner } from './EmailVerificationBanner'
import { FirstVisitDashboard } from './FirstVisitDashboard'
import styles from '@/components/home/home.module.css'
import type { CoreFactors } from '@/lib/valuation/calculate-valuation'

// No dynamic imports needed — all heavy below-fold components removed in this render pass

interface DashboardData {
  company: {
    id: string
    name: string
    annualRevenue: number
    annualEbitda: number
    adjustedEbitda: number
  }
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    marketPremium: number
    briScore: number | null
    coreScore: number | null
    finalMultiple: number
    multipleRange: { low: number; high: number }
    industryName: string
    isEstimated: boolean
    useDCFValue?: boolean
    hasCustomMultiples?: boolean
    multipleSource?: string | null
    multipleAsOf?: string | null
    // V2 fields
    bqsScore?: number | null
    drsScore?: number | null
    rssScore?: number | null
    evRange?: { low: number; mid: number; high: number } | null
    riskDiscounts?: Array<{ name: string; rate: number; explanation: string }> | null
    qualityAdjustments?: Array<{ factor: string; impact: number; explanation: string }> | null
  } | null
  tier2: {
    adjustedEbitda: number
    isEbitdaEstimated: boolean
    isEbitdaFromFinancials: boolean
    ebitdaSource: string
    fiscalYear: number | null
    multipleRange: { low: number; high: number; current: number }
    hasCustomMultiples: boolean
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string; dcfValue: number | null }>
    briTrend: { direction: string; change: number } | null
    exitWindow: string | null
    annotations: Array<{
      date: string
      label: string
      detail: string
      impact: string
      type: 'positive' | 'negative' | 'neutral'
    }>
  }
  bridgeCategories: Array<{
    category: string
    label: string
    score: number
    dollarImpact: number
    weight: number
    buyerExplanation: string
  }>
  topSignals: Array<{
    id: string
    title: string
    severity: string
    category: string | null
    createdAt: string
    estimatedValueImpact: number | null
  }>
  valueGapDelta: number | null
  previousValueGap: number | null
  progressContext: {
    valueRecoveredLifetime: number
    valueAtRiskCurrent: number
    openSignalCount: number
    valueRecoveredThisMonth: number
    valueAtRiskThisMonth: number
    ledgerEventsThisMonth: number
  }
  nextMove: {
    task: {
      id: string
      title: string
      description: string
      briCategory: string
      estimatedHours: number | null
      rawImpact: number
      status: string
      buyerConsequence: string | null
      effortLevel: string
      linkedPlaybookSlug: string | null
      startedAt: string | null
    } | null
    comingUp: Array<{
      id: string
      title: string
      estimatedHours: number | null
      rawImpact: number
      briCategory: string
    }>
  }
  proceedsInputs?: {
    currentValue: number
    netDebt: number
    ownershipPercent: number
    entityType: string | null
  } | null
  dcfValuation: {
    enterpriseValue: number
    equityValue: number | null
    wacc: number | null
    impliedMultiple: number | null
    source: 'auto' | 'manual'
    multipleBasedValue: number
    divergenceRatio: number | null
    confidenceSignal: 'high' | 'moderate' | 'low'
  } | null
  coreFactors: (CoreFactors & { coreScore: number | null }) | null
  hasAssessment: boolean
  sinceLastVisit?: Array<{ type: string; message: string; date: string }>
  lastVisitAt?: string | null
  emailVerified?: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Returns the relative time string for a date, e.g. "2 days ago", "just now".
 * Used for the "Last updated" line in the top bar.
 */
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * Derives a fill class name for a BRI factor bar based on score (0–100).
 * Green >= 70, orange 45–69, red < 45, accent used as a mid-high variant.
 */
function briFillClass(score: number): string {
  if (score >= 80) return styles.fillGreen
  if (score >= 65) return styles.fillAccent
  if (score >= 45) return styles.fillOrange
  return styles.fillRed
}

/**
 * Derives an inline color value for a BRI factor score number.
 */
function briScoreColor(score: number): string {
  if (score >= 80) return 'var(--green)'
  if (score >= 65) return 'var(--accent)'
  if (score >= 45) return 'var(--orange)'
  return 'var(--red)'
}

/**
 * Maps a BRI category key to a human-readable label.
 */
function briCategoryLabel(category: string): string {
  const MAP: Record<string, string> = {
    FINANCIAL: 'Financial Health',
    CUSTOMER: 'Customer Diversity',
    OPERATIONS: 'Operations & SOPs',
    MANAGEMENT: 'Management Team',
    LEGAL: 'Legal Readiness',
    GROWTH: 'Growth Trajectory',
    OWNER: 'Owner Dependence',
    RISK: 'Risk Profile',
  }
  return MAP[category] ?? category
}

/**
 * Returns the action icon color class based on rawImpact and briCategory.
 */
function actionIconClass(task: { rawImpact: number; briCategory: string }): string {
  if (task.briCategory === 'OWNER' || task.briCategory === 'RISK') return styles.impactCritical
  if (task.rawImpact >= 100_000) return styles.impactHigh
  if (task.rawImpact >= 50_000) return styles.impactMed
  return styles.impactInfo
}

/**
 * Returns the tag class and text for an action item.
 */
function actionTagProps(task: { rawImpact: number; briCategory: string; effortLevel?: string }): {
  className: string
  label: string
} {
  if (task.briCategory === 'OWNER' || task.briCategory === 'RISK') {
    return { className: styles.tagRisk, label: 'High Risk' }
  }
  if (task.rawImpact >= 100_000) {
    return { className: styles.tagValue, label: `+${formatCurrency(task.rawImpact)} value` }
  }
  if (task.briCategory === 'FINANCIAL') {
    return { className: styles.tagFinance, label: 'Financials' }
  }
  if (task.briCategory === 'LEGAL') {
    return { className: styles.tagPrep, label: 'Legal' }
  }
  return { className: styles.tagPrep, label: 'Transferability' }
}

// ─── Phase Journey ───────────────────────────────────────────────────────────

/**
 * The 4 phases of the exit journey, mapped from ProgressionData milestones.
 * Phase 1 completed: hasDcfValuation (knows what it's worth)
 * Phase 2 completed: hasPersonalFinancials (retirement readiness assessed)
 * Phase 3 completed: isExitReady (BRI >= 80, value improved)
 * Phase 4 completed: hasDealRoom (actively selling)
 */
interface PhaseConfig {
  label: string
  number: number
}

const PHASES: PhaseConfig[] = [
  { label: "What's It Worth?", number: 1 },
  { label: 'Retirement Ready?', number: 2 },
  { label: 'Increase Value', number: 3 },
  { label: 'Sell My Business', number: 4 },
]

interface PhaseProgressionFlags {
  phase1Done: boolean
  phase2Done: boolean
  phase3Done: boolean
  phase4Done: boolean
}

function getPhaseState(
  phaseIndex: number,
  flags: PhaseProgressionFlags
): 'completed' | 'active' | 'pending' {
  const doneByIndex = [flags.phase1Done, flags.phase2Done, flags.phase3Done, flags.phase4Done]
  if (doneByIndex[phaseIndex]) return 'completed'
  // The active phase is the first incomplete one
  for (let i = 0; i < phaseIndex; i++) {
    if (!doneByIndex[i]) return 'pending'
  }
  return 'active'
}

// ─── Inline SVG primitives ───────────────────────────────────────────────────

const ChevronRightSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const CheckSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const TrendUpSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)

const InfoCircleSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const ChatSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)

const AlertTriangleSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const UsersSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)

const FileSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const DollarSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
)

const ClockSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const DownloadSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const FinancialsSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

/**
 * Picks the right action icon SVG based on category/impact.
 */
function ActionIconSvg({ briCategory }: { briCategory: string }) {
  if (briCategory === 'OWNER' || briCategory === 'RISK') return <AlertTriangleSvg />
  if (briCategory === 'CUSTOMER') return <UsersSvg />
  if (briCategory === 'FINANCIAL') return <DollarSvg />
  if (briCategory === 'OPERATIONS' || briCategory === 'LEGAL') return <FileSvg />
  return <DollarSvg />
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ValueHome() {
  const { selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  useExposure() // keep context mounted
  const { progressionData } = useProgression()
  const { user } = useUserRole()
  const hasFullAssessment = progressionData?.hasFullAssessment ?? false
  const router = useRouter()
  const searchParams = useSearchParams()
  const _isFreeUser = planTier === 'foundation'
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>(undefined)
  const [upgradeFeatureName, setUpgradeFeatureName] = useState<string | undefined>(undefined)
  const [showTour, setShowTour] = useState(false)
  const [tourKey, setTourKey] = useState(0)
  const [firstVisitDismissed, setFirstVisitDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('exitosx-first-visit-dismissed') === 'true'
  )
  // Kept for data fetch side-effect — active playbooks no longer rendered in this layout
  const [_activePlaybooks, setActivePlaybooks] = useState<Array<{ id: string; title: string; percentComplete: number; category: string }>>([])

  // Fetch active playbooks for potential future use
  useEffect(() => {
    if (!selectedCompanyId) return
    fetch(`/api/companies/${selectedCompanyId}/active-playbooks`)
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        if (result?.playbooks) setActivePlaybooks(result.playbooks)
      })
      .catch(() => {})
  }, [selectedCompanyId])

  const _handleUpgrade = useCallback((feature?: string, featureName?: string) => {
    setUpgradeFeature(feature)
    setUpgradeFeatureName(featureName)
    setUpgradeModalOpen(true)
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-open platform tour on first visit to Value page
  useEffect(() => {
    if (!isLoading && data && !localStorage.getItem('exitosx-tour-seen')) {
      const timer = setTimeout(() => {
        setTourKey((k) => k + 1)
        setShowTour(true)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isLoading, data])

  // Open tour from notification link (?tour=open)
  useEffect(() => {
    if (!isLoading && data && searchParams.get('tour') === 'open') {
      setTourKey((k) => k + 1)
      setShowTour(true)
      // Clean up URL
      router.replace('/dashboard', { scroll: false })
    }
  }, [isLoading, data, searchParams, router])

  const handleTourComplete = useCallback(() => {
    localStorage.setItem('exitosx-tour-seen', 'true')
    setShowTour(false)
  }, [])

  if (isLoading) return <ValueHomeLoading />
  if (error || !data) return <ValueHomeError onRetry={fetchData} />

  const tier1 = data.tier1

  // Show FirstVisitDashboard for brand-new users who haven't completed any tasks
  const isFirstVisit = !firstVisitDismissed
    && (progressionData?.completedTaskCount ?? 0) === 0
    && !progressionData?.hasFullAssessment

  if (isFirstVisit) {
    return (
      <div className="max-w-5xl mx-auto sm:px-2 py-2 sm:py-8">
        <FirstVisitDashboard
          companyName={data.company.name}
          briScore={tier1?.briScore ?? null}
          firstTask={data.nextMove.task}
          quickWins={data.nextMove.comingUp.slice(0, 4)}
          onStartFirstMove={() => {
            if (data.nextMove.task) {
              router.push(`/dashboard/action-center?task=${data.nextMove.task.id}`)
            }
          }}
          onDismissWelcome={() => {
            localStorage.setItem('exitosx-first-visit-dismissed', 'true')
            setFirstVisitDismissed(true)
          }}
        />
      </div>
    )
  }

  // ─── Derived display values ────────────────────────────────────────────────

  const firstName = user?.name ? user.name.split(' ')[0] : 'there'
  const greeting = getTimeGreeting()
  const companyName = data.company.name
  const lastUpdatedStr = data.lastVisitAt ? formatTimeAgo(data.lastVisitAt) : 'recently'

  // Valuation hero
  const currentValue = tier1?.currentValue ?? 0
  const finalMultiple = tier1?.finalMultiple ?? 0
  const valuationDisplay = formatCurrency(currentValue)

  // Value trend — use last 12 snapshots
  const valueTrend = data.tier5.valueTrend.slice(-12)
  const trendMax = Math.max(...valueTrend.map(t => t.value), 1)
  const trendMin = Math.min(...valueTrend.map(t => t.value), 0)
  const trendRange = trendMax - trendMin || 1
  // First and last dates for labels
  const trendFirstDate = valueTrend.length > 0
    ? new Date(valueTrend[0].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''
  const trendLastDate = valueTrend.length > 0
    ? new Date(valueTrend[valueTrend.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''

  // Value change: compare first and last trend value
  const trendValueChange = valueTrend.length >= 2
    ? valueTrend[valueTrend.length - 1].value - valueTrend[0].value
    : 0

  // BRI score
  const briScore = tier1?.briScore ?? null
  const briCircumference = 251
  const briDashOffset = briScore != null
    ? briCircumference - (briCircumference * briScore) / 100
    : briCircumference

  // BRI factors from bridgeCategories (show up to 6)
  const briFactors = data.bridgeCategories.slice(0, 6)

  // Phase journey flags derived from ProgressionData milestones
  const phaseFlags: PhaseProgressionFlags = {
    phase1Done: progressionData?.hasDcfValuation ?? false,
    phase2Done: progressionData?.hasPersonalFinancials ?? false,
    phase3Done: progressionData?.isExitReady ?? false,
    phase4Done: progressionData?.hasDealRoom ?? false,
  }

  // Determine the active phase label (first non-completed phase)
  const phaseLabels = ['Phase I', 'Phase II', 'Phase III', 'Phase IV']
  const phaseFullLabels = ["What's It Worth?", 'Retirement Ready?', 'Increase Value', 'Sell My Business']
  let activePhaseIndex = 0
  for (let i = 0; i < PHASES.length; i++) {
    const state = getPhaseState(i, phaseFlags)
    if (state === 'active') { activePhaseIndex = i; break }
    if (state === 'pending') { activePhaseIndex = i; break }
  }
  const activePhaseName = `${phaseLabels[activePhaseIndex]} — ${phaseFullLabels[activePhaseIndex]}`

  // Priority actions: primary task + up to 3 from comingUp, max 4 total
  type ActionTask = {
    id: string
    title: string
    description?: string
    briCategory: string
    rawImpact: number
    effortLevel?: string
  }
  const primaryActions: ActionTask[] = []
  if (data.nextMove.task) {
    primaryActions.push({
      id: data.nextMove.task.id,
      title: data.nextMove.task.title,
      description: data.nextMove.task.description,
      briCategory: data.nextMove.task.briCategory,
      rawImpact: data.nextMove.task.rawImpact,
      effortLevel: data.nextMove.task.effortLevel,
    })
  }
  data.nextMove.comingUp.slice(0, 4 - primaryActions.length).forEach(t => {
    primaryActions.push({
      id: t.id,
      title: t.title,
      briCategory: t.briCategory,
      rawImpact: t.rawImpact,
    })
  })
  const totalActionCount =
    (data.nextMove.task ? 1 : 0) + data.nextMove.comingUp.length

  // Retirement readiness
  const proceedsValue = data.proceedsInputs?.currentValue ?? null
  // Use the current valuation as a proxy for retirement goal (net proceeds vs. target)
  // If proceeds data isn't available, we show a placeholder state
  const retirementCurrent = proceedsValue
  const retirementTarget = currentValue > 0 ? currentValue : null
  const retirementPercent =
    retirementCurrent && retirementTarget && retirementTarget > 0
      ? Math.min(Math.round((retirementCurrent / retirementTarget) * 100), 100)
      : null

  // Signals
  const signals = data.topSignals.slice(0, 4)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto sm:px-2 py-2 sm:py-8">
      <EmailVerificationBanner emailVerified={data.emailVerified ?? true} />
      <SinceLastVisitBanner events={data.sinceLastVisit ?? []} lastVisitAt={data.lastVisitAt ?? null} />

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.greeting}>
          <h1>{greeting}, {firstName}</h1>
          <p>{companyName} &mdash; Last updated {lastUpdatedStr}</p>
        </div>
        <div className={styles.topActions}>
          <Link href="/dashboard/reports" className={styles.btnSecondary}>
            <DownloadSvg />
            Export Report
          </Link>
          <Link href="/dashboard/financials" className={styles.btnPrimary}>
            <FinancialsSvg />
            Update Financials
          </Link>
        </div>
      </div>

      {/* Phase Journey */}
      <div className={styles.phaseJourney}>
        <div className={styles.phaseJourneyHeader}>
          <div className={styles.phaseJourneyTitle}>Your Exit Journey</div>
          <div className={styles.phaseJourneyCurrent}>{activePhaseName}</div>
        </div>
        <div className={styles.phaseSteps}>
          {PHASES.map((phase, i) => {
            const state = getPhaseState(i, phaseFlags)
            const isFirst = i === 0
            const isLast = i === PHASES.length - 1
            // Left line: hidden for first, uses prior phase's completion state for middle
            const leftLineCompleted = i > 0 && getPhaseState(i - 1, phaseFlags) === 'completed'
            // Right line: hidden for last
            const rightLineCompleted = state === 'completed'
            const rightLineActive = state === 'active'

            return (
              <div
                key={phase.number}
                className={
                  [
                    styles.phaseStep,
                    state === 'completed' ? styles['phaseStep.completed'] : '',
                    state === 'active' ? styles['phaseStep.active'] : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || styles.phaseStep
                }
                data-state={state}
                // Inline style fallback for completed/active since CSS module
                // child selectors handle .phaseStep.completed and .phaseStep.active
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <div className={styles.phaseStepDotRow}>
                  {/* Left connector line */}
                  <div
                    className={styles.phaseStepLine}
                    style={{
                      visibility: isFirst ? 'hidden' : 'visible',
                      background: leftLineCompleted ? 'var(--green)' : 'var(--border)',
                    }}
                  />
                  {/* Dot */}
                  <div
                    className={styles.phaseStepDot}
                    style={
                      state === 'completed'
                        ? { background: 'var(--green)', borderColor: 'var(--green)', color: 'white' }
                        : state === 'active'
                        ? { borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-light)' }
                        : {}
                    }
                  >
                    {state === 'completed' ? <CheckSvg /> : phase.number}
                  </div>
                  {/* Right connector line */}
                  <div
                    className={styles.phaseStepLine}
                    style={{
                      visibility: isLast ? 'hidden' : 'visible',
                      background: rightLineCompleted
                        ? 'var(--green)'
                        : rightLineActive
                        ? 'linear-gradient(90deg, var(--green), var(--border))'
                        : 'var(--border)',
                    }}
                  />
                </div>
                <div
                  className={styles.phaseStepLabel}
                  style={
                    state === 'completed'
                      ? { color: 'var(--green)' }
                      : state === 'active'
                      ? { color: 'var(--accent)' }
                      : {}
                  }
                >
                  {phase.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Valuation Hero — 2-column grid */}
      <div className={styles.valuationHero}>
        {/* Valuation Card */}
        <Link href="/dashboard/valuation" className={styles.valuationCard}>
          <div className={styles.cardLabel}>Estimated Business Value</div>
          <div className={styles.valuationAmount}>{valuationDisplay}</div>
          {trendValueChange !== 0 && (
            <div
              className={styles.valuationChange}
              style={trendValueChange < 0 ? { color: 'var(--red)' } : {}}
            >
              {trendValueChange > 0 ? <TrendUpSvg /> : null}
              {trendValueChange > 0 ? '+' : ''}{formatCurrency(Math.abs(trendValueChange))} since last snapshot
            </div>
          )}
          <div className={styles.valuationMethod}>
            <InfoCircleSvg />
            Based on Industry Multiples &middot; {finalMultiple.toFixed(1)}x Adjusted EBITDA
          </div>
          {/* Mini trend sparkline */}
          {valueTrend.length > 0 && (
            <>
              <div className={styles.trendRow}>
                {valueTrend.map((point, idx) => {
                  const heightPct = Math.max(
                    8,
                    Math.round(((point.value - trendMin) / trendRange) * 100)
                  )
                  return (
                    <div
                      key={idx}
                      className={styles.trendBar}
                      style={{ height: `${heightPct}%` }}
                    />
                  )
                })}
              </div>
              <div className={styles.trendLabels}>
                <span>{trendFirstDate}</span>
                <span>{trendLastDate}</span>
              </div>
            </>
          )}
        </Link>

        {/* BRI Card */}
        <Link href="/dashboard/diagnosis" className={styles.briCard}>
          <div className={styles.cardLabel}>Business Readiness Index</div>
          <div className={styles.briScoreRow}>
            {/* Circular progress ring */}
            <div className={styles.briCircle}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.briCircleBg} cx="50" cy="50" r="40" />
                <circle
                  className={styles.briCircleProgress}
                  cx="50"
                  cy="50"
                  r="40"
                  style={{ strokeDashoffset: briDashOffset }}
                />
              </svg>
              <div className={styles.briCircleText}>
                <div className={styles.briNumber}>{briScore ?? '—'}</div>
                <div className={styles.briOf}>of 100</div>
              </div>
            </div>
            {/* Factor bars */}
            <div className={styles.briFactors}>
              {briFactors.length > 0
                ? briFactors.map((factor) => {
                    const score = Math.round(factor.score * 100)
                    return (
                      <div key={factor.category} className={styles.briFactor}>
                        <span className={styles.briFactorLabel}>
                          {briCategoryLabel(factor.category)}
                        </span>
                        <span
                          className={styles.briFactorScore}
                          style={{ color: briScoreColor(score) }}
                        >
                          {score}
                        </span>
                        <div className={styles.briFactorBar}>
                          <div
                            className={`${styles.briFactorFill} ${briFillClass(score)}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                : (
                  // Fallback placeholder rows when no bridge data
                  ['Financial Health', 'Customer Diversity', 'Owner Dependence', 'Operations & SOPs', 'Legal Readiness', 'Growth Trajectory'].map(label => (
                    <div key={label} className={styles.briFactor}>
                      <span className={styles.briFactorLabel}>{label}</span>
                      <span className={styles.briFactorScore} style={{ color: 'var(--text-tertiary)' }}>—</span>
                      <div className={styles.briFactorBar}>
                        <div className={`${styles.briFactorFill} ${styles.fillAccent}`} style={{ width: '0%' }} />
                      </div>
                    </div>
                  ))
                )}
            </div>
          </div>
        </Link>
      </div>

      {/* AI Coach CTA */}
      <Link href="/dashboard/coach" className={styles.coachCta}>
        <div className={styles.coachIcon}>
          <ChatSvg />
        </div>
        <div className={styles.coachContent}>
          <div className={styles.coachTitle}>Ask your AI Exit Coach</div>
          <div className={styles.coachDesc}>
            &ldquo;What&rsquo;s the single biggest thing I can do to increase my value before selling?&rdquo;
          </div>
        </div>
        <div className={styles.coachArrow}>
          <ChevronRightSvg />
        </div>
      </Link>

      {/* Priority Actions */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Priority Actions</h2>
        <Link href="/dashboard/action-center" className={styles.sectionLink}>
          View all {totalActionCount} action{totalActionCount !== 1 ? 's' : ''} &rarr;
        </Link>
      </div>
      <div className={styles.actionsGrid}>
        {primaryActions.map((action) => {
          const iconClass = actionIconClass(action)
          const tag = actionTagProps(action)
          return (
            <Link
              key={action.id}
              href={`/dashboard/action-center?task=${action.id}`}
              className={styles.actionItem}
            >
              <div className={`${styles.actionIcon} ${iconClass}`}>
                <ActionIconSvg briCategory={action.briCategory} />
              </div>
              <div className={styles.actionContent}>
                <div className={styles.actionTitle}>{action.title}</div>
                {action.description && (
                  <div className={styles.actionDesc}>{action.description}</div>
                )}
              </div>
              <div className={styles.actionMeta}>
                <span className={`${styles.actionTag} ${tag.className}`}>{tag.label}</span>
              </div>
              <div className={styles.actionArrow}>
                <ChevronRightSvg />
              </div>
            </Link>
          )
        })}
        {primaryActions.length === 0 && (
          <div className={styles.actionItem} style={{ justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
            No pending actions — great work!
          </div>
        )}
      </div>

      {/* Bottom Grid — Retirement + Signals */}
      <div className={styles.bottomGrid}>
        {/* Retirement Readiness */}
        <Link href="/dashboard/retirement" className={styles.retirementCard}>
          <div className={styles.cardLabel}>Retirement Readiness</div>
          <div className={styles.retirementBarSection}>
            {retirementPercent != null && retirementCurrent != null && retirementTarget != null ? (
              <>
                <div className={styles.retirementNumbers}>
                  <span className={styles.retirementCurrent}>
                    Net Proceeds: {formatCurrency(retirementCurrent)}
                  </span>
                  <span className={styles.retirementTarget}>
                    Need: {formatCurrency(retirementTarget)}
                  </span>
                </div>
                <div className={styles.retirementBarTrack}>
                  <div
                    className={styles.retirementBarFill}
                    style={{ width: `${retirementPercent}%` }}
                  />
                </div>
                <div className={styles.retirementLabel}>
                  <span>{retirementPercent}% of retirement goal</span>
                  <span>Gap: {formatCurrency(Math.max(retirementTarget - retirementCurrent, 0))}</span>
                </div>
                {retirementPercent < 100 && (
                  <div className={styles.retirementGap}>
                    <ClockSvg />
                    Closing the value gap could get you closer to your retirement goal
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 12 }}>
                Complete your retirement profile to see your readiness score.
              </div>
            )}
          </div>
        </Link>

        {/* Recent Signals */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Recent Signals</div>
          <div className={styles.signalsList}>
            {signals.length > 0
              ? signals.map((signal) => {
                  const severity = signal.severity?.toLowerCase() ?? 'warning'
                  const dotColor =
                    severity === 'positive' ? 'var(--green)'
                    : severity === 'negative' || severity === 'critical' ? 'var(--red)'
                    : 'var(--orange)'
                  const timeAgo = formatTimeAgo(signal.createdAt)
                  return (
                    <Link
                      key={signal.id}
                      href={`/dashboard/signals`}
                      className={styles.signalItem}
                    >
                      <div
                        className={styles.signalDot}
                        style={{ background: dotColor }}
                      />
                      <div>
                        <div className={styles.signalText}>
                          <strong>{signal.title}</strong>
                          {signal.category ? ` — ${signal.category}` : ''}
                        </div>
                        <div className={styles.signalTime}>{timeAgo}</div>
                      </div>
                    </Link>
                  )
                })
              : (
                <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No signals yet — keep adding data to unlock insights.
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Weekly Check-In */}
      {hasFullAssessment && (
        <div className={styles.checkinCard}>
          <CheckInSlot onRefresh={fetchData} />
        </div>
      )}

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature={upgradeFeature}
        featureDisplayName={upgradeFeatureName}
      />

      <PlatformTour key={tourKey} open={showTour} onComplete={handleTourComplete} />
    </div>
  )
}

/** Shows only one check-in at a time: Weekly Check-In takes priority over Quick Check */
function CheckInSlot({ onRefresh }: { onRefresh?: () => void }) {
  const [weeklyVisible, setWeeklyVisible] = useState<boolean | null>(null)

  return (
    <>
      <WeeklyCheckInTrigger
        onRefresh={onRefresh}
        onVisibilityChange={setWeeklyVisible}
      />
      {weeklyVisible === false && (
        <DisclosureTrigger onRefresh={onRefresh} />
      )}
    </>
  )
}
