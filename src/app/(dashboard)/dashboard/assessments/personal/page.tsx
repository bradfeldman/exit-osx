'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/financials/financials-pages.module.css'

interface PersonalReadinessData {
  overallScore: number
  rating: string
  targetScore: number
  gap: number
  estimatedTime: string
  assessedAt: string
  dimensions: PersonalDimension[]
}

interface PersonalDimension {
  id: string
  name: string
  score: number
  barColor: 'green' | 'orange' | 'red'
  iconBg: string
  iconStroke: string
  findings: DimensionFinding[]
  alert?: { type: 'red' | 'orange'; text: string }
  resources: DimensionResource[]
}

interface DimensionFinding {
  type: 'positive' | 'negative' | 'neutral'
  text: string
}

interface DimensionResource {
  label: string
  href: string
}

// Static dimensions matching mocksite personal-readiness.html
const STATIC_DIMENSIONS: PersonalDimension[] = [
  {
    id: 'financial',
    name: 'Financial Preparedness',
    score: 72,
    barColor: 'green',
    iconBg: 'var(--green-light)',
    iconStroke: '#34C759',
    findings: [
      { type: 'positive', text: '$2.1M retirement savings' },
      { type: 'positive', text: 'Post-exit income plan exists' },
      { type: 'negative', text: 'Tax strategy not finalized' },
      { type: 'neutral', text: '$8.2M target exit proceeds' },
    ],
    resources: [
      { label: 'Retirement Planner', href: '/dashboard/financials/retirement' },
      { label: 'Tax Strategy Guide', href: '/dashboard/playbook' },
      { label: 'Wealth Transfer Planning', href: '/dashboard/playbook' },
    ],
  },
  {
    id: 'emotional',
    name: 'Emotional Readiness',
    score: 45,
    barColor: 'red',
    iconBg: 'var(--red-light)',
    iconStroke: '#FF3B30',
    findings: [
      { type: 'negative', text: 'High identity attachment to company' },
      { type: 'negative', text: 'Difficulty imagining life without the business' },
      { type: 'neutral', text: '23 years of ownership' },
    ],
    alert: {
      type: 'red',
      text: '<strong>Highest priority area.</strong> Low emotional readiness is the #1 predictor of deal collapse after LOI. Consider working with a business transition counselor or entrepreneur peer group before advancing in the sales process.',
    },
    resources: [
      { label: 'Identity & Transition Workshop', href: '/dashboard/playbook' },
      { label: 'Talk to AI Coach', href: '/dashboard/ai-coach' },
      { label: 'Founder Peer Network', href: '/dashboard/playbook' },
    ],
  },
  {
    id: 'post-exit',
    name: 'Post-Exit Plan',
    score: 38,
    barColor: 'red',
    iconBg: 'var(--red-light)',
    iconStroke: '#FF3B30',
    findings: [
      { type: 'negative', text: 'No clear plan for what comes next' },
      { type: 'negative', text: 'No philanthropic or board interests identified' },
      { type: 'neutral', text: 'Vague interest in mentoring' },
    ],
    alert: {
      type: 'orange',
      text: 'What will you do the Monday after you close? Buyers can often tell when a seller doesn\'t have an answer to this. It signals ambivalence that creates friction. Building a concrete "Chapter 2" plan is one of the highest-leverage things you can do right now.',
    },
    resources: [
      { label: 'Post-Exit Vision Workshop', href: '/dashboard/playbook' },
      { label: 'Board & Advisory Roles', href: '/dashboard/playbook' },
      { label: 'Angel Investing 101', href: '/dashboard/playbook' },
    ],
  },
  {
    id: 'family',
    name: 'Family Alignment',
    score: 65,
    barColor: 'green',
    iconBg: 'var(--green-light)',
    iconStroke: '#34C759',
    findings: [
      { type: 'positive', text: 'Spouse is supportive of exit' },
      { type: 'neutral', text: 'Two adult children in the business' },
      { type: 'negative', text: "Children's role post-sale unclear" },
    ],
    resources: [
      { label: 'Family Business Transition Guide', href: '/dashboard/playbook' },
      { label: 'Facilitating Family Conversations', href: '/dashboard/playbook' },
    ],
  },
  {
    id: 'timeline',
    name: 'Timeline Clarity',
    score: 70,
    barColor: 'green',
    iconBg: 'var(--green-light)',
    iconStroke: '#34C759',
    findings: [
      { type: 'positive', text: 'Targeting 18\u201324 month exit window' },
      { type: 'positive', text: 'Active LOI from ServiceMaster PE' },
      { type: 'neutral', text: 'Flexible on exit structure' },
    ],
    resources: [
      { label: 'Exit Timeline Builder', href: '/dashboard/playbook' },
      { label: 'Deal Room', href: '/dashboard/deal-room' },
    ],
  },
]

