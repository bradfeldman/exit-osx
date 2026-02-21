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

  // BRI ring circumference = 2 * pi * 40 ≈ 251
  const ringCircumference = 251
  const ringOffset = ringCircumference - (ringCircumference * briScore / 100)

  return (
    <>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span>Valuation</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderFlex}>
          <div>
            <div className={styles.pageTitle}>Valuation</div>
            <div className={styles.pageSubtitle}>{tier1.industryName} &middot; Updated today</div>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/valuation/history" className={`${styles.btn} ${styles.btnSecondary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              History
            </Link>
          </div>
        </div>
      </div>

      {/* Valuation Hero Card */}
      <div className={styles.valHeroCard}>
        <div className={styles.valHeroLeftSection}>
          <div className={styles.valHeroLabel}>Enterprise Value</div>
          <div className={styles.valHeroAmountLg}>{formatCurrency(tier1.currentValue)}</div>
          {tier1.evRange && (
            <div className={styles.valHeroRangeSub}>
              Range: {formatCurrency(tier1.evRange.low)} &mdash; {formatCurrency(tier1.evRange.high)}
            </div>
          )}
          {valueTrend.length >= 2 && (() => {
            const change = tier1.currentValue - valueTrend[valueTrend.length - 2].value
            const isPositive = change >= 0
            return (
              <div className={`${styles.valHeroChangePill} ${isPositive ? styles.positive : styles.negative}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {isPositive
                    ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                    : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
                  }
                </svg>
                {isPositive ? '+' : ''}{formatCurrency(change)} since last period
              </div>
            )
          })()}
          <div className={styles.valHeroMetaRow}>
            <div className={styles.valMetaItem}>
              <span className={styles.valMetaLabel}>Multiple</span>
              <span className={styles.valMetaValue}>{tier2.multipleRange.current.toFixed(1)}x EBITDA</span>
            </div>
            <div className={styles.valMetaDivider} />
            <div className={styles.valMetaItem}>
              <span className={styles.valMetaLabel}>Method</span>
              <span className={styles.valMetaValue}>{tier1.useDCFValue ? 'Blended (Multiples + DCF)' : 'Industry Multiples'}</span>
            </div>
          </div>
        </div>

        {/* Confidence Ring */}
        <div className={styles.valHeroRightSection}>
          <div className={styles.confidenceLabel}>Confidence Score</div>
          <div className={styles.confidenceRingMd}>
            <svg viewBox="0 0 100 100" width="120" height="120">
              <circle
                fill="none" stroke="var(--border-light)" strokeWidth="8"
                cx="50" cy="50" r="40"
              />
              <circle
                fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeLinecap="round" cx="50" cy="50" r="40"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
              <text x="50" y="46" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="800">{briScore}</text>
              <text x="50" y="60" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9" fontWeight="600">BRI SCORE</text>
            </svg>
          </div>
          <div className={styles.confidenceNote}>Business Readiness Index</div>
        </div>
      </div>

      {/* AI Coach Insight */}
      <Link href="/dashboard/coach" className={styles.aiInsightCard} style={{ textDecoration: 'none' }}>
        <div className={styles.aiInsightIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightCardTitle}>AI Coach Analysis</div>
          <div className={styles.aiInsightCardText}>
            Your valuation is trending positively. The biggest opportunity to increase value is reducing owner dependence &mdash; this single factor could add {formatCurrency(tier1.valueGap * 0.3)} to your enterprise value.
          </div>
          <div className={styles.aiInsightActionRow}>
            <span className={styles.aiInsightActionLink}>Get personalized recommendations &rarr;</span>
          </div>
        </div>
      </Link>

      {/* Peer Benchmark Card */}
      {/* TODO: wire to API — /api/companies/${selectedCompanyId}/benchmarks */}
      <div className={styles.benchmarkCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Peer Benchmark</h2>
          <div className={styles.sectionLabelBadge}>{tier1.industryName}</div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>Your Multiple</div>
            <div className={`${styles.heroStatValue} ${styles.accent}`}>{tier2.multipleRange.current.toFixed(1)}x</div>
            <div className={styles.heroStatSub}>Industry median</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>Industry Range</div>
            <div className={styles.heroStatValue}>{tier2.multipleRange.low.toFixed(1)}x &ndash; {tier2.multipleRange.high.toFixed(1)}x</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>BRI Percentile</div>
            <div className={`${styles.heroStatValue} ${styles.green}`}>
              {tier2.multipleRange.high > tier2.multipleRange.low
                ? Math.round(((tier2.multipleRange.current - tier2.multipleRange.low) / (tier2.multipleRange.high - tier2.multipleRange.low)) * 100)
                : 50}th
            </div>
            <div className={styles.heroStatSub}>vs. industry peers</div>
          </div>
        </div>
      </div>

      {/* Valuation Methods Grid */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Valuation Methods</h2>
      </div>
      <div className={styles.methodsGrid}>
        <Link href="/dashboard/valuation/multiples" className={`${styles.methodCard} ${!tier1.useDCFValue ? styles.selected : ''}`}>
          <div className={`${styles.methodIcon} ${styles.blue}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div className={styles.methodName}>Industry Multiples</div>
          <div className={styles.methodValue}>{formatCurrency(tier1.currentValue)}</div>
          <div className={styles.methodDesc}>
            {tier2.multipleRange.current.toFixed(1)}x Adjusted EBITDA of {formatCurrency(tier2.adjustedEbitda)}
          </div>
        </Link>

        <Link href="/dashboard/valuation/dcf" className={`${styles.methodCard} ${tier1.useDCFValue ? styles.selected : ''}`}>
          <div className={`${styles.methodIcon} ${styles.purple}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
            </svg>
          </div>
          <div className={styles.methodName}>DCF Analysis</div>
          <div className={styles.methodValue}>{tier1.useDCFValue ? formatCurrency(tier1.currentValue) : 'Configure \u2192'}</div>
          <div className={styles.methodDesc}>
            Discounted cash flow model based on projected earnings
          </div>
        </Link>

        <Link href="/dashboard/valuation/comparables" className={styles.methodCard}>
          <div className={`${styles.methodIcon} ${styles.teal}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div className={styles.methodName}>Comparables</div>
          <div className={styles.methodValue}>View Comps \u2192</div>
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

      {/* Valuation Trend */}
      {valueTrend.length > 1 && (
        <div className={styles.trendCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Valuation Trend</h2>
            <Link href="/dashboard/valuation/history" className={styles.sectionLink}>
              Full History &rarr;
            </Link>
          </div>
          <div className={styles.trendChart}>
            {valueTrend.map((point, i) => {
              const heightPct = 20 + ((point.value - trendMin) / trendRange) * 80
              const isLast = i === valueTrend.length - 1
              return (
                <div key={i} className={styles.trendCol}>
                  <div className={styles.trendVal}>{formatCurrency(point.value)}</div>
                  <div
                    className={`${styles.trendBar} ${isLast ? styles.trendBarCurrent : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className={`${styles.trendMonth} ${isLast ? styles.trendMonthCurrent : ''}`}>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
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

      {/* Value Ledger */}
      {/* TODO: wire to API — /api/companies/${selectedCompanyId}/value-ledger */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Value Ledger</h2>
          <div className={styles.sectionSubtitleSm}>Key events that moved your valuation</div>
        </div>
        <div className={styles.ledgerList}>
          {bridgeCategories.slice(0, 3).map((cat, i) => (
            <div key={cat.category} className={styles.ledgerItem}>
              <div className={`${styles.ledgerDot} ${i === 0 ? styles.ledgerDotGreen : styles.ledgerDotOrange}`} />
              <div className={styles.ledgerContent}>
                <div className={styles.ledgerTitle}>{cat.label} improvement opportunity</div>
                <div className={styles.ledgerNarrative}>{cat.buyerExplanation}</div>
              </div>
              <div className={`${styles.ledgerImpact} ${cat.dollarImpact > 0 ? styles.ledgerImpactNeg : styles.ledgerImpactPos}`}>
                {cat.dollarImpact > 0 ? '-' : '+'}{formatCurrency(Math.abs(cat.dollarImpact))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
