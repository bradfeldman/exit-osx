'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from './value-ledger.module.css'

interface LedgerEntryData {
  id: string
  eventType: string
  category: string | null
  deltaValueRecovered: number
  deltaValueAtRisk: number
  deltaBri: number | null
  narrativeSummary: string
  occurredAt: string
  taskId: string | null
  signalId: string | null
}

interface LedgerSummary {
  totalRecovered: number
  totalAtRisk: number
  netImpact: number
  entryCount: number
}

/** Format a delta value as +$X or −$X with K/M suffix */
function formatDelta(value: number): string {
  const abs = Math.abs(value)
  let formatted: string
  if (abs >= 1_000_000) {
    formatted = `$${(abs / 1_000_000).toFixed(1)}M`
  } else if (abs >= 1_000) {
    formatted = `$${Math.round(abs / 1_000)}K`
  } else {
    formatted = `$${abs.toLocaleString()}`
  }
  return value >= 0 ? `+${formatted}` : `\u2212${formatted}`
}

/** Format a cumulative value as $X.XM or $XK */
function formatCumulative(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    return `$${(abs / 1_000_000).toFixed(2)}M`
  } else if (abs >= 1_000) {
    return `$${Math.round(abs / 1_000)}K`
  }
  return `$${abs.toLocaleString()}`
}

/** Relative time label (e.g. "6 days ago") */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

/** Format date as "Feb 12, 2026" */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Map category string to CSS module class suffix */
function getCategoryClass(category: string | null): string {
  switch (category?.toLowerCase()) {
    case 'financial': return styles['cat-financial']
    case 'operational': return styles['cat-operational']
    case 'risk': return styles['cat-risk']
    case 'market': return styles['cat-market']
    default: return styles['cat-financial']
  }
}

/** Category label display */
function getCategoryLabel(category: string | null): string {
  if (!category) return 'Financial'
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

/** Source icon SVG by source type */
function SourceIcon({ source }: { source: string }) {
  if (source === 'Market Data') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  }
  if (source === 'Assessment') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
      </svg>
    )
  }
  if (source === 'System') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  }
  // Default: document icon (QuickBooks / Manual Entry)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

/** Derive source label from entry fields */
function getSourceLabel(entry: LedgerEntryData): string {
  if (entry.signalId) return 'Market Data'
  if (entry.taskId) return 'Assessment'
  if (entry.eventType === 'INITIAL_VALUATION') return 'System'
  return 'QuickBooks'
}

const CATEGORIES = ['All', 'Financial', 'Operational', 'Risk', 'Market'] as const
const IMPACTS = ['All', 'Positive', 'Negative'] as const
const DATE_RANGES = ['All time', 'Last 90 days', 'Last 6 months', 'Last 12 months'] as const

