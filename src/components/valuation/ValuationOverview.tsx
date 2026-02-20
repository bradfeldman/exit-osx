'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import styles from './valuation-pages.module.css'

interface DashboardData {
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    briScore: number | null
    finalMultiple: number
    multipleRange: { low: number; high: number }
    industryName: string
    useDCFValue: boolean
    evRange: { low: number; mid: number; high: number } | null
  }
  tier2: {
    adjustedEbitda: number
    multipleRange: { low: number; high: number; current: number }
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string }>
  }
  bridgeCategories: Array<{
    category: string
    label: string
    score: number
    dollarImpact: number
    buyerExplanation: string
  }>
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)

const DollarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
  </svg>
)

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
  </svg>
)

const TrendUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)

export function ValuationOverview() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false
    fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      .then(res => res.ok ? res.json() : null)
      .then(d => { if (!cancelled && d) setData(d) })
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

  const { tier1, tier2, tier5, bridgeCategories } = data
  const valueTrend = tier5.valueTrend
  const trendMax = Math.max(...valueTrend.map(t => t.value), 1)
  const trendMin = Math.min(...valueTrend.map(t => t.value), 0)
  const trendRange = trendMax - trendMin || 1
  const briScore = tier1.briScore ?? 0
  const gapPercent = tier1.potentialValue > 0
    ? Math.round((tier1.currentValue / tier1.potentialValue) * 100)
    : 100

  return (
    <>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1>Valuation</h1>
            <p>{tier1.industryName}</p>
          </div>
          <Link href="/dashboard/valuation/history" className={styles.sectionLink}>
            View History &rarr;
          </Link>
        </div>
      </div>

      {/* Valuation Hero */}
      <div className={styles.valHero}>
        <div className={styles.valHeroLeft}>
          <div className={styles.valHeroLabel}>Enterprise Value</div>
          <div className={styles.valHeroAmount}>{formatCurrency(tier1.currentValue)}</div>
          {tier1.evRange && (
            <div className={styles.valHeroRange}>
              Range: {formatCurrency(tier1.evRange.low)} — {formatCurrency(tier1.evRange.high)}
            </div>
          )}
          {valueTrend.length >= 2 && (
            <div className={styles.valHeroChange}>
              <TrendUpIcon />
              {formatCurrency(tier1.currentValue - valueTrend[valueTrend.length - 2].value)} since last period
            </div>
          )}
          <div className={styles.valHeroMeta}>
            {tier2.multipleRange.current.toFixed(1)}x Adjusted EBITDA &middot;{' '}
            {tier1.useDCFValue ? 'Blended (Multiples + DCF)' : 'Industry Multiples Method'}
          </div>
        </div>

        {/* Confidence Ring */}
        <div className={styles.valHeroRight}>
          <div className={styles.valHeroLabel}>Confidence Score</div>
          <div className={styles.confidenceRing}>
            <svg viewBox="0 0 100 100">
              <circle
                fill="none" stroke="var(--border-light)" strokeWidth="8"
                cx="50" cy="50" r="40"
              />
              <circle
                fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeLinecap="round" cx="50" cy="50" r="40"
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * briScore / 100)}
              />
            </svg>
            <div className={styles.confidenceText}>
              <div className={styles.confidenceNum}>{briScore}</div>
              <div className={styles.confidenceSub}>BRI Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Methods Grid */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Valuation Methods</h2>
      </div>
      <div className={styles.methodsGrid}>
        <Link href="/dashboard/valuation/multiples" className={`${styles.methodCard} ${!tier1.useDCFValue ? styles.selected : ''}`}>
          <div className={`${styles.methodIcon} ${styles.blue}`}>
            <DollarIcon />
          </div>
          <div className={styles.methodName}>Industry Multiples</div>
          <div className={styles.methodValue}>{formatCurrency(tier1.currentValue)}</div>
          <div className={styles.methodDesc}>
            {tier2.multipleRange.current.toFixed(1)}x Adjusted EBITDA of {formatCurrency(tier2.adjustedEbitda)}
          </div>
        </Link>

        <Link href="/dashboard/valuation/dcf" className={`${styles.methodCard} ${tier1.useDCFValue ? styles.selected : ''}`}>
          <div className={`${styles.methodIcon} ${styles.purple}`}>
            <ChartIcon />
          </div>
          <div className={styles.methodName}>DCF Analysis</div>
          <div className={styles.methodValue}>{tier1.useDCFValue ? formatCurrency(tier1.currentValue) : 'Configure →'}</div>
          <div className={styles.methodDesc}>
            Discounted cash flow model based on projected earnings
          </div>
        </Link>

        <Link href="/dashboard/valuation/comparables" className={styles.methodCard}>
          <div className={`${styles.methodIcon} ${styles.teal}`}>
            <UsersIcon />
          </div>
          <div className={styles.methodName}>Comparables</div>
          <div className={styles.methodValue}>View Comps →</div>
          <div className={styles.methodDesc}>
            Comparable transactions in your industry and size range
          </div>
        </Link>
      </div>

      {/* Math Card */}
      <div className={styles.mathCard}>
        <div className={styles.mathHeader}>How We Calculate Your Value</div>
        <div className={styles.mathEquation}>
          <div className={styles.mathBlock}>
            <div className={styles.mathBlockValue}>{formatCurrency(tier2.adjustedEbitda)}</div>
            <div className={styles.mathBlockLabel}>Adjusted EBITDA</div>
          </div>
          <div className={styles.mathOperator}>&times;</div>
          <div className={styles.mathBlock}>
            <div className={styles.mathBlockValue}>{tier2.multipleRange.current.toFixed(1)}x</div>
            <div className={styles.mathBlockLabel}>Industry Multiple</div>
          </div>
          <div className={styles.mathOperator}>=</div>
          <div className={styles.mathResult}>
            <div className={styles.mathBlockValue}>{formatCurrency(tier1.currentValue)}</div>
            <div className={styles.mathBlockLabel}>Enterprise Value</div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {valueTrend.length > 1 && (
        <div className={styles.trendSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Valuation Trend</h2>
            <Link href="/dashboard/valuation/history" className={styles.sectionLink}>
              Full History &rarr;
            </Link>
          </div>
          <div className={styles.chartArea}>
            {valueTrend.map((point, i) => {
              const heightPct = 20 + ((point.value - trendMin) / trendRange) * 80
              const isLast = i === valueTrend.length - 1
              return (
                <div key={i} className={styles.chartCol}>
                  <div className={styles.chartBarValue}>{formatCurrency(point.value)}</div>
                  <div
                    className={`${styles.chartBar} ${isLast ? styles.current : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className={`${styles.chartLabel} ${isLast ? styles.current : ''}`}>
                    {new Date(point.date).toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Value Gap Analysis */}
      {tier1.valueGap > 0 && bridgeCategories.length > 0 && (
        <div className={styles.gapCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Value Gap Analysis</h2>
              <div className={styles.sectionSubtitle}>
                {formatCurrency(tier1.valueGap)} opportunity to close
              </div>
            </div>
          </div>
          <div className={styles.gapVisual}>
            <div className={styles.gapBarTrack}>
              <div
                className={styles.gapBarCurrent}
                style={{ width: `${gapPercent}%` }}
              />
            </div>
            <div className={styles.gapAmounts}>
              <span className={styles.gapAmountValue} style={{ color: 'var(--accent)' }}>
                Current: {formatCurrency(tier1.currentValue)}
              </span>
              <span className={styles.gapAmountValue} style={{ color: 'var(--text-tertiary)' }}>
                Potential: {formatCurrency(tier1.potentialValue)}
              </span>
            </div>
          </div>
          <div className={styles.gapFactors}>
            {bridgeCategories.slice(0, 4).map((cat, i) => {
              const colorClasses = [styles.red, styles.orange, styles.purple, styles.teal]
              return (
                <div key={cat.category} className={styles.gapFactor}>
                  <div className={`${styles.gapFactorIcon} ${colorClasses[i % colorClasses.length]}`}>
                    <WarningIcon />
                  </div>
                  <div>
                    <div className={styles.gapFactorName}>{cat.label}</div>
                    <div className={styles.gapFactorAmount}>{formatCurrency(cat.dollarImpact)} impact</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Coach Insight */}
      <Link href="/dashboard/coach" className={styles.aiInsight} style={{ textDecoration: 'none' }}>
        <div className={styles.aiInsightIcon}>
          <ChatIcon />
        </div>
        <div className={styles.aiInsightContent}>
          <div className={styles.aiInsightTitle}>AI Coach Analysis</div>
          <div className={styles.aiInsightText}>
            Your valuation is trending positively. The biggest opportunity to increase value is reducing owner dependence — this single factor could add {formatCurrency(tier1.valueGap * 0.3)} to your enterprise value.
          </div>
        </div>
      </Link>
    </>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
