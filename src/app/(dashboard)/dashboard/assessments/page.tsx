'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/assessments/assessments.module.css'

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function formatShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

interface Assessment {
  id: string
  assessmentType: string
  completedAt: string | null
  createdAt: string
  responses: Array<{
    question: { briCategory: string }
    selectedOption: { score: number } | null
  }>
}

interface DashboardData {
  tier1?: {
    currentValue: number
    briScore: number | null
    briFactors?: Array<{ category: string; label: string; score: number }>
  }
}

interface Signal {
  id: string
  title: string
  severity: string
  category: string | null
  estimatedValueImpact: number | null
  description: string | null
}

const DIMENSION_ORDER = [
  { key: 'FINANCIAL', label: 'Financial Health' },
  { key: 'REVENUE_GROWTH', label: 'Growth & Revenue' },
  { key: 'LEGAL_TAX', label: 'Legal & Compliance' },
  { key: 'OPERATIONAL', label: 'Operations & SOPs' },
  { key: 'CUSTOMER_CONCENTRATION', label: 'Customer Diversity' },
  { key: 'OWNER_DEPENDENCY', label: 'Owner Dependence' },
  { key: 'PERSONAL', label: 'Personal Readiness' },
]

function getScoreColor(score: number): string {
  if (score >= 75) return 'var(--green)'
  if (score >= 60) return 'var(--accent)'
  if (score >= 40) return 'var(--orange)'
  return 'var(--red)'
}

function getFillClass(score: number): string {
  if (score >= 75) return styles.fillGreen
  if (score >= 60) return styles.fillAccent
  if (score >= 40) return styles.fillOrange
  return styles.fillRed
}

function getStatusClass(score: number): string {
  if (score >= 70) return styles.dimensionStatusGood
  if (score >= 50) return styles.dimensionStatusWarn
  return styles.dimensionStatusBad
}

function getRingClass(score: number): string {
  if (score >= 75) return styles.ringFillGood
  if (score >= 50) return styles.ringFillModerate
  return styles.ringFillPoor
}

function getGradeLabel(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Highly Ready', className: styles.readinessGradeGood }
  if (score >= 60) return { label: 'Moderately Ready', className: styles.readinessGradeModerate }
  return { label: 'Needs Work', className: styles.readinessGradePoor }
}

