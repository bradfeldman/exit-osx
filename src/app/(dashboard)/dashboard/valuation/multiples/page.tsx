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

  const tier1 = data.tier1 as { currentValue: number; finalMultiple: number; multipleRange: { low: number; high: number }; industryName: string }
  const tier2 = data.tier2 as { adjustedEbitda: number; multipleRange: { low: number; high: number; current: number } }
  const bridgeCategories = (data.bridgeCategories || []) as Array<{ category: string; label: string; score: number; dollarImpact: number; buyerExplanation: string }>

  return (
    <>
      <TrackPageView page="/dashboard/valuation/multiples" />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1>Industry Multiples</h1>
            <p>{tier1.industryName}</p>
          </div>
          <Link href="/dashboard/valuation" className={styles.sectionLink}>
            &larr; Back to Valuation
          </Link>
        </div>
      </div>

      {/* Hero Stats */}
      <div className={styles.heroStats}>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Enterprise Value</div>
          <div className={`${styles.heroStatValue} ${styles.accent}`}>{formatCurrency(tier1.currentValue)}</div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Applied Multiple</div>
          <div className={styles.heroStatValue}>{tier2.multipleRange.current.toFixed(1)}x</div>
          <div className={styles.heroStatSub}>Range: {tier2.multipleRange.low.toFixed(1)}x – {tier2.multipleRange.high.toFixed(1)}x</div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Adjusted EBITDA</div>
          <div className={styles.heroStatValue}>{formatCurrency(tier2.adjustedEbitda)}</div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>BRI Impact</div>
          <div className={`${styles.heroStatValue} ${styles.green}`}>
            {((tier2.multipleRange.current - tier2.multipleRange.low) / (tier2.multipleRange.high - tier2.multipleRange.low) * 100).toFixed(0)}%
          </div>
          <div className={styles.heroStatSub}>Position in range</div>
        </div>
      </div>

      {/* Math Equation */}
      <div className={styles.mathCard}>
        <div className={styles.mathHeader}>How We Calculate</div>
        <div className={styles.mathEquation}>
          <div className={styles.mathBlock}>
            <div className={styles.mathBlockValue}>{formatCurrency(tier2.adjustedEbitda)}</div>
            <div className={styles.mathBlockLabel}>Adjusted EBITDA</div>
          </div>
          <div className={styles.mathOperator}>&times;</div>
          <div className={styles.mathBlock}>
            <div className={styles.mathBlockValue}>{tier2.multipleRange.current.toFixed(1)}x</div>
            <div className={styles.mathBlockLabel}>Applied Multiple</div>
          </div>
          <div className={styles.mathOperator}>=</div>
          <div className={styles.mathResult}>
            <div className={styles.mathBlockValue}>{formatCurrency(tier1.currentValue)}</div>
            <div className={styles.mathBlockLabel}>Enterprise Value</div>
          </div>
        </div>
      </div>

      {/* EBITDA Normalization */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>EBITDA Normalization</h2>
          <Link href="/dashboard/financials/ebitda-adjustments" className={styles.sectionLink}>
            Edit Adjustments &rarr;
          </Link>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Adjusted EBITDA normalizes your earnings by removing one-time expenses and owner perks that a buyer wouldn&apos;t inherit.
        </p>
        <Link href="/dashboard/financials/ebitda-adjustments" className={styles.sectionLink}>
          View Full Adjustments &rarr;
        </Link>
      </div>

      {/* Multiple Adjustments */}
      {bridgeCategories.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Multiple Adjustments</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Your position within the industry multiple range ({tier2.multipleRange.low.toFixed(1)}x – {tier2.multipleRange.high.toFixed(1)}x) is determined by your BRI scores across key buyer criteria.
          </p>
          <table className={styles.adjTable}>
            <thead>
              <tr>
                <th>Factor</th>
                <th>Score</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {bridgeCategories.filter(c => c.category !== 'STRUCTURAL' && c.category !== 'ASPIRATIONAL').map(cat => (
                <tr key={cat.category}>
                  <td style={{ fontWeight: 500 }}>{cat.label}</td>
                  <td>{cat.score}/100</td>
                  <td className={cat.dollarImpact > 0 ? styles.adjNegative : ''}>
                    -{formatCurrency(cat.dollarImpact)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
