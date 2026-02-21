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

// Static comparable transactions — TODO: wire to a real comps API endpoint
const STATIC_COMPS = [
  { name: 'Heritage Mechanical Services', location: 'Phoenix, AZ', revenue: '$11.2M', multiple: 4.2, ebitda: '$1.9M', year: 2026, type: 'Strategic' },
  { name: 'Comfort Systems of the Southwest', location: 'Scottsdale, AZ', revenue: '$8.9M', multiple: 3.9, ebitda: '$1.5M', year: 2025, type: 'PE' },
  { name: 'Desert Air Solutions', location: 'Tucson, AZ', revenue: '$14.1M', multiple: 4.4, ebitda: '$2.3M', year: 2025, type: 'Strategic' },
  { name: 'SunState HVAC Group', location: 'Las Vegas, NV', revenue: '$9.8M', multiple: 3.7, ebitda: '$1.4M', year: 2025, type: 'PE' },
  { name: 'Pacific Comfort Services', location: 'San Diego, CA', revenue: '$17.4M', multiple: 4.5, ebitda: '$3.0M', year: 2025, type: 'Strategic' },
  { name: 'Southwest Mechanical Inc.', location: 'Albuquerque, NM', revenue: '$7.3M', multiple: 3.5, ebitda: '$1.1M', year: 2024, type: 'Financial' },
  { name: 'AZ Comfort Pros', location: 'Chandler, AZ', revenue: '$6.8M', multiple: 3.6, ebitda: '$0.9M', year: 2024, type: 'PE' },
  { name: 'Valley HVAC Solutions', location: 'Tempe, AZ', revenue: '$12.5M', multiple: 4.0, ebitda: '$2.0M', year: 2024, type: 'Strategic' },
]