export default function AssessmentsPage() {
  const { selectedCompanyId } = useCompany()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/dashboard`).then(r => r.ok ? r.json() : null),
      fetch(`/api/assessments?companyId=${selectedCompanyId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/signals?limit=10`).then(r => r.ok ? r.json() : null),
    ])
      .then(([dashData, assessData, signalData]) => {
        if (cancelled) return
        if (dashData) setDashboard(dashData)
        if (assessData?.assessments) setAssessments(assessData.assessments)
        if (signalData?.signals) setSignals(signalData.signals)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const briScore = dashboard?.tier1?.briScore ?? 0
  const briFactors = dashboard?.tier1?.briFactors ?? []
  const completedAssessment = assessments.find(a => a.completedAt)
  const incompleteAssessment = assessments.find(a => !a.completedAt)
  const totalQuestions = incompleteAssessment?.responses?.length ?? 0
  const ringOffset = 377 - (377 * (briScore / 100))
  const grade = getGradeLabel(briScore)

  // Key findings from signals (negative ones with value impact)
  const keyFindings = signals
    .filter(s => s.severity === 'HIGH' || s.severity === 'CRITICAL' || s.severity === 'MEDIUM' || s.severity === 'WARNING')
    .slice(0, 6)

  const criticalCount = keyFindings.filter(s => s.severity === 'CRITICAL').length
  const highCount = keyFindings.filter(s => s.severity === 'HIGH').length
  const mediumCount = keyFindings.filter(s => s.severity === 'MEDIUM' || s.severity === 'WARNING').length

  return (
    <>
      <TrackPageView page="/dashboard/assessments" />

      <div className={styles.pageHeader}>
        <div>
          <h1>Assessments</h1>
          <p>Evaluate your business, risks, and personal readiness for a successful exit</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/assessments" className={`${styles.btn} ${styles.btnSecondary}`}>
            <DownloadIcon /> Export Results
          </Link>
        </div>
      </div>

      {/* Overall Readiness Hero */}
      {briScore > 0 && (
        <div className={styles.readinessHero}>
          <div className={styles.readinessScoreSection}>
            <div className={styles.readinessRing}>
              <svg viewBox="0 0 160 160">
                <circle className={styles.ringBg} cx="80" cy="80" r="60" />
                <circle className={`${styles.ringFill} ${getRingClass(briScore)}`} cx="80" cy="80" r="60" style={{ strokeDashoffset: ringOffset }} />
              </svg>
              <div className={styles.readinessRingText}>
                <div className={styles.readinessNumber}>{Math.round(briScore)}</div>
                <div className={styles.readinessOf}>out of 100</div>
              </div>
            </div>
            <div className={`${styles.readinessGrade} ${grade.className}`}>{grade.label}</div>
          </div>

          <div className={styles.readinessDimensions}>
            <div className={styles.cardLabel} style={{ marginBottom: '4px' }}>Readiness by Dimension</div>
            {DIMENSION_ORDER.map(dim => {
              const factor = briFactors.find(f => f.category === dim.key)
              const score = factor?.score ?? 0
              if (score === 0 && !factor) return null
              return (
                <div key={dim.key} className={styles.dimensionRow}>
                  <span className={styles.dimensionLabel}>{factor?.label || dim.label}</span>
                  <div className={styles.dimensionBarTrack}>
                    <div className={`${styles.dimensionBarFill} ${getFillClass(score)}`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={styles.dimensionScore} style={{ color: getScoreColor(score) }}>{Math.round(score)}</span>
                  <div className={`${styles.dimensionStatus} ${getStatusClass(score)}`}>
                    {score >= 70 ? <CheckIcon /> : score >= 50 ? <AlertCircleIcon /> : <WarningIcon />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assessment Cards Grid */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Your Assessments</h2>
      </div>
      <div className={styles.assessGrid}>
        {/* Company Assessment */}
        <Link href={completedAssessment ? `/dashboard/diagnosis` : '/dashboard/assessments/take'} className={styles.assessCard}>
          <div className={styles.assessCardHeader}>
            <div className={`${styles.assessIcon} ${styles.assessIconBlue}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
            </div>
            <div className={styles.assessCardInfo}>
              <div className={styles.assessCardTitle}>Company Assessment</div>
              <div className={styles.assessCardDesc}>Overall business health across financials, operations, team, and market position</div>
            </div>
            <span className={`${styles.assessStatusBadge} ${completedAssessment ? styles.assessStatusComplete : incompleteAssessment ? styles.assessStatusInProgress : styles.assessStatusNotStarted}`}>
              {completedAssessment ? 'Complete' : incompleteAssessment ? 'In Progress' : 'Not Started'}
            </span>
          </div>
          {completedAssessment && briScore > 0 && (
            <div className={styles.assessCardBody}>
              <div className={styles.assessScoreRow}>
                <div className={styles.assessScoreBig} style={{ color: getScoreColor(briScore) }}>{Math.round(briScore)}</div>
                <div className={styles.assessScoreContext}>
                  <strong>{grade.label}</strong> — Your business readiness score.<br />
                  Completed {new Date(completedAssessment.completedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {briFactors.slice(0, 4).map(f => (
                  <div key={f.category} className={styles.miniBarRow}>
                    <span className={styles.miniBarLabel}>{f.label}</span>
                    <div className={styles.miniBarTrack}>
                      <div className={`${styles.miniBarFill} ${getFillClass(f.score)}`} style={{ width: `${f.score}%` }} />
                    </div>
                    <span className={styles.miniBarVal} style={{ color: getScoreColor(f.score) }}>{Math.round(f.score)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {incompleteAssessment && !completedAssessment && (
            <div className={styles.assessCardBody}>
              <div className={styles.progressInline}>
                <div className={styles.progressRingSm}>
                  <svg viewBox="0 0 36 36">
                    <circle className={styles.progBg} cx="18" cy="18" r="11" />
                    <circle className={styles.progFill} cx="18" cy="18" r="11" style={{ strokeDashoffset: 69.1 - (69.1 * (totalQuestions / 30)) }} />
                  </svg>
                  <div className={styles.progressRingText}>{Math.round((totalQuestions / 30) * 100)}%</div>
                </div>
                <div className={styles.progressLabel}>
                  <strong>{totalQuestions} questions answered</strong><br />
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Continue to complete your assessment</span>
                </div>
              </div>
              <Link href="/dashboard/assessments/take" className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', justifyContent: 'center' }}>
                Continue Assessment <ChevronRightIcon />
              </Link>
            </div>
          )}
        </Link>

        {/* Risk Assessment */}
        <div className={styles.assessCard} style={{ opacity: 0.6, cursor: 'default' }}>
          <div className={styles.assessCardHeader}>
            <div className={`${styles.assessIcon} ${styles.assessIconOrange}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div className={styles.assessCardInfo}>
              <div className={styles.assessCardTitle}>Risk Assessment</div>
              <div className={styles.assessCardDesc}>Industry-specific risks that could reduce your valuation or scare away buyers</div>
            </div>
            <span className={`${styles.assessStatusBadge} ${styles.assessStatusNotStarted}`}>Coming Soon</span>
          </div>
        </div>

        {/* Personal Readiness */}
        <div className={styles.assessCard} style={{ opacity: 0.6, cursor: 'default' }}>
          <div className={styles.assessCardHeader}>
            <div className={`${styles.assessIcon} ${styles.assessIconPurple}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div className={styles.assessCardInfo}>
              <div className={styles.assessCardTitle}>Personal Readiness</div>
              <div className={styles.assessCardDesc}>Are you emotionally, financially, and psychologically ready to sell your business?</div>
            </div>
            <span className={`${styles.assessStatusBadge} ${styles.assessStatusNotStarted}`}>Coming Soon</span>
          </div>
        </div>

        {/* AI Diagnosis */}
        <Link href="/dashboard/diagnosis" className={styles.assessCard}>
          <div className={styles.assessCardHeader}>
            <div className={`${styles.assessIcon} ${styles.assessIconTeal}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <div className={styles.assessCardInfo}>
              <div className={styles.assessCardTitle}>AI Diagnosis</div>
              <div className={styles.assessCardDesc}>Deep-dive diagnostic uncovering hidden readiness gaps with targeted follow-up questions</div>
            </div>
            <span className={`${styles.assessStatusBadge} ${completedAssessment ? styles.assessStatusInProgress : styles.assessStatusNotStarted}`}>
              {completedAssessment ? 'Available' : 'Requires Assessment'}
            </span>
          </div>
        </Link>
      </div>

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Key Findings</h2>
            <Link href="/dashboard/signals" className={styles.sectionLink}>View all findings &rarr;</Link>
          </div>
          <div className={styles.diagnosisCard}>
            <div className={styles.diagnosisHeader}>
              <h3>Gaps Identified Across Assessments</h3>
              <div className={styles.diagCount}>
                {criticalCount > 0 && (
                  <div className={styles.diagCountItem}><div className={styles.diagCountDot} style={{ background: 'var(--red)' }} />{criticalCount} Critical</div>
                )}
                {highCount > 0 && (
                  <div className={styles.diagCountItem}><div className={styles.diagCountDot} style={{ background: 'var(--orange)' }} />{highCount} High</div>
                )}
                {mediumCount > 0 && (
                  <div className={styles.diagCountItem}><div className={styles.diagCountDot} style={{ background: 'var(--accent)' }} />{mediumCount} Medium</div>
                )}
              </div>
            </div>
            <div>
              {keyFindings.map(signal => {
                const isCritical = signal.severity === 'CRITICAL'
                const isHigh = signal.severity === 'HIGH'
                const sevClass = isCritical ? styles.diagSeverityCritical : isHigh ? styles.diagSeverityHigh : styles.diagSeverityMedium
                const impactClass = isCritical ? styles.diagImpactNegative : isHigh ? styles.diagImpactWarning : styles.diagImpactInfo

                return (
                  <Link key={signal.id} href={`/dashboard/signals/${signal.id}`} className={styles.diagItem}>
                    <div className={`${styles.diagSeverity} ${sevClass}`}>
                      {isCritical || isHigh ? '!' : 'i'}
                    </div>
                    <div className={styles.diagContent}>
                      <div className={styles.diagTitle}>{signal.title}</div>
                      {signal.description && (
                        <div className={styles.diagDesc}>
                          {signal.description.length > 200 ? signal.description.slice(0, 200) + '...' : signal.description}
                        </div>
                      )}
                    </div>
                    {signal.estimatedValueImpact !== null && signal.estimatedValueImpact !== 0 && (
                      <div className={styles.diagImpact}>
                        <div className={styles.diagImpactLabel}>Value at Risk</div>
                        <div className={`${styles.diagImpactValue} ${impactClass}`}>
                          {signal.estimatedValueImpact < 0 ? '' : '+'}{formatShort(signal.estimatedValueImpact)}
                        </div>
                      </div>
                    )}
                    <div className={styles.diagArrow}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