export function ValueLedgerPage() {
  const { selectedCompanyId } = useCompany()
  const [entries, setEntries] = useState<LedgerEntryData[]>([])
  const [summary, setSummary] = useState<LedgerSummary>({
    totalRecovered: 0,
    totalAtRisk: 0,
    netImpact: 0,
    entryCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [eventType, setEventType] = useState<string | null>(null)
  const [impactFilter, setImpactFilter] = useState<'All' | 'Positive' | 'Negative'>('All')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const fetchData = useCallback(
    async (cursor?: string) => {
      if (!selectedCompanyId) return
      if (cursor) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const params = new URLSearchParams({ limit: '20' })
        if (category) params.set('category', category)
        if (eventType) params.set('eventType', eventType)
        if (cursor) params.set('cursor', cursor)

        const response = await fetch(
          `/api/companies/${selectedCompanyId}/value-ledger?${params}`
        )
        if (!response.ok) throw new Error('Failed to fetch')
        const json = await response.json()

        if (cursor) {
          setEntries((prev) => [...prev, ...json.entries])
        } else {
          setEntries(json.entries)
          setSummary(json.summary)
        }
        setNextCursor(json.nextCursor)
      } catch {
        // Keep existing state on error
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [selectedCompanyId, category, eventType]
  )

  // Initial load and filter changes
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          fetchData(nextCursor)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [nextCursor, isLoadingMore, fetchData])

  // Client-side impact filter applied on top of API results
  const filteredEntries = entries.filter((entry) => {
    if (impactFilter === 'Positive') return entry.deltaValueRecovered > 0
    if (impactFilter === 'Negative') return entry.deltaValueAtRisk > 0
    return true
  })

  // Running cumulative total built from filtered entries (most recent first)
  const entriesWithCumulative = filteredEntries.reduceRight<
    Array<LedgerEntryData & { cumulative: number }>
  >((acc, entry) => {
    const prev = acc[0]?.cumulative ?? 0
    const delta = entry.deltaValueRecovered - entry.deltaValueAtRisk
    acc.unshift({ ...entry, cumulative: prev + delta })
    return acc
  }, [])

  // Category summary totals for the stacked bar
  const categoryTotals = entries.reduce<Record<string, number>>((acc, entry) => {
    const cat = (entry.category ?? 'financial').toLowerCase()
    const delta = entry.deltaValueRecovered - entry.deltaValueAtRisk
    acc[cat] = (acc[cat] ?? 0) + delta
    return acc
  }, {})
  const totalPositive = Object.values(categoryTotals).reduce((s, v) => s + Math.max(0, v), 0) || 1

  const netTotal = summary.totalRecovered - summary.totalAtRisk
  const netPositive = netTotal >= 0

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <>
      <TrackPageView page="value-ledger" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/valuation">Valuation</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Value Ledger</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Value Ledger</h1>
          <p>Every factor that moved your valuation &mdash; your buyer-proof value story</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <Link href="/dashboard/valuation/history" className={styles.btnSecondary} style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            View History
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroBannerLeft}>
          <div className={styles.heroBannerEyebrow}>Value Ledger &mdash; Your Company</div>
          <div className={styles.heroBannerTitle}>
            {netPositive ? '+' : '\u2212'}{formatCumulative(Math.abs(netTotal))} {netPositive ? 'Added' : 'Lost'}
          </div>
          <div className={styles.heroBannerSub}>
            Since initial assessment &middot; {summary.entryCount} events tracked
          </div>
        </div>
        <div className={styles.heroBannerRight}>
          {/* TODO: wire starting value from API (first baseline entry) */}
          <div className={styles.heroKpi}>
            <div className={styles.heroKpiLabel}>Starting Value</div>
            <div className={styles.heroKpiValue}>
              {entriesWithCumulative.length > 0
                ? formatCumulative(entriesWithCumulative[entriesWithCumulative.length - 1].cumulative - (entriesWithCumulative[entriesWithCumulative.length - 1].deltaValueRecovered - entriesWithCumulative[entriesWithCumulative.length - 1].deltaValueAtRisk))
                : '—'}
            </div>
          </div>
          <div className={styles.heroKpi}>
            <div className={styles.heroKpiLabel}>Total Added</div>
            <div className={`${styles.heroKpiValue} ${styles.green}`}>
              {formatDelta(summary.totalRecovered)}
            </div>
            <div className={styles.heroKpiSub}>value recovered</div>
          </div>
          <div className={styles.heroKpi}>
            <div className={styles.heroKpiLabel}>Current Value</div>
            <div className={`${styles.heroKpiValue} ${styles.teal}`}>
              {entriesWithCumulative.length > 0
                ? formatCumulative(entriesWithCumulative[0].cumulative)
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Category Summary Grid */}
      {/* TODO: wire to API category breakdown endpoint */}
      <div className={styles.summaryGrid}>
        {(['financial', 'operational', 'risk', 'market'] as const).map((cat) => {
          const value = categoryTotals[cat] ?? 0
          return (
            <div key={cat} className={`${styles.summaryCard} ${styles[cat]}`}>
              <div className={styles.summaryCardLabel}>{getCategoryLabel(cat)}</div>
              <div className={styles.summaryCardValue}>{formatDelta(value)}</div>
              <div className={styles.summaryCardCount}>
                {entries.filter(e => (e.category ?? 'financial').toLowerCase() === cat).length} entries
              </div>
            </div>
          )
        })}
      </div>

      {/* Stacked Bar */}
      <div className={`${styles.card}`} style={{ padding: '20px 24px' }}>
        <div className={styles.stackedBarLabel}>Value Added by Category</div>
        <div className={styles.stackedBar}>
          {(['financial', 'operational', 'risk', 'market'] as const).map((cat) => {
            const value = Math.max(0, categoryTotals[cat] ?? 0)
            const pct = (value / totalPositive) * 100
            const colors: Record<string, string> = {
              financial: 'var(--accent)',
              operational: 'var(--purple)',
              risk: 'var(--orange)',
              market: 'var(--teal)',
            }
            if (pct < 1) return null
            return (
              <div
                key={cat}
                className={styles.stackedSegment}
                style={{ width: `${pct}%`, background: colors[cat] }}
                title={`${getCategoryLabel(cat)}: ${formatDelta(categoryTotals[cat] ?? 0)}`}
              />
            )
          })}
        </div>
        <div className={styles.stackedBarLegend}>
          {(['financial', 'operational', 'risk', 'market'] as const).map((cat) => {
            const colors: Record<string, string> = {
              financial: 'var(--accent)',
              operational: 'var(--purple)',
              risk: 'var(--orange)',
              market: 'var(--teal)',
            }
            const value = categoryTotals[cat] ?? 0
            const pct = Math.round((Math.max(0, value) / totalPositive) * 100)
            return (
              <div key={cat} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: colors[cat] }} />
                {getCategoryLabel(cat)} {formatDelta(value)} ({pct}%)
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter Row */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Filter by:</span>

        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Category</span>
          <div className={styles.filterBtnGroup}>
            {CATEGORIES.map((cat) => {
              const isActive = cat === 'All' ? !category : category === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${isActive ? styles.filterBtnActive : ''}`}
                  onClick={() => setCategory(cat === 'All' ? null : cat.toLowerCase())}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.filterSeparator} />

        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Impact</span>
          <div className={styles.filterBtnGroup}>
            {IMPACTS.map((impact) => (
              <button
                key={impact}
                className={`${styles.filterBtn} ${impactFilter === impact ? styles.filterBtnActive : ''}`}
                onClick={() => setImpactFilter(impact as typeof impactFilter)}
              >
                {impact}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterSeparator} />

        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Date range</span>
          <select className={styles.filterSelect} defaultValue="All time">
            {DATE_RANGES.map((range) => (
              <option key={range}>{range}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterCount}>{filteredEntries.length} entries</div>
      </div>

      {/* Ledger Table */}
      <div className={`${styles.card} ${styles.tableCard}`}>
        <table className={styles.ledgerTable}>
          <thead>
            <tr>
              <th className={styles.thDate}>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th className={styles.thRight}>Impact</th>
              <th className={styles.thRight}>Cumulative</th>
              <th className={styles.thSource}>Source</th>
            </tr>
          </thead>
          <tbody>
            {entriesWithCumulative.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No ledger entries yet. Complete your first assessment to start tracking value changes.
                </td>
              </tr>
            ) : (
              entriesWithCumulative.map((entry) => {
                const delta = entry.deltaValueRecovered - entry.deltaValueAtRisk
                const isBaseline = entry.eventType === 'INITIAL_VALUATION'
                const sourceLabel = getSourceLabel(entry)
                const dateStr = formatDate(entry.occurredAt)
                const relative = relativeTime(entry.occurredAt)
                const showRelative = !isBaseline && relative !== dateStr

                return (
                  <tr key={entry.id} className={isBaseline ? styles.rowBaseline : undefined}>
                    <td className={styles.tdDate}>
                      <div className={styles.dateMain}>{dateStr}</div>
                      <div className={styles.dateSub}>
                        {isBaseline ? 'Baseline' : showRelative ? relative : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.catBadge} ${getCategoryClass(entry.category)}`}>
                        {getCategoryLabel(entry.category)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowDescription}>{entry.narrativeSummary}</div>
                    </td>
                    <td className={styles.tdRight}>
                      {isBaseline ? (
                        <span className={styles.impactNeutral}>{formatCumulative(entry.cumulative)}</span>
                      ) : delta > 0 ? (
                        <span className={styles.impactPositive}>{formatDelta(delta)}</span>
                      ) : delta < 0 ? (
                        <span className={styles.impactNegative}>{formatDelta(delta)}</span>
                      ) : (
                        <span className={styles.impactNeutral}>$0</span>
                      )}
                    </td>
                    <td className={styles.tdRight}>
                      <span className={styles.cumulativeValue}>{formatCumulative(entry.cumulative)}</span>
                    </td>
                    <td className={styles.tdSource}>
                      <span className={styles.sourceChip}>
                        <SourceIcon source={sourceLabel} />
                        {sourceLabel}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Table Footer */}
        <div className={styles.tableFooter}>
          <div className={styles.tableFooterLeft}>
            Showing {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} &middot; Sorted by date descending
          </div>
          <div className={styles.tableFooterRight}>
            <div className={styles.netTotal}>
              Net total: <strong>{formatDelta(netTotal)}</strong>
            </div>
            <button className={styles.btnSecondarySmall}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Infinite scroll trigger */}
      {nextCursor && (
        <div ref={loadMoreRef} style={{ padding: '16px', textAlign: 'center' }}>
          {isLoadingMore && (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto" />
          )}
        </div>
      )}
    </>
  )
}
