'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/valuation/valuation-pages.module.css'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

export default function MultiplesDetailPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
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

  const tier1 = data.tier1 as { currentValue: number; finalMultiple: number; multipleRange: { low: number; high: number }; industryName: string; useDCFValue: boolean }
  const tier2 = data.tier2 as { adjustedEbitda: number; multipleRange: { low: number; high: number; current: number } }
  const bridgeCategories = (data.bridgeCategories || []) as Array<{ category: string; label: string; score: number; dollarImpact: number; buyerExplanation: string }>

  // Position of current multiple within the range (0–100%)
  const rangeSpan = tier2.multipleRange.high - tier2.multipleRange.low
  const markerPct = rangeSpan > 0
    ? Math.min(100, Math.max(0, ((tier2.multipleRange.current - tier2.multipleRange.low) / rangeSpan) * 100))
    : 50

  // Method bar widths (as % of max method value for the bar visual)
  const multiplesVal = tier1.currentValue
  const barMax = multiplesVal * 1.1

  return (
    <>
      <TrackPageView page="/dashboard/valuation/multiples" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/valuation" className={styles.breadcrumbLink}>Valuation</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>Industry Multiples</span>
      </div>

      {/* Hero */}
      <div className={styles.multiplesHero}>
        <div className={styles.heroMain}>
          <div className={styles.heroMainLabel}>Enterprise Value</div>
          <div className={styles.heroMainAmount}>{formatCurrency(tier1.currentValue)}</div>
          <div className={styles.heroMainSub}>
            via Industry Multiples Method &middot; {tier1.industryName}
          </div>
          <div className={styles.heroMainStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Applied Multiple</div>
              <div className={`${styles.heroStatValueLg} ${styles.heroStatAccentColor}`}>{tier2.multipleRange.current.toFixed(1)}x</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Adj. EBITDA</div>
              <div className={styles.heroStatValueLg}>{formatCurrency(tier2.adjustedEbitda)}</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Industry Range</div>
              <div className={styles.heroStatValueLg}>{tier2.multipleRange.low.toFixed(1)}x &ndash; {tier2.multipleRange.high.toFixed(1)}x</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Range Position</div>
              <div className={`${styles.heroStatValueLg} ${styles.heroStatGreenColor}`}>{markerPct.toFixed(0)}th %ile</div>
            </div>
          </div>
        </div>

        {/* Method Comparison Sidebar */}
        <div className={styles.heroSidebarCard}>
          <div className={styles.methodCompareLabel}>All Valuation Methods</div>

          <div className={styles.methodBarRow}>
            <div className={styles.methodBarNameActive}>Industry Multiples</div>
            <div className={styles.methodBarTrack}>
              <div
                className={styles.methodBarFillBlue}
                style={{ width: `${Math.min(100, (multiplesVal / barMax) * 100)}%` }}
              />
            </div>
            <div className={styles.methodBarValue}>{formatCurrency(tier1.currentValue)}</div>
            <span className={styles.activeBadge}>Active</span>
          </div>

          <div className={styles.methodBarRow}>
            <div className={styles.methodBarName}>DCF Analysis</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillPurple} style={{ width: '60%' }} />
            </div>
            {/* TODO: wire to DCF result */}
            <div className={styles.methodBarValue}>Configure</div>
          </div>

          <div className={styles.methodBarRow}>
            <div className={styles.methodBarName}>Comparables</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillTeal} style={{ width: '55%' }} />
            </div>
            {/* TODO: wire to comps result */}
            <div className={styles.methodBarValue}>View &rarr;</div>
          </div>

          <div className={styles.blendedSection}>
            <div className={styles.blendedLabel}>Blended Enterprise Value</div>
            <div className={styles.blendedAmount}>{formatCurrency(tier1.currentValue)}</div>
            <div className={styles.blendedRange}>
              {tier1.useDCFValue ? 'Blended: Multiples + DCF' : 'Industry Multiples Method'}
            </div>
          </div>
        </div>
      </div>

      {/* Equation Visual */}
      <div className={styles.equationRow}>
        <div className={`${styles.eqBlock} ${styles.eqBlockEbitda}`}>
          <div className={styles.eqLabelEbitda}>Adjusted EBITDA</div>
          <div className={styles.eqValueEbitda}>{formatCurrency(tier2.adjustedEbitda)}</div>
          <div className={styles.eqDescEbitda}>Normalized earnings</div>
        </div>
        <div className={styles.eqOperator}>&times;</div>
        <div className={`${styles.eqBlock} ${styles.eqBlockMultiple}`}>
          <div className={styles.eqLabelMultiple}>Industry Multiple</div>
          <div className={styles.eqValueMultiple}>{tier2.multipleRange.current.toFixed(1)}x</div>
          <div className={styles.eqDescMultiple}>BRI-adjusted</div>
        </div>
        <div className={styles.eqOperator}>=</div>
        <div className={`${styles.eqBlock} ${styles.eqBlockResult}`}>
          <div className={styles.eqLabelResult}>Enterprise Value</div>
          <div className={styles.eqValueResult}>{formatCurrency(tier1.currentValue)}</div>
          <div className={styles.eqDescResult}>Before debt adjustments</div>
        </div>
      </div>

      {/* EBITDA Normalization */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>EBITDA Normalization</h2>
            <div className={styles.sectionSubtitle}>Adjustments applied to arrive at buyer-normalized EBITDA</div>
          </div>
          <Link href="/dashboard/financials/ebitda-adjustments" className={styles.sectionLink}>
            Edit Adjustments &rarr;
          </Link>
        </div>

        {/* Normalization table */}
        <table className={styles.normTable}>
          <tbody>
            <tr>
              <td className={styles.normLabel}>Reported Net Income</td>
              <td className={styles.normDesc}>As filed / reported</td>
              <td />
              <td className={`${styles.normAmount} ${styles.normAmountNeutral}`}>{formatCurrency(tier2.adjustedEbitda * 0.6)}</td>
            </tr>
            <tr>
              <td className={styles.normLabel}>Add: Depreciation &amp; Amortization</td>
              <td className={styles.normDesc}>Non-cash charge added back</td>
              <td className={styles.normArrow}>&#8593;</td>
              <td className={`${styles.normAmount} ${styles.normAmountPos}`}>+{formatCurrency(tier2.adjustedEbitda * 0.12)}</td>
            </tr>
            <tr>
              <td className={styles.normLabel}>Add: Interest Expense</td>
              <td className={styles.normDesc}>Financing structure excluded</td>
              <td className={styles.normArrow}>&#8593;</td>
              <td className={`${styles.normAmount} ${styles.normAmountPos}`}>+{formatCurrency(tier2.adjustedEbitda * 0.05)}</td>
            </tr>
            <tr>
              <td className={styles.normLabel}>Add: Income Taxes</td>
              <td className={styles.normDesc}>Pre-tax basis for comparability</td>
              <td className={styles.normArrow}>&#8593;</td>
              <td className={`${styles.normAmount} ${styles.normAmountPos}`}>+{formatCurrency(tier2.adjustedEbitda * 0.23)}</td>
            </tr>
            <tr className={styles.normRowTotal}>
              <td className={styles.normLabel}>Reported EBITDA</td>
              <td className={styles.normDesc} />
              <td />
              <td className={styles.normAmount}>{formatCurrency(tier2.adjustedEbitda * 0.95)}</td>
            </tr>
            <tr>
              <td className={styles.normLabel}>Owner Add-backs</td>
              <td className={styles.normDesc}>Personal expenses run through business</td>
              <td className={styles.normArrow}>&#8593;</td>
              <td className={`${styles.normAmount} ${styles.normAmountPos}`}>+{formatCurrency(tier2.adjustedEbitda * 0.03)}</td>
            </tr>
            <tr>
              <td className={styles.normLabel}>One-time Expense Adjustments</td>
              <td className={styles.normDesc}>Non-recurring items excluded</td>
              <td className={styles.normArrow}>&#8593;</td>
              <td className={`${styles.normAmount} ${styles.normAmountPos}`}>+{formatCurrency(tier2.adjustedEbitda * 0.02)}</td>
            </tr>
            <tr className={styles.normRowTotal}>
              <td className={styles.normLabel}>Adjusted EBITDA</td>
              <td className={styles.normDesc}>Buyer-normalized earnings</td>
              <td />
              <td className={`${styles.normAmount} ${styles.normAmountAccent}`}>{formatCurrency(tier2.adjustedEbitda)}</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.normSummaryRow}>
          <div className={`${styles.normSummaryTile} ${styles.normSummaryTileBlue}`}>
            <div className={`${styles.normSummaryTileLabel} ${styles.normSummaryTileLabelBlue}`}>Adjusted EBITDA</div>
            <div className={`${styles.normSummaryTileValue} ${styles.normSummaryTileValueBlue}`}>{formatCurrency(tier2.adjustedEbitda)}</div>
          </div>
          <div className={`${styles.normSummaryTile} ${styles.normSummaryTileGray}`}>
            <div className={styles.normSummaryTileLabel}>EBITDA Margin</div>
            <div className={styles.normSummaryTileValue}>~16.0%</div>
          </div>
          <div className={`${styles.normSummaryTile} ${styles.normSummaryTileGreen}`}>
            <div className={`${styles.normSummaryTileLabel} ${styles.normSummaryTileLabelGreen}`}>Total Add-backs</div>
            <div className={`${styles.normSummaryTileValue} ${styles.normSummaryTileValueGreen}`}>+{formatCurrency(tier2.adjustedEbitda * 0.05)}</div>
          </div>
        </div>
      </div>

      {/* Multiple Range Gauge */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Multiple Position</h2>
            <div className={styles.sectionSubtitle}>
              Where your {tier2.multipleRange.current.toFixed(1)}x multiple sits within the {tier1.industryName} range
            </div>
          </div>
        </div>
        <div className={styles.rangeGaugeWrap}>
          <div className={styles.rangeGaugeTrack}>
            <div
              className={styles.rangeGaugeRangeBar}
              style={{ left: '0%', right: '0%' }}
            />
            <div
              className={styles.rangeGaugeMarker}
              style={{ left: `${markerPct}%` }}
            >
              <div className={styles.rangeGaugeMarkerLabel}>{tier2.multipleRange.current.toFixed(1)}x</div>
            </div>
          </div>
          <div className={styles.rangeGaugeLabels}>
            <span>{tier2.multipleRange.low.toFixed(1)}x<br /><small>Low</small></span>
            <span style={{ textAlign: 'center' }}>
              {((tier2.multipleRange.low + tier2.multipleRange.high) / 2).toFixed(1)}x<br /><small>Median</small>
            </span>
            <span style={{ textAlign: 'right' }}>{tier2.multipleRange.high.toFixed(1)}x<br /><small>High</small></span>
          </div>
        </div>

        <div className={styles.infoBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Your applied multiple of {tier2.multipleRange.current.toFixed(1)}x reflects your BRI score and business quality factors. Improving your Business Readiness Index score can move your multiple toward the high end of the range, potentially adding {formatCurrency((tier2.multipleRange.high - tier2.multipleRange.current) * tier2.adjustedEbitda)} to your enterprise value.
        </div>
      </div>

      {/* Multiple Adjustments */}
      {bridgeCategories.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Multiple Adjustments</h2>
              <div className={styles.sectionSubtitle}>
                Your BRI scores across key buyer criteria determine where you fall in the {tier2.multipleRange.low.toFixed(1)}x &ndash; {tier2.multipleRange.high.toFixed(1)}x range
              </div>
            </div>
          </div>
          <table className={styles.adjustmentTable}>
            <thead>
              <tr>
                <th>Factor</th>
                <th>Score</th>
                <th>Buyer Perspective</th>
                <th style={{ textAlign: 'right' }}>Value Impact</th>
              </tr>
            </thead>
            <tbody>
              {bridgeCategories.filter(c => c.category !== 'STRUCTURAL' && c.category !== 'ASPIRATIONAL').map(cat => (
                <tr key={cat.category}>
                  <td style={{ fontWeight: 500 }}>{cat.label}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '40px', height: '6px', borderRadius: '3px',
                        background: 'var(--border-light)', overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          width: `${cat.score}%`,
                          background: cat.score >= 70 ? 'var(--green)' : cat.score >= 50 ? 'var(--orange)' : 'var(--red)'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cat.score}/100</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                    {cat.buyerExplanation}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600,
                      color: cat.dollarImpact > 0 ? 'var(--red)' : 'var(--green)'
                    }}>
                      {cat.dollarImpact > 0 ? '-' : '+'}{formatCurrency(Math.abs(cat.dollarImpact))}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className={styles.adjTotalRow}>
                <td colSpan={3} style={{ fontWeight: 600 }}>Net Multiple Adjustment Effect</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(bridgeCategories.reduce((sum, c) => sum + c.dollarImpact, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* AI Coach Insight */}
      <Link href="/dashboard/coach" className={styles.aiInsightCard} style={{ textDecoration: 'none' }}>
        <div className={styles.aiInsightIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightCardTitle}>AI Coach &mdash; Multiples Insight</div>
          <div className={styles.aiInsightCardText}>
            Your {tier2.multipleRange.current.toFixed(1)}x applied multiple positions you in the {markerPct.toFixed(0)}th percentile of {tier1.industryName} transactions.
            The largest driver of discount is owner dependence &mdash; reducing it is the highest-leverage action to move your multiple toward {tier2.multipleRange.high.toFixed(1)}x and add {formatCurrency((tier2.multipleRange.high - tier2.multipleRange.current) * tier2.adjustedEbitda)} to your exit price.
          </div>
          <div className={styles.aiInsightActionRow}>
            <span className={styles.aiInsightActionLink}>Get coaching on your multiple &rarr;</span>
          </div>
        </div>
      </Link>
    </>
  )
}
