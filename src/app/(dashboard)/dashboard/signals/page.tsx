'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/actions/action-center.module.css'

function formatShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDateGroup(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 7) return 'This Week'
  if (days < 14) return 'Last Week'
  if (days < 30) return 'Earlier This Month'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface Signal {
  id: string
  channel: string
  category: string | null
  eventType: string
  severity: string
  title: string
  description: string | null
  resolutionStatus: string
  estimatedValueImpact: number | null
  weightedValueImpact: number | null
  createdAt: string
}

interface VaRData {
  totalValueAtRisk: number
  rawValueAtRisk: number
  signalCount: number
  trend: { direction: string; previousValue: number | null }
}

type FilterSeverity = 'all' | 'POSITIVE' | 'WARNING' | 'CRITICAL'
type FilterCategory = 'all' | 'FINANCIAL' | 'OPERATIONAL' | 'MARKET' | 'CUSTOMER_CONCENTRATION'

const SEVERITY_MAP: Record<string, { indicatorClass: string; iconType: string }> = {
  POSITIVE: { indicatorClass: 'signalPositive', iconType: 'trendUp' },
  LOW: { indicatorClass: 'signalInfo', iconType: 'info' },
  MEDIUM: { indicatorClass: 'signalWarning', iconType: 'warning' },
  WARNING: { indicatorClass: 'signalWarning', iconType: 'warning' },
  HIGH: { indicatorClass: 'signalNegative', iconType: 'alert' },
  CRITICAL: { indicatorClass: 'signalNegative', iconType: 'alert' },
}

const CATEGORY_TAG_MAP: Record<string, { class: string; label: string }> = {
  FINANCIAL: { class: 'signalTagFinancial', label: 'Financial' },
  OPERATIONAL: { class: 'signalTagOperational', label: 'Operational' },
  MARKET: { class: 'signalTagMarket', label: 'Market' },
  CUSTOMER_CONCENTRATION: { class: 'signalTagCustomer', label: 'Customer' },
  TRANSFERABILITY: { class: 'signalTagOperational', label: 'Operational' },
  LEGAL_TAX: { class: 'signalTagFinancial', label: 'Legal' },
  PERSONAL: { class: 'signalTagOperational', label: 'Personal' },
}