export default function ComparablesPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>('All')

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
  const tier2 = data.tier2 as { multipleRange: { low: number; high: number; current: number }; adjustedEbitda: number }

  const medianMultiple = (tier2.multipleRange.low + tier2.multipleRange.high) / 2
  const allMultiples = STATIC_COMPS.map(c => c.multiple)
  const minMultiple = Math.min(...allMultiples)
  const maxMultiple = Math.max(...allMultiples)
  const q1 = allMultiples.sort((a, b) => a - b)[Math.floor(allMultiples.length * 0.25)]
  const q3 = allMultiples.sort((a, b) => a - b)[Math.floor(allMultiples.length * 0.75)]

  const filters = ['All', 'Strategic', 'PE', 'Financial']
  const filteredComps = activeFilter === 'All'
    ? STATIC_COMPS
    : STATIC_COMPS.filter(c => c.type === activeFilter)

  // Position your multiple on the gauge
  const gaugeRange = maxMultiple - minMultiple || 1
  const yourMarkerPct = Math.min(100, Math.max(0, ((tier2.multipleRange.current - minMultiple) / gaugeRange) * 100))

  return (
    <>
      <TrackPageView page="/dashboard/valuation/comparables" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/valuation" className={styles.breadcrumbLink}>Valuation</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>Comparable Transactions</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderFlex}>
          <div>
            <div className={styles.pageTitle}>Comparable Transactions</div>
            <div className={styles.pageSubtitle}>{tier1.industryName} &middot; {STATIC_COMPS.length} precedent deals</div>
          </div>
        </div>
      </div>

      {/* Comps Hero */}
      <div className={styles.compsHero}>
        <div className={styles.compsHeroMain}>
          <div className={styles.heroMainLabel}>Implied Enterprise Value</div>
          <div className={styles.heroMainAmount}>{formatCurrency(tier1.currentValue)}</div>
          <div className={styles.heroMainSub}>
            via Comparable Transactions &middot; {tier1.industryName}
          </div>
          <div className={styles.heroMainStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Median Multiple</div>
              <div className={`${styles.heroStatValueLg} ${styles.heroStatAccentColor}`}>{medianMultiple.toFixed(1)}x</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Range</div>
              <div className={styles.heroStatValueLg}>{minMultiple.toFixed(1)}x &ndash; {maxMultiple.toFixed(1)}x</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Your Multiple</div>
              <div className={`${styles.heroStatValueLg} ${styles.heroStatGreenColor}`}>{tier2.multipleRange.current.toFixed(1)}x</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabel}>Transactions</div>
              <div className={styles.heroStatValueLg}>{STATIC_COMPS.length}</div>
            </div>
          </div>
        </div>

        {/* Method comparison sidebar */}
        <div className={styles.heroSidebarCard}>
          <div className={styles.methodCompareLabel}>All Valuation Methods</div>
          <div className={styles.methodBarRow}>
            <div className={styles.methodBarName}>Industry Multiples</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillBlue} style={{ width: '78%' }} />
            </div>
            <div className={styles.methodBarValue}>—</div>
          </div>
          <div className={styles.methodBarRow}>
            <div className={styles.methodBarName}>DCF Analysis</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillPurple} style={{ width: '82%' }} />
            </div>
            <div className={styles.methodBarValue}>—</div>
          </div>
          <div className={styles.methodBarRow}>
            <div className={styles.methodBarNameActive}>Comparables</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillTeal} style={{ width: '72%' }} />
            </div>
            <div className={styles.methodBarValue}>{formatCurrency(tier1.currentValue)}</div>
            <span className={styles.compsActiveBadge}>Viewing</span>
          </div>
          <div className={styles.blendedSection}>
            <div className={styles.blendedLabel}>Blended Enterprise Value</div>
            <div className={styles.blendedAmount}>{formatCurrency(tier1.currentValue)}</div>
            <div className={styles.blendedRange}>Weighted 50% / 30% / 20%</div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className={styles.filterRow}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Buyer type:</span>
        {filters.map(f => (
          <button
            key={f}
            className={`${styles.filterChip} ${activeFilter === f ? styles.filterChipActive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {filteredComps.length} transactions shown
        </span>
      </div>

      {/* Transaction Database Table */}
      {/* TODO: wire to real comps API — /api/companies/${selectedCompanyId}/comparables */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Transaction Database</h2>
            <div className={styles.sectionSubtitle}>Precedent deals in {tier1.industryName} — 2024–2026</div>
          </div>
        </div>
        <table className={styles.txTable}>
          <thead>
            <tr>
              <th>Company</th>
              <th>Revenue</th>
              <th>EBITDA</th>
              <th>Multiple</th>
              <th>Year</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredComps.map((comp, i) => {
              const isAboveMedian = comp.multiple >= medianMultiple
              return (
                <tr key={i}>
                  <td>
                    <div className={styles.txTarget}>{comp.name}</div>
                    <div className={styles.txSub}>{comp.location}</div>
                  </td>
                  <td>{comp.revenue}</td>
                  <td>{comp.ebitda}</td>
                  <td>
                    <div className={`${styles.txMultiple} ${isAboveMedian ? styles.txMultipleGood : ''}`}>
                      {comp.multiple.toFixed(1)}x
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{comp.year}</td>
                  <td>
                    <span className={`${styles.txBadge} ${
                      comp.type === 'Strategic' ? styles.txBadgeBlue
                      : comp.type === 'PE' ? styles.txBadgePurple
                      : styles.txBadgeGray
                    }`}>
                      {comp.type}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Stats row below table */}
        <div className={styles.txStatsRow}>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Avg. revenue:</strong> ~$11.0M &nbsp;&middot;&nbsp;
            <strong style={{ color: 'var(--text-primary)' }}>Avg. EBITDA:</strong> ~$1.8M &nbsp;&middot;&nbsp;
            <strong style={{ color: 'var(--text-primary)' }}>Avg. multiple:</strong> {(allMultiples.reduce((s, v) => s + v, 0) / allMultiples.length).toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Statistical Analysis */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Statistical Analysis</h2>
            <div className={styles.sectionSubtitle}>Multiple distribution across {STATIC_COMPS.length} comparable transactions</div>
          </div>
        </div>

        {/* Stat grid */}
        <div className={styles.statGrid}>
          <div className={styles.statTile}>
            <div className={styles.statTileLabel}>Minimum</div>
            <div className={styles.statTileValue}>{minMultiple.toFixed(1)}x</div>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statTileLabel}>Q1 (25th %ile)</div>
            <div className={styles.statTileValue}>{q1.toFixed(2)}x</div>
          </div>
          <div className={`${styles.statTile} ${styles.statTileAccent}`}>
            <div className={styles.statTileLabel}>Median</div>
            <div className={styles.statTileValue}>{medianMultiple.toFixed(1)}x</div>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statTileLabel}>Q3 (75th %ile)</div>
            <div className={styles.statTileValue}>{q3.toFixed(2)}x</div>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statTileLabel}>Maximum</div>
            <div className={styles.statTileValue}>{maxMultiple.toFixed(1)}x</div>
          </div>
          <div className={`${styles.statTile} ${styles.statTileGreen}`}>
            <div className={styles.statTileLabel}>Your Multiple</div>
            <div className={styles.statTileValue}>{tier2.multipleRange.current.toFixed(1)}x</div>
          </div>
        </div>

        {/* Your position gauge */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Your Position in the Range
          </div>
          <div className={styles.rangeGaugeWrap}>
            <div className={styles.rangeGaugeTrack}>
              <div
                className={styles.rangeGaugeRangeBar}
                style={{ left: '0%', right: '0%' }}
              />
              <div
                className={styles.rangeGaugeMarker}
                style={{ left: `${yourMarkerPct}%` }}
              >
                <div className={styles.rangeGaugeMarkerLabel}>{tier2.multipleRange.current.toFixed(1)}x</div>
              </div>
            </div>
            <div className={styles.rangeGaugeLabels}>
              <span>{minMultiple.toFixed(1)}x<br /><small>Min</small></span>
              <span style={{ textAlign: 'center' }}>{medianMultiple.toFixed(1)}x<br /><small>Median</small></span>
              <span style={{ textAlign: 'right' }}>{maxMultiple.toFixed(1)}x<br /><small>Max</small></span>
            </div>
          </div>
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
          <div className={styles.aiInsightCardTitle}>AI Coach &mdash; Comps Insight</div>
          <div className={styles.aiInsightCardText}>
            The comparable transactions analysis positions you at {tier2.multipleRange.current.toFixed(1)}x &mdash; at the{' '}
            {yourMarkerPct < 50 ? 'lower' : 'upper'} end of the peer range. Your closest comparable is the most recent
            strategic deal at {maxMultiple.toFixed(1)}x, implying an enterprise value of {formatCurrency(maxMultiple * tier2.adjustedEbitda)}.
            Using this as a precedent in negotiations could strengthen your positioning by {formatCurrency((maxMultiple - tier2.multipleRange.current) * tier2.adjustedEbitda)}.
          </div>
          <div className={styles.aiInsightActionRow}>
            <span className={styles.aiInsightActionLink}>View deal room &amp; LOI details &rarr;</span>
          </div>
        </div>
      </Link>
    </>
  )
}
