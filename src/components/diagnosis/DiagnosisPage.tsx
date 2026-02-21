'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { DiagnosisLoading } from './DiagnosisLoading'
import { DiagnosisError } from './DiagnosisError'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'
import { PostAssessmentPlaybooks } from '@/components/playbook/PostAssessmentPlaybooks'
import styles from '@/components/assessments/assessments.module.css'

interface CategoryData {
  category: string
  label: string
  score: number
  scoreDecimal: number
  dollarImpact: number | null
  weight: number
  isAssessed: boolean
  confidence: {
    dots: number
    label: string
    questionsAnswered: number
    questionsTotal: number
    lastUpdated: string | null
    daysSinceUpdate: number | null
    isStale: boolean
    hasUnansweredAiQuestions: boolean
  }
  isLowestConfidence: boolean
  financialContext?: {
    tier: string
    metric: { label: string; value: string; source: string } | null
    benchmark: { range: string; source: string } | null
    dollarContext: string | null
  } | null
}

interface RiskDriver {
  id: string
  name: string
  category: string
  categoryLabel: string
  dollarImpact: number
  currentScore: number
  optionPosition: number
  totalOptions: number
  questionText: string
  buyerLogic: string | null
  hasLinkedTask: boolean
  linkedTaskId: string | null
  linkedTaskTitle: string | null
  linkedTaskStatus: string | null
  financialContext?: {
    ebitda: number
    source: string
    benchmarkMultiple: string | null
  } | null
}

interface DiagnosisData {
  briScore: number | null
  briScoreDecimal: number
  isEstimated: boolean
  categories: CategoryData[]
  riskDrivers: RiskDriver[]
  assessmentId: string | null
  hasAssessment: boolean
  lastAssessmentDate: string | null
  questionCounts: Record<string, { total: number; answered: number; unanswered: number }>
}

function formatImpact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'var(--green)'
  if (score >= 60) return 'var(--accent)'
  if (score >= 40) return 'var(--orange)'
  return 'var(--red)'
}

function getConfidenceColor(pct: number): string {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 60) return 'var(--accent)'
  return 'var(--orange)'
}

// Maps BRI category key → icon color and card icon background for the diag-card headers
const CATEGORY_CARD_COLORS: Record<string, { bg: string; stroke: string }> = {
  FINANCIAL: { bg: 'var(--green-light)', stroke: '#34C759' },
  REVENUE_GROWTH: { bg: 'var(--accent-light)', stroke: '#0071E3' },
  RECURRING_REVENUE: { bg: 'var(--teal-light)', stroke: '#5AC8FA' },
  CUSTOMER_CONCENTRATION: { bg: 'var(--orange-light)', stroke: '#FF9500' },
  OWNER_DEPENDENCY: { bg: 'var(--orange-light)', stroke: '#FF9500' },
  OPERATIONAL: { bg: 'var(--teal-light)', stroke: '#5AC8FA' },
  LEGAL_TAX: { bg: 'var(--accent-light)', stroke: '#0071E3' },
  LEGAL_COMPLIANCE: { bg: 'var(--accent-light)', stroke: '#0071E3' },
  MARKET: { bg: 'var(--purple-light)', stroke: '#AF52DE' },
  PERSONAL: { bg: 'var(--purple-light)', stroke: '#AF52DE' },
  TRANSFERABILITY: { bg: 'var(--orange-light)', stroke: '#FF9500' },
}

// Section IDs for the page-progress dots nav
const SECTION_IDS = [
  { id: 'sec-hero', label: 'AI Diagnosis' },
  { id: 'sec-summary', label: 'Overview' },
  { id: 'sec-categories', label: 'Dimensions' },
  { id: 'sec-redflags', label: 'Red Flags' },
  { id: 'sec-actions', label: 'Next Steps' },
]