export default function SignalsPage() {
  const { selectedCompanyId } = useCompany()
  const [signals, setSignals] = useState<Signal[]>([])
  const [varData, setVarData] = useState<VaRData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/signals?limit=50`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/value-at-risk`).then(r => r.ok ? r.json() : null),
    ])
      .then(([sigData, varResult]) => {
        if (cancelled) return
        if (sigData?.signals) setSignals(sigData.signals)
        if (varResult) setVarData(varResult)
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

  // Count by severity for health strip
  const severityCounts = signals.reduce((acc, s) => {
    const key = s.severity === 'POSITIVE' || s.severity === 'LOW' ? 'positive'
      : s.severity === 'MEDIUM' || s.severity === 'WARNING' ? 'warning'
      : s.severity === 'HIGH' || s.severity === 'CRITICAL' ? 'negative'
      : 'info'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const total = signals.length || 1

  // Apply filters
  let filtered = signals
  if (filterSeverity !== 'all') {
    if (filterSeverity === 'POSITIVE') filtered = filtered.filter(s => s.severity === 'POSITIVE' || s.severity === 'LOW')
    else if (filterSeverity === 'WARNING') filtered = filtered.filter(s => s.severity === 'MEDIUM' || s.severity === 'WARNING')
    else if (filterSeverity === 'CRITICAL') filtered = filtered.filter(s => s.severity === 'HIGH' || s.severity === 'CRITICAL')
  }
  if (filterCategory !== 'all') filtered = filtered.filter(s => s.category === filterCategory)

  // Group by date
  const dateGroups: { label: string; signals: Signal[] }[] = []
  let currentGroup = ''
  for (const sig of filtered) {
    const group = getDateGroup(sig.createdAt)
    if (group !== currentGroup) {
      dateGroups.push({ label: group, signals: [] })
      currentGroup = group
    }
    dateGroups[dateGroups.length - 1].signals.push(sig)
  }

  // Count positive signals (last 30 days)
  const positiveCount = signals.filter(s => s.severity === 'POSITIVE' || s.severity === 'LOW').length
  const warningCount = signals.filter(s => s.severity === 'MEDIUM' || s.severity === 'WARNING').length

  return (
    <>
      <TrackPageView page="/dashboard/signals" />

      <div className={styles.pageHeader}>
        <div>
          <h1>Signals</h1>
          <p>Real-time indicators of business health, value changes, and risks</p>
        </div>
      </div>

      {/* Value at Risk Summary */}
      <div className={styles.varGrid}>
        <div className={styles.varCard}>
          <div className={styles.varLabel}>Value at Risk</div>
          <div className={styles.varRow}>
            <div className={styles.varValue} style={{ color: 'var(--red)' }}>
              {varData ? formatShort(varData.totalValueAtRisk) : '$0'}
            </div>
            {varData && <div className={styles.varCount}>across {varData.signalCount} risks</div>}
          </div>
          {varData?.trend?.direction && (
            <div className={`${styles.varTrend} ${varData.trend.direction === 'DECREASING' ? styles.varTrendImproving : styles.varTrendWorsening}`}>
              {varData.trend.direction === 'DECREASING' ? (
                <>
                  <TrendDownIcon />
                  {varData.trend.previousValue !== null && `Down from ${formatShort(varData.trend.previousValue)} \u2014 improving`}
                </>
              ) : (
                <>
                  <TrendUpIcon />
                  {varData.trend.previousValue !== null && `Up from ${formatShort(varData.trend.previousValue)}`}
                </>
              )}
            </div>
          )}
        </div>
        <div className={styles.varCard}>
          <div className={styles.varLabel}>Positive Signals (30 days)</div>
          <div className={styles.varRow}>
            <div className={styles.varValue} style={{ color: 'var(--green)' }}>{positiveCount}</div>
            <div className={styles.varCount}>value-building events</div>
          </div>
        </div>
        <div className={styles.varCard}>
          <div className={styles.varLabel}>Warning Signals (30 days)</div>
          <div className={styles.varRow}>
            <div className={styles.varValue} style={{ color: 'var(--orange)' }}>{warningCount}</div>
            <div className={styles.varCount}>items to watch</div>
          </div>
        </div>
      </div>

      {/* Signal Health Strip */}
      <div>
        <div className={styles.healthStrip}>
          {(severityCounts.positive || 0) > 0 && <div className={styles.healthSeg} style={{ flex: severityCounts.positive, background: 'var(--green)' }} />}
          {(severityCounts.warning || 0) > 0 && <div className={styles.healthSeg} style={{ flex: severityCounts.warning, background: 'var(--orange)' }} />}
          {(severityCounts.negative || 0) > 0 && <div className={styles.healthSeg} style={{ flex: severityCounts.negative, background: 'var(--red)' }} />}
          {(severityCounts.info || 0) > 0 && <div className={styles.healthSeg} style={{ flex: severityCounts.info, background: 'var(--accent)' }} />}
        </div>
        <div className={styles.healthLegend}>
          <div className={styles.healthLegendItem}><div className={styles.healthLegendDot} style={{ background: 'var(--green)' }} />Positive ({severityCounts.positive || 0})</div>
          <div className={styles.healthLegendItem}><div className={styles.healthLegendDot} style={{ background: 'var(--orange)' }} />Warning ({severityCounts.warning || 0})</div>
          <div className={styles.healthLegendItem}><div className={styles.healthLegendDot} style={{ background: 'var(--red)' }} />Negative ({severityCounts.negative || 0})</div>
          <div className={styles.healthLegendItem}><div className={styles.healthLegendDot} style={{ background: 'var(--accent)' }} />Informational ({severityCounts.info || 0})</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          {([
            { key: 'all' as FilterSeverity, label: 'All Signals' },
            { key: 'POSITIVE' as FilterSeverity, label: 'Positive' },
            { key: 'WARNING' as FilterSeverity, label: 'Warning' },
            { key: 'CRITICAL' as FilterSeverity, label: 'Negative' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.filterBtn} ${filterSeverity === key ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterSeverity(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          {([
            { key: 'all' as FilterCategory, label: 'All Sources' },
            { key: 'FINANCIAL' as FilterCategory, label: 'Financial' },
            { key: 'OPERATIONAL' as FilterCategory, label: 'Operational' },
            { key: 'MARKET' as FilterCategory, label: 'Market' },
            { key: 'CUSTOMER_CONCENTRATION' as FilterCategory, label: 'Customer' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.filterBtn} ${filterCategory === key ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Timeline */}
      <div className={styles.signalTimeline}>
        {dateGroups.map(group => (
          <div key={group.label}>
            <div className={styles.signalDateHeader}>{group.label}</div>
            {group.signals.map(sig => {
              const sev = SEVERITY_MAP[sig.severity] || SEVERITY_MAP.LOW
              const catTag = sig.category ? CATEGORY_TAG_MAP[sig.category] : null
              const impact = sig.estimatedValueImpact
              const isPositive = sig.severity === 'POSITIVE' || sig.severity === 'LOW'

              return (
                <Link
                  key={sig.id}
                  href={`/dashboard/signals/${sig.id}`}
                  className={styles.signalCard}
                >
                  <div className={styles.signalCardInner}>
                    <div className={`${styles.signalIndicator} ${styles[sev.indicatorClass]}`}>
                      <SignalIcon type={sev.iconType} />
                    </div>
                    <div className={styles.signalBody}>
                      <div className={styles.signalTitle}>{sig.title}</div>
                      {sig.description && (
                        <div className={styles.signalDesc}>
                          {sig.description.length > 180 ? sig.description.slice(0, 180) + '...' : sig.description}
                        </div>
                      )}
                      <div className={styles.signalTags}>
                        {catTag && (
                          <span className={`${styles.signalTag} ${styles[catTag.class]}`}>{catTag.label}</span>
                        )}
                        <span className={`${styles.signalTag} ${styles.signalTagSource}`}>
                          {sig.channel === 'PROMPTED_DISCLOSURE' ? 'Weekly Check-In'
                            : sig.channel === 'TASK_GENERATED' ? 'Task Generated'
                            : sig.channel === 'TIME_DECAY' ? 'Automated Check'
                            : sig.channel === 'EXTERNAL' ? 'External'
                            : sig.channel}
                        </span>
                      </div>
                    </div>
                    <div className={styles.signalRight}>
                      {impact !== null && impact !== 0 && (
                        <div className={`${styles.signalImpact} ${isPositive ? styles.signalImpactUp : styles.signalImpactDown}`}>
                          {impact > 0 ? '+' : ''}{formatShort(impact)}
                        </div>
                      )}
                      <div className={styles.signalTime}>{timeAgo(sig.createdAt)}</div>
                    </div>
                    <div style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '10px' }}>
                      <ChevronIcon />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No signals match your current filters.
          </div>
        )}
      </div>
    </>
  )
}

function SignalIcon({ type }: { type: string }) {
  if (type === 'trendUp') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
  if (type === 'warning') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  if (type === 'alert') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
  // info
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    </svg>
  )
}

function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    </svg>
  )
}