// Per-dimension inline SVGs matching mocksite exactly
function DimensionIcon({ id, stroke }: { id: string; stroke: string }) {
  switch (id) {
    case 'financial':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      )
    case 'emotional':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      )
    case 'post-exit':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      )
    case 'family':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case 'timeline':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    default:
      return null
  }
}

function barColorClass(color: 'green' | 'orange' | 'red') {
  if (color === 'green') return styles.dimBarGreen
  if (color === 'orange') return styles.dimBarOrange
  return styles.dimBarRed
}

function scoreColor(color: 'green' | 'orange' | 'red') {
  if (color === 'green') return 'var(--green)'
  if (color === 'orange') return 'var(--orange)'
  return 'var(--red)'
}

export default function PersonalReadinessPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<PersonalReadinessData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    try {
      // TODO: wire to real personal readiness API
      // const res = await fetch(`/api/companies/${selectedCompanyId}/personal-readiness`)
      // const json = await res.json()
      // setData(json)

      // Placeholder data matching mocksite
      setData({
        overallScore: 58,
        rating: 'Needs Work',
        targetScore: 75,
        gap: 17,
        estimatedTime: '6\u20139 months',
        assessedAt: 'February 10, 2026',
        dimensions: STATIC_DIMENSIONS,
      })
    } catch (err) {
      console.error('Failed to load personal readiness data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading || !data) {
    return (
      <div className={styles.prsPage}>
        <TrackPageView page="/dashboard/assessments/personal" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    )
  }

  // Score ring math: r=58, circumference = 2 * PI * 58 = 364.42
  const circumference = 364.42
  const fillLength = circumference * (data.overallScore / 100)
  const gapLength = circumference - fillLength

  return (
    <div className={styles.prsPage}>
      <TrackPageView page="/dashboard/assessments/personal" />

      {/* Breadcrumb */}
      <nav className={styles.prsBreadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/assessments">Assessments</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Personal Readiness</span>
      </nav>

      {/* Page header */}
      <div className={styles.prsPageHeader}>
        <div>
          <h1>Personal Readiness Results</h1>
          <p>5 dimensions of personal exit readiness &middot; Assessed {data.assessedAt}</p>
        </div>
        <div className={styles.prsHeaderActions}>
          <button className={`${styles.prsBtn} ${styles.prsBtnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export PDF
          </button>
          <Link href="/dashboard/financials/retirement" className={`${styles.prsBtn} ${styles.prsBtnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            Financial Planning
          </Link>
        </div>
      </div>

      {/* Hero — dark gradient with score ring */}
      <div className={styles.personalHero} role="region" aria-label="Personal Readiness Score">
        {/* Score ring */}
        <div className={styles.scoreRing}>
          <svg viewBox="0 0 140 140" aria-hidden="true">
            {/* Track */}
            <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
            {/* Fill */}
            <circle
              cx="70"
              cy="70"
              r="58"
              fill="none"
              stroke="#FF9500"
              strokeWidth="12"
              strokeDasharray={`${fillLength.toFixed(1)} ${gapLength.toFixed(1)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className={styles.scoreRingCenter}>
            <div className={styles.scoreRingNumber} style={{ color: 'var(--orange)' }}>{data.overallScore}</div>
            <div className={styles.scoreRingDenom}>/100</div>
          </div>
        </div>

        {/* Hero info */}
        <div>
          <div className={styles.prsHeroLabel}>Personal Readiness Score</div>
          <div className={styles.prsHeroRating}>
            <span className={styles.prsHeroRatingText}>{data.rating}</span>
            <span className={`${styles.prsHeroBadge} ${styles.prsHeroBadgeNeedsWork}`}>Below Target</span>
          </div>
          <div className={styles.prsHeroDesc}>
            You have strong financial preparedness and a clear timeline, but emotional readiness and post-exit planning are significantly underdeveloped. These are the dimensions that most often derail exits after a deal is signed.
          </div>
          <div className={styles.prsHeroStats}>
            <div>
              <div className={styles.prsHeroStatLabel}>Target Score</div>
              <div className={styles.prsHeroStatValue} style={{ color: 'var(--teal)' }}>{data.targetScore}</div>
            </div>
            <div>
              <div className={styles.prsHeroStatLabel}>Gap to Close</div>
              <div className={styles.prsHeroStatValue} style={{ color: 'var(--orange)' }}>{data.gap} pts</div>
            </div>
            <div>
              <div className={styles.prsHeroStatLabel}>Est. Time</div>
              <div className={styles.prsHeroStatValue} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px' }}>{data.estimatedTime}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Insight card */}
      <div className={styles.insightCard}>
        <div className={styles.insightIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div>
          <div className={styles.insightTitle}>What Founders Often Overlook</div>
          <div className={styles.insightItems}>
            <div className={styles.insightItem}>
              <div className={styles.insightBullet} aria-hidden="true" />
              <div>63% of founders report feeling lost in the first 12 months post-exit. Without a clear post-exit identity, deals often collapse or sellers experience significant regret after close.</div>
            </div>
            <div className={styles.insightItem}>
              <div className={styles.insightBullet} aria-hidden="true" />
              <div>Emotional readiness directly impacts negotiation behavior. Sellers who aren&apos;t ready emotionally often sabotage good deals unconsciously &mdash; asking for unrealistic terms or creating friction late in diligence.</div>
            </div>
            <div className={styles.insightItem}>
              <div className={styles.insightBullet} aria-hidden="true" />
              <div>Family alignment is the second most common reason deals fall apart after they&apos;re announced. Spouses and adult children need to be part of the exit conversation before LOI stage.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      {data.dimensions.map((dim) => (
        <div key={dim.id} className={styles.dimensionCard}>
          <div className={styles.dimensionHeader}>
            <div className={styles.dimensionIcon} style={{ background: dim.iconBg }}>
              <DimensionIcon id={dim.id} stroke={dim.iconStroke} />
            </div>
            <div className={styles.dimensionName}>{dim.name}</div>
            <div className={styles.dimensionScoreWrap}>
              <div className={styles.dimensionScore} style={{ color: scoreColor(dim.barColor) }}>{dim.score}</div>
              <div className={styles.dimensionScoreMax}>/100</div>
            </div>
          </div>

          <div className={styles.dimensionBarTrack}>
            <div
              className={`${styles.dimensionBarFill} ${barColorClass(dim.barColor)}`}
              style={{ width: `${dim.score}%` }}
              role="progressbar"
              aria-valuenow={dim.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${dim.name}: ${dim.score}/100`}
            />
          </div>

          <div className={styles.dimensionFindings}>
            {dim.findings.map((finding, i) => (
              <span
                key={i}
                className={`${styles.findingChip} ${
                  finding.type === 'positive' ? styles.findingChipPositive
                  : finding.type === 'negative' ? styles.findingChipNegative
                  : styles.findingChipNeutral
                }`}
              >
                {finding.type === 'positive' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {finding.type === 'negative' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                {finding.text}
              </span>
            ))}
          </div>

          {dim.alert && (
            <div
              className={`${styles.dimensionAlert} ${
                dim.alert.type === 'red' ? styles.dimensionAlertRed : styles.dimensionAlertOrange
              }`}
              // dangerouslySetInnerHTML used intentionally for inline <strong> from static copy
              dangerouslySetInnerHTML={{ __html: dim.alert.text }}
            />
          )}

          <div className={styles.dimensionResources}>
            <span className={styles.resourceLabel}>Resources</span>
            {dim.resources.map((res, i) => (
              <Link key={i} href={res.href} className={styles.resourceLink}>
                {res.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