export function DiagnosisPage() {
  const { selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  const { progressionData } = useProgression()
  const hasFullAssessment = progressionData?.hasFullAssessment ?? false
  const isFreeUser = planTier === 'foundation'
  const searchParams = useSearchParams()
  const router = useRouter()

  const [data, setData] = useState<DiagnosisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('sec-hero')
  const [showPlaybooks, setShowPlaybooks] = useState(true)
  const [topPlaybooks, setTopPlaybooks] = useState<Array<{
    playbook: import('../../../prisma/seed-data/playbook-definitions').PlaybookDefinition
    relevanceScore: number
    estimatedImpactLow: number
    estimatedImpactHigh: number
  }>>([])
  const sharpenConsumedRef = useRef(false)

  // Fetch playbook recommendations when assessment exists
  useEffect(() => {
    if (!selectedCompanyId || !hasFullAssessment) return
    fetch(`/api/companies/${selectedCompanyId}/playbook-recommendations`)
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        if (result?.recommendations) {
          setTopPlaybooks(
            result.recommendations
              .filter((r: { isRecommended: boolean }) => r.isRecommended)
              .slice(0, 3)
          )
        }
      })
      .catch(() => {})
  }, [selectedCompanyId, hasFullAssessment])

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/diagnosis`)
      if (!response.ok) throw new Error('Failed to fetch diagnosis data')
      const json = await response.json()

      // Ensure an assessment record exists for inline question buttons
      if (!json.assessmentId) {
        try {
          const createRes = await fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: selectedCompanyId, assessmentType: 'INITIAL' }),
          })
          if (createRes.ok) {
            const { assessment } = await createRes.json()
            json.assessmentId = assessment.id
          } else {
            const errBody = await createRes.json().catch(() => ({}))
            console.error('[Diagnosis] Assessment creation failed:', createRes.status, errBody)
          }
        } catch (createErr) {
          console.error('[Diagnosis] Assessment creation error:', createErr)
        }
      }

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

  // Auto-trigger sharpen from ?sharpen=true query param (e.g., from Actions page)
  useEffect(() => {
    if (!sharpenConsumedRef.current && searchParams.get('sharpen') === 'true' && !isLoading) {
      sharpenConsumedRef.current = true
      router.replace('/dashboard/diagnosis', { scroll: false })
    }
  }, [searchParams, isLoading, router])

  // Page-progress dot scroll tracking
  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY + window.innerHeight / 3
      let active = SECTION_IDS[0].id
      for (const s of SECTION_IDS) {
        const el = document.getElementById(s.id)
        if (el && el.offsetTop <= scrollTop) active = s.id
      }
      setActiveSection(active)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const allQuestionsAnswered = useMemo(() => {
    if (!data || data.categories.length === 0) return false
    return data.categories.every(
      cat => cat.confidence.questionsAnswered === cat.confidence.questionsTotal
        && !cat.confidence.hasUnansweredAiQuestions
    )
  }, [data])

  if (isLoading) return <DiagnosisLoading />
  if (error || !data) return <DiagnosisError onRetry={fetchData} />

  const briScore = data.briScore ?? 0
  const lastDate = data.lastAssessmentDate
    ? new Date(data.lastAssessmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // Top risk drivers for the Red Flags section
  const topRiskDrivers = data.riskDrivers
    .filter(r => r.dollarImpact < 0)
    .sort((a, b) => a.dollarImpact - b.dollarImpact)
    .slice(0, 4)

  // Categories split into assessed (score > 0) and unassessed
  const assessedCategories = data.categories.filter(c => c.isAssessed)
  const highPerformers = assessedCategories.filter(c => c.score >= 70)
  const lowPerformers = assessedCategories.filter(c => c.score < 60)

  return (
    <>
      {/* Page-level progress dots (fixed right rail) */}
      <nav className={styles.pageProgress} aria-label="Page sections">
        {SECTION_IDS.map((s, i) => (
          <span key={s.id}>
            <div
              className={`${styles.pageProgressDot}${activeSection === s.id ? ' active' : ''}`}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              role="button"
              tabIndex={0}
              aria-label={s.label}
              onKeyDown={e => { if (e.key === 'Enter') document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              title={s.label}
            />
            {i < SECTION_IDS.length - 1 && <div className={styles.pageProgressLine} />}
          </span>
        ))}
      </nav>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/assessments">Assessments</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>AI Company Diagnosis</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>AI Company Diagnosis</h1>
          <p>Deep business analysis powered by your financial and assessment data</p>
        </div>
      </div>

      {/* AI Hero Banner */}
      <div className={styles.aiHero} id="sec-hero">
        <div className={styles.aiHeroIconWrap}>
          <svg viewBox="0 0 32 32" fill="none" stroke="none">
            <path d="M16 4L17.8 12.2L26 14L17.8 15.8L16 24L14.2 15.8L6 14L14.2 12.2L16 4Z" fill="#C084FC" />
            <path d="M26 22L26.9 25.1L30 26L26.9 26.9L26 30L25.1 26.9L22 26L25.1 25.1L26 22Z" fill="#C084FC" opacity="0.6" />
            <path d="M8 6L8.6 8.4L11 9L8.6 9.6L8 12L7.4 9.6L5 9L7.4 8.4L8 6Z" fill="#C084FC" opacity="0.5" />
          </svg>
        </div>
        <div className={styles.aiHeroContent}>
          <div className={styles.aiHeroLabel}>AI-Powered Business Diagnosis</div>
          <div className={styles.aiHeroTitle}>Business Readiness Report</div>
          <div className={styles.aiHeroMeta}>
            {lastDate && (
              <span className={styles.aiMetaBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Generated {lastDate}
              </span>
            )}
            <span className={styles.aiMetaBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
              Based on {assessedCategories.length} of {data.categories.length} dimensions
            </span>
            <span className={styles.aiMetaBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              BRI Score: {Math.round(briScore)}/100{data.isEstimated ? ' (est.)' : ''}
            </span>
          </div>
        </div>
        <div className={styles.aiHeroActions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export as PDF
          </button>
          {!data.hasAssessment ? (
            <Link href="/dashboard/assessments/take" className={`${styles.btn} ${styles.btnPurple}`}>
              <svg viewBox="0 0 32 32" fill="none" style={{ width: '16px', height: '16px' }}>
                <path d="M16 4L17.8 12.2L26 14L17.8 15.8L16 24L14.2 15.8L6 14L14.2 12.2L16 4Z" fill="white" />
              </svg>
              Start Assessment
            </Link>
          ) : !allQuestionsAnswered ? (
            <Link href="/dashboard/assessments/take" className={`${styles.btn} ${styles.btnPurple}`}>
              <svg viewBox="0 0 32 32" fill="none" style={{ width: '16px', height: '16px' }}>
                <path d="M16 4L17.8 12.2L26 14L17.8 15.8L16 24L14.2 15.8L6 14L14.2 12.2L16 4Z" fill="white" />
              </svg>
              Sharpen Diagnosis
            </Link>
          ) : (
            <button className={`${styles.btn} ${styles.btnPurple}`} type="button" onClick={() => fetchData()}>
              <svg viewBox="0 0 32 32" fill="none" style={{ width: '16px', height: '16px' }}>
                <path d="M16 4L17.8 12.2L26 14L17.8 15.8L16 24L14.2 15.8L6 14L14.2 12.2L16 4Z" fill="white" />
              </svg>
              Regenerate Diagnosis
            </button>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className={styles.execSummary} id="sec-summary">
        <div className={styles.execSummaryHeader}>
          <div className={styles.execSummaryHeaderIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className={styles.execSummaryTitle}>Executive Summary</div>
        </div>
        <div className={styles.execSummaryBody}>
          {/* TODO: wire to API — pull AI-generated exec summary from /api/companies/:id/diagnosis when available */}
          {assessedCategories.length === 0 ? (
            <p>
              Complete your Business Readiness Assessment to unlock your AI diagnosis. Your assessment data — combined with your financial history — will generate a personalized readiness report that identifies your highest-value improvement opportunities before exit.
            </p>
          ) : (
            <>
              <p>
                Your business has been assessed across {assessedCategories.length} dimension{assessedCategories.length !== 1 ? 's' : ''}, producing a Business Readiness Index (BRI) score of {Math.round(briScore)}/100{data.isEstimated ? ' (estimated)' : ''}. {briScore >= 70 ? 'This places you in a strong position relative to businesses at the point of exit.' : briScore >= 50 ? 'You have a solid foundation with clear, actionable paths to improve your exit value.' : 'There are meaningful opportunities to increase your value before entering a sale process.'}
              </p>
              {highPerformers.length > 0 && (
                <p>
                  Your strongest areas are {highPerformers.map(c => c.label).join(', ')}, which signal genuine business quality to buyers. {lowPerformers.length > 0 ? `The primary friction points that will surface in any serious diligence process are ${lowPerformers.map(c => c.label).join(' and ')}.` : 'Maintaining these strengths while completing your remaining assessment dimensions will sharpen this diagnosis.'}
                </p>
              )}
              {topRiskDrivers.length > 0 && (
                <p>
                  The risk drivers identified in this diagnosis represent an estimated {formatImpact(topRiskDrivers.reduce((sum, r) => sum + r.dollarImpact, 0))} in potential value impact. These are fixable problems — addressing them proactively before entering a formal sale process is the highest-leverage use of your time.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dimension Diagnostic Cards */}
      <div id="sec-categories">
        {data.categories.map(cat => {
          const cardColors = CATEGORY_CARD_COLORS[cat.category] ?? { bg: 'var(--surface-secondary)', stroke: 'var(--text-secondary)' }
          const confidencePct = cat.confidence.questionsTotal > 0
            ? Math.round((cat.confidence.questionsAnswered / cat.confidence.questionsTotal) * 100)
            : 0

          return (
            <div key={cat.category} className={styles.diagCard}>
              <div className={styles.diagCardHeader}>
                <div className={styles.diagCardIcon} style={{ background: cardColors.bg }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={cardColors.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {cat.score >= 70 ? (
                      <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>
                    ) : cat.score >= 50 ? (
                      <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>
                    ) : (
                      <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                    )}
                  </svg>
                </div>
                <div className={styles.diagCardTitleWrap}>
                  <div className={styles.diagCardTitle}>{cat.label}</div>
                  <div className={styles.diagCardSubtitle}>
                    {cat.isAssessed
                      ? `Score: ${Math.round(cat.score)}/100 · ${cat.confidence.questionsAnswered} of ${cat.confidence.questionsTotal} questions answered`
                      : 'Not yet assessed — answer questions to unlock this dimension'}
                  </div>
                </div>
                {cat.isAssessed && (
                  <div className={styles.confidenceWrap}>
                    <span className={styles.confidenceLabel}>Confidence</span>
                    <div className={styles.confidenceBarTrack}>
                      <div
                        className={styles.confidenceBarFill}
                        style={{ width: `${confidencePct}%`, background: getConfidenceColor(confidencePct) }}
                      />
                    </div>
                    <span className={styles.confidencePct} style={{ color: getConfidenceColor(confidencePct) }}>
                      {confidencePct}%
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.diagCardBody}>
                {cat.isAssessed ? (
                  <>
                    <div className={styles.diagNarrative}>
                      {/* TODO: wire to API — pull per-category AI narrative from /api/companies/:id/diagnosis */}
                      Your {cat.label} dimension scored {Math.round(cat.score)}/100, which is {cat.score >= 70 ? 'a strong result that buyers will view positively during diligence' : cat.score >= 50 ? 'a moderate result with clear room for improvement before a sale process' : 'below the threshold that most buyers require — this area needs focused attention'}.
                      {cat.dollarImpact && cat.dollarImpact < 0 && (
                        <> This dimension is estimated to be carrying {formatImpact(cat.dollarImpact)} in value risk based on your current assessment answers.</>
                      )}
                    </div>
                    <div className={styles.diagMetrics}>
                      <div className={styles.diagMetric}>
                        <div>
                          <div className={styles.diagMetricLabel}>Score</div>
                          <div className={styles.diagMetricValue} style={{ color: getScoreColor(cat.score) }}>
                            {Math.round(cat.score)}/100
                          </div>
                        </div>
                      </div>
                      <div className={styles.diagMetric}>
                        <div>
                          <div className={styles.diagMetricLabel}>Confidence</div>
                          <div className={styles.diagMetricValue} style={{ color: getConfidenceColor(confidencePct) }}>
                            {cat.confidence.label}
                          </div>
                        </div>
                      </div>
                      {cat.dollarImpact && cat.dollarImpact !== 0 && (
                        <div className={styles.diagMetric}>
                          <div>
                            <div className={styles.diagMetricLabel}>Value Impact</div>
                            <div className={styles.diagMetricValue} style={{ color: cat.dollarImpact < 0 ? 'var(--red)' : 'var(--green)' }}>
                              {cat.dollarImpact > 0 ? '+' : ''}{formatImpact(cat.dollarImpact)}
                            </div>
                          </div>
                        </div>
                      )}
                      {cat.financialContext?.metric && (
                        <div className={styles.diagMetric}>
                          <div>
                            <div className={styles.diagMetricLabel}>{cat.financialContext.metric.label}</div>
                            <div className={styles.diagMetricValue}>{cat.financialContext.metric.value}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className={styles.diagNarrative} style={{ marginBottom: 0 }}>
                      This dimension has not been assessed yet. Answer the questions for {cat.label} to see your score and unlock the AI diagnosis for this area.
                    </div>
                    <Link
                      href="/dashboard/assessments/take"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Start Assessment
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Red Flags Section */}
      {topRiskDrivers.length > 0 && (
        <div className={styles.diagCard} id="sec-redflags">
          <div className={styles.diagCardHeader}>
            <div className={styles.diagCardIcon} style={{ background: 'var(--red-light)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.diagCardTitleWrap}>
              <div className={styles.diagCardTitle}>Red Flags</div>
              <div className={styles.diagCardSubtitle}>What a buyer&apos;s diligence team will flag — address these before going to market</div>
            </div>
            <div className={styles.confidenceWrap}>
              <span className={styles.confidenceLabel}>Risk Level</span>
              <div className={styles.confidenceBarTrack}>
                <div className={styles.confidenceBarFill} style={{ width: '90%', background: 'var(--red)' }} />
              </div>
              <span className={styles.confidencePct} style={{ color: 'var(--red)' }}>High</span>
            </div>
          </div>
          <div className={styles.diagCardBody}>
            <div className={styles.diagNarrative}>
              Based on your assessment responses, the following are the issues most likely to be surfaced in buyer diligence. Address these proactively to avoid price re-trades after LOI.
            </div>
            <div style={{ marginTop: '14px' }}>
              {topRiskDrivers.map(driver => {
                const absImpact = Math.abs(driver.dollarImpact)
                const isCritical = absImpact >= 500_000
                return (
                  <div key={driver.id} className={styles.redFlagItem}>
                    <div className={styles.redFlagIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <div className={styles.redFlagTitle}>{driver.name}</div>
                      <div className={styles.redFlagDesc}>
                        {driver.buyerLogic ?? driver.questionText}
                        {driver.dollarImpact && (
                          <> Estimated value at risk: {formatImpact(driver.dollarImpact)}.</>
                        )}
                      </div>
                    </div>
                    <span className={`${styles.redFlagSeverity} ${isCritical ? styles.severityHigh : styles.severityMedium}`}>
                      {isCritical ? 'High' : 'Medium'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Playbook Recommendations */}
      {showPlaybooks && topPlaybooks.length > 0 && (
        <PostAssessmentPlaybooks
          playbooks={topPlaybooks}
          planTier={planTier}
          onDismiss={() => setShowPlaybooks(false)}
        />
      )}

      {/* Next Steps / Regen Bar */}
      <div className={styles.regenBar} id="sec-actions">
        <div className={styles.regenBarLeft}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className={styles.regenBarText}>
            {lastDate ? (
              <><strong>Diagnosis generated</strong> {lastDate} &middot; Updates automatically when you answer new assessment questions or upload updated financials</>
            ) : (
              <>Complete your assessment to generate your full AI diagnosis</>
            )}
          </div>
        </div>
        <div className={styles.regenBarActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export as PDF
          </button>
          {data.hasAssessment && (
            <button className={`${styles.btn} ${styles.btnPurple}`} type="button" onClick={() => fetchData()}>
              <svg viewBox="0 0 32 32" fill="none" style={{ width: '14px', height: '14px' }}>
                <path d="M16 4L17.8 12.2L26 14L17.8 15.8L16 24L14.2 15.8L6 14L14.2 12.2L16 4Z" fill="white" />
              </svg>
              Regenerate Diagnosis
            </button>
          )}
        </div>
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature="risk-assessment"
        featureDisplayName="Risk Diagnostic"
      />
    </>
  )
}
