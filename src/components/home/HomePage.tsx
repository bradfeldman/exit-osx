'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import styles from './home.module.css'

// ─── Types ──────────────────────────────────────────────────────────────

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
    briScore: number | null
    finalMultiple: number
    multipleRange: { low: number; high: number }
    industryName: string
    isEstimated: boolean
    useDCFValue: boolean
  }
  tier3: {
    categories: Array<{ key: string; label: string; score: number }>
  } | null
  tier4: {
    taskStats: {
      total: number
      pending: number
      inProgress: number
      completed: number
    }
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string }>
  }
  nextMove: {
    task: {
      id: string
      title: string
      description: string
      briCategory: string
      rawImpact: number
      buyerConsequence: string | null
    } | null
    comingUp: Array<{
      id: string
      title: string
      rawImpact: number
      briCategory: string
    }>
  }
  topSignals: Array<{
    id: string
    title: string
    severity: string
    category: string | null
    createdAt: string
    estimatedValueImpact: number | null
  }>
  proceedsInputs: {
    currentValue: number
    netDebt: number
    ownershipPercent: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`
  }
  return `$${Math.round(value)}`
}

function formatDelta(current: number, previous: number): string {
  const delta = current - previous
  if (delta === 0) return 'No change'
  const sign = delta > 0 ? '+' : '-'
  return `${sign}${formatCurrency(Math.abs(delta))} since last quarter`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFactorColor(score: number): string {
  if (score >= 75) return 'var(--green)'
  if (score >= 55) return 'var(--accent)'
  if (score >= 40) return 'var(--orange)'
  return 'var(--red)'
}

function getFactorFillClass(score: number): string {
  if (score >= 75) return styles.fillGreen
  if (score >= 55) return styles.fillAccent
  if (score >= 40) return styles.fillOrange
  return styles.fillRed
}

function getCategoryTag(category: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    FINANCIAL: { label: 'Financials', className: styles.tagFinance },
    TRANSFERABILITY: { label: 'Transferability', className: styles.tagPrep },
    OPERATIONAL: { label: 'Operations', className: styles.tagPrep },
    MARKET: { label: 'Market Position', className: styles.tagValue },
    LEGAL_TAX: { label: 'Legal & Tax', className: styles.tagRisk },
    PERSONAL: { label: 'Personal', className: styles.tagPrep },
  }
  return map[category] || { label: category, className: styles.tagPrep }
}

function getImpactClass(impact: number): string {
  if (impact >= 500_000) return styles.impactCritical
  if (impact >= 200_000) return styles.impactHigh
  if (impact >= 50_000) return styles.impactMed
  return styles.impactInfo
}

function getSeverityClass(severity: string): string {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'negative'
  if (severity === 'MEDIUM') return 'warning'
  return 'positive'
}

// ─── SVG Icons (matching mocksite feather-style) ────────────────────────

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

const TrendUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const UpdateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const PlusCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
)

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)

// ─── Main Component ─────────────────────────────────────────────────────

export function HomePage() {
  const { selectedCompanyId, selectedCompany } = useCompany()
  const { progressionData } = useProgression()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        if (cancelled) return
        if (d) setData(d)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (loading || !data) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const userName = selectedCompany?.name?.split(' ')[0] || 'there'
  const greeting = getGreeting()
  const briScore = data.tier1.briScore
  const currentValue = data.tier1.currentValue
  const valueTrend = data.tier5.valueTrend
  const previousValue = valueTrend.length >= 2 ? valueTrend[valueTrend.length - 2]?.value : null
  const categories = data.tier3?.categories || []

  // Phase journey state derived from progression data
  // Phase 1: What's It Worth? (has valuation)
  // Phase 2: Retirement Ready? (has personal financials)
  // Phase 3: Increase Value (working on tasks)
  // Phase 4: Sell My Business (deal room active)
  const currentPhase = (() => {
    if (!progressionData) return 1
    if (progressionData.hasDealRoom) return 4
    if (progressionData.hasAssessment && progressionData.completedTaskCount > 0) return 3
    if (progressionData.hasPersonalFinancials || progressionData.hasDcfValuation) return 2
    return 1
  })()

  // BRI factors for the mocksite layout (6 factors)
  const briFactors = [
    { label: 'Financial Health', key: 'FINANCIAL' },
    { label: 'Customer Diversity', key: 'MARKET' },
    { label: 'Owner Dependence', key: 'TRANSFERABILITY' },
    { label: 'Operations & SOPs', key: 'OPERATIONAL' },
    { label: 'Legal Readiness', key: 'LEGAL_TAX' },
    { label: 'Growth Trajectory', key: 'PERSONAL' },
  ]

  // Build top actions from nextMove + comingUp
  const allActions = [
    ...(data.nextMove.task ? [data.nextMove.task] : []),
    ...data.nextMove.comingUp.map(t => ({
      ...t,
      description: '',
      buyerConsequence: null,
    })),
  ].slice(0, 4)

  const actionCount = data.tier4.taskStats.pending + data.tier4.taskStats.inProgress

  // Retirement data (simplified from proceedsInputs)
  const netProceeds = data.proceedsInputs.currentValue - data.proceedsInputs.netDebt
  const retirementGoal = netProceeds / 0.72 // Implied from mocksite 72% example
  const retirementPercent = retirementGoal > 0 ? Math.round((netProceeds / retirementGoal) * 100) : 0
  const retirementGap = retirementGoal - netProceeds

  // Trend bar heights (normalize to 0-100%)
  const trendValues = valueTrend.map(t => t.value)
  const trendMax = Math.max(...trendValues, 1)
  const trendMin = Math.min(...trendValues, 0)
  const trendRange = trendMax - trendMin || 1

  return (
    <>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.greeting}>
          <h1>{greeting}, {userName}</h1>
          <p>{data.company.name} &mdash; {data.tier1.industryName}</p>
        </div>
        <div className={styles.topActions}>
          <Link href="/dashboard/reports" className={styles.btnSecondary}>
            <DownloadIcon />
            Export Report
          </Link>
          <Link href="/dashboard/financials" className={styles.btnPrimary}>
            <UpdateIcon />
            Update Financials
          </Link>
        </div>
      </div>

      {/* Phase Journey */}
      <div className={styles.phaseJourney}>
        <div className={styles.phaseJourneyHeader}>
          <div className={styles.phaseJourneyTitle}>Your Exit Journey</div>
          <div className={styles.phaseJourneyCurrent}>
            Phase {currentPhase === 1 ? 'I' : currentPhase === 2 ? 'II' : currentPhase === 3 ? 'III' : 'IV'}
            {' '}&mdash;{' '}
            {currentPhase === 1 ? "What's It Worth?" : currentPhase === 2 ? 'Retirement Ready?' : currentPhase === 3 ? 'Improving Value' : 'Sell My Business'}
          </div>
        </div>
        <div className={styles.phaseSteps}>
          {[
            { label: "What's It Worth?", num: 1 },
            { label: 'Retirement Ready?', num: 2 },
            { label: 'Increase Value', num: 3 },
            { label: 'Sell My Business', num: 4 },
          ].map((step, i) => {
            const isCompleted = step.num < currentPhase
            const isActive = step.num === currentPhase
            const stepClass = `${styles.phaseStep} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''}`

            return (
              <div key={step.num} className={stepClass}>
                <div className={styles.phaseStepDotRow}>
                  <div
                    className={`${styles.phaseStepLine} ${
                      i === 0 ? '' :
                      isCompleted || isActive ? (isActive ? styles.active : styles.completed) : ''
                    }`}
                    style={i === 0 ? { visibility: 'hidden' } : undefined}
                  />
                  <div className={styles.phaseStepDot}>
                    {isCompleted ? <CheckIcon /> : step.num}
                  </div>
                  <div
                    className={`${styles.phaseStepLine} ${
                      i === 3 ? '' :
                      isCompleted ? styles.completed : ''
                    }`}
                    style={i === 3 ? { visibility: 'hidden' } : undefined}
                  />
                </div>
                <div className={styles.phaseStepLabel}>{step.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Valuation + BRI Hero */}
      <div className={styles.valuationHero}>
        {/* Valuation Card */}
        <Link href="/dashboard/valuation" className={styles.valuationCard}>
          <div className={styles.cardLabel}>Estimated Business Value</div>
          <div className={styles.valuationAmount}>{formatCurrency(currentValue)}</div>
          {previousValue && previousValue !== currentValue && (
            <div className={styles.valuationChange}>
              <TrendUpIcon />
              {formatDelta(currentValue, previousValue)}
            </div>
          )}
          <div className={styles.valuationMethod}>
            <InfoIcon />
            Based on Industry Multiples &middot; {data.tier1.finalMultiple.toFixed(1)}x Adjusted EBITDA
          </div>
          {/* Mini Trend Bars */}
          {trendValues.length > 1 && (
            <>
              <div className={styles.trendRow}>
                {trendValues.map((v, i) => (
                  <div
                    key={i}
                    className={styles.trendBar}
                    style={{ height: `${20 + ((v - trendMin) / trendRange) * 80}%` }}
                  />
                ))}
              </div>
              <div className={styles.trendLabels}>
                <span>{new Date(valueTrend[0]?.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span>{new Date(valueTrend[valueTrend.length - 1]?.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </>
          )}
        </Link>

        {/* BRI Card */}
        <Link href="/dashboard/assessments" className={styles.briCard}>
          <div className={styles.cardLabel}>Business Readiness Index</div>
          <div className={styles.briScoreRow}>
            <div className={styles.briCircle}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.briCircleBg} cx="50" cy="50" r="40"/>
                <circle
                  className={styles.briCircleProgress}
                  cx="50" cy="50" r="40"
                  style={{
                    strokeDashoffset: briScore !== null
                      ? 251 - (251 * (briScore / 100))
                      : 251
                  }}
                />
              </svg>
              <div className={styles.briCircleText}>
                <div className={styles.briNumber}>{briScore ?? '—'}</div>
                <div className={styles.briOf}>of 100</div>
              </div>
            </div>
            <div className={styles.briFactors}>
              {briFactors.map(factor => {
                const cat = categories.find(c => c.key === factor.key)
                const score = cat?.score ?? 0
                return (
                  <div key={factor.key} className={styles.briFactor}>
                    <span className={styles.briFactorLabel}>{factor.label}</span>
                    <span className={styles.briFactorScore} style={{ color: getFactorColor(score) }}>
                      {score}
                    </span>
                    <div className={styles.briFactorBar}>
                      <div
                        className={`${styles.briFactorFill} ${getFactorFillClass(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Link>
      </div>

      {/* AI Coach CTA */}
      <Link href="/dashboard/coach" className={styles.coachCta}>
        <div className={styles.coachIcon}>
          <ChatIcon />
        </div>
        <div className={styles.coachContent}>
          <div className={styles.coachTitle}>Ask your AI Exit Coach</div>
          <div className={styles.coachDesc}>
            &ldquo;What&apos;s the single biggest thing I can do to increase my value before selling?&rdquo;
          </div>
        </div>
        <div className={styles.coachArrow}>
          <ChevronRight />
        </div>
      </Link>

      {/* Priority Actions */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Priority Actions</h2>
        <Link href="/dashboard/action-center" className={styles.sectionLink}>
          View all {actionCount} actions &rarr;
        </Link>
      </div>
      <div className={styles.actionsGrid}>
        {allActions.map(action => {
          const tag = getCategoryTag(action.briCategory)
          const impactCls = getImpactClass(action.rawImpact)
          return (
            <Link
              key={action.id}
              href={`/dashboard/action-center/${action.id}`}
              className={styles.actionItem}
            >
              <div className={`${styles.actionIcon} ${impactCls}`}>
                <WarningIcon />
              </div>
              <div className={styles.actionContent}>
                <div className={styles.actionTitle}>{action.title}</div>
                {action.description && (
                  <div className={styles.actionDesc}>{action.description}</div>
                )}
              </div>
              <div className={styles.actionMeta}>
                {action.rawImpact > 0 && (
                  <span className={`${styles.actionTag} ${tag.className}`}>
                    {action.rawImpact >= 100_000
                      ? `+${formatCurrency(action.rawImpact)} value`
                      : tag.label}
                  </span>
                )}
              </div>
              <div className={styles.actionArrow}>
                <ChevronRight />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom Grid: Retirement + Signals */}
      <div className={styles.bottomGrid}>
        {/* Retirement Snapshot */}
        <Link href="/dashboard/retirement" className={styles.retirementCard}>
          <div className={styles.cardLabel}>Retirement Readiness</div>
          <div className={styles.retirementBarSection}>
            <div className={styles.retirementNumbers}>
              <span className={styles.retirementCurrent}>Net Proceeds: {formatCurrency(netProceeds)}</span>
              <span className={styles.retirementTarget}>Need: {formatCurrency(retirementGoal)}</span>
            </div>
            <div className={styles.retirementBarTrack}>
              <div
                className={styles.retirementBarFill}
                style={{ width: `${Math.min(retirementPercent, 100)}%` }}
              />
            </div>
            <div className={styles.retirementLabel}>
              <span>{retirementPercent}% of retirement goal</span>
              <span>Gap: {formatCurrency(retirementGap)}</span>
            </div>
          </div>
          {retirementGap > 0 && (
            <div className={styles.retirementGap}>
              <ClockIcon />
              Closing the value gap could improve your retirement readiness
            </div>
          )}
        </Link>

        {/* Recent Signals */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>Recent Signals</div>
          <div className={styles.signalsList}>
            {data.topSignals.length > 0 ? (
              data.topSignals.map(signal => (
                <Link
                  key={signal.id}
                  href={`/dashboard/signals/${signal.id}`}
                  className={styles.signalItem}
                >
                  <div className={`${styles.signalDot} ${getSeverityClass(signal.severity)}`} />
                  <div>
                    <div className={styles.signalText}>
                      <strong>{signal.title}</strong>
                    </div>
                    <div className={styles.signalTime}>{timeAgo(signal.createdAt)}</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.signalText} style={{ color: 'var(--text-tertiary)' }}>
                No signals yet. Complete your assessment to start tracking.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Check-In */}
      <div className={styles.checkinCard}>
        <div className={styles.checkinHeader}>
          <PlusCircleIcon />
          <span>Weekly Check-In</span>
        </div>
        <div className={styles.checkinQuestion}>
          How did your business perform this week compared to your expectations?
        </div>
        <div className={styles.checkinOptions}>
          <button className={styles.checkinBtn}>Better than expected</button>
          <button className={styles.checkinBtn}>About as expected</button>
          <button className={styles.checkinBtn}>Worse than expected</button>
          <button className={styles.checkinBtn}>Not sure</button>
        </div>
      </div>
    </>
  )
}
