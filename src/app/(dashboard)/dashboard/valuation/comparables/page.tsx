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

export default function ComparablesPage() {
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

  const tier1 = data.tier1 as { industryName: string; multipleRange: { low: number; high: number }; currentValue: number }
  const tier2 = data.tier2 as { multipleRange: { low: number; high: number; current: number } }

  return (
    <>
      <TrackPageView page="/dashboard/valuation/comparables" />

      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1>Comparable Transactions</h1>
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
          <div className={styles.heroStatLabel}>Median Multiple</div>
          <div className={`${styles.heroStatValue} ${styles.accent}`}>
            {((tier2.multipleRange.low + tier2.multipleRange.high) / 2).toFixed(1)}x
          </div>
          <div className={styles.heroStatSub}>EBITDA Multiple</div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Range</div>
          <div className={styles.heroStatValue}>
            {tier2.multipleRange.low.toFixed(1)}x – {tier2.multipleRange.high.toFixed(1)}x
          </div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Your Multiple</div>
          <div className={`${styles.heroStatValue} ${styles.green}`}>
            {tier2.multipleRange.current.toFixed(1)}x
          </div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Implied Value</div>
          <div className={styles.heroStatValue}>{formatCurrency(tier1.currentValue)}</div>
        </div>
      </div>

      {/* Info Card */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Industry Comparable Data</h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
          Comparable transaction data is sourced from industry databases and reflects actual business sales in your sector.
          Your position within the range is determined by your Business Readiness Index (BRI) score and business quality factors.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Multiple range: {tier2.multipleRange.low.toFixed(1)}x – {tier2.multipleRange.high.toFixed(1)}x EBITDA
          &middot; Based on {tier1.industryName} transactions
        </p>
      </div>
    </>
  )
}
