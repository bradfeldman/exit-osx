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

function daysAgo(dateStr: string): string {
  const d = Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

interface HistorySnapshot {
  id: string
  date: string
  currentValue: number
  briScore: number
  coreScore: number
  finalMultiple: number
  adjustedEbitda: number
  snapshotReason: string | null
  createdBy: { name: string | null; email: string } | null
}

const REASON_LABELS: Record<string, string> = {
  onboarding_complete: 'Initial valuation',
  assessment_complete: 'Assessment completed',
  financials_connected: 'Financials connected',
  task_completed: 'Task completed',
  reassessment_complete: 'Re-assessment completed',
  dcf_calculated: 'DCF valuation added',
  manual_recalculation: 'Valuation updated',
  financial_period_added: 'New financial period',
}

export default function ValuationHistoryPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<{
    snapshots: HistorySnapshot[]
    chartData: HistorySnapshot[]
    summary: { valueChange: number; valueChangePercent: number; briChange: number } | null
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false
    fetch(`/api/companies/${selectedCompanyId}/valuation-history?limit=24`)
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

  const { chartData, snapshots, summary } = data
  const latest = snapshots[0]

  // Find ATH and ATL
  const allValues = snapshots.map(s => s.currentValue)
  const ath = Math.max(...allValues)
  const atl = Math.min(...allValues)
  const athSnap = snapshots.find(s => s.currentValue === ath)
  const atlSnap = snapshots.find(s => s.currentValue === atl)

  // Chart calculations — add padding at top/bottom
  const chartMax = Math.max(...chartData.map(d => d.currentValue), 1)
  const chartMin = Math.min(...chartData.map(d => d.currentValue), 0)
  const displayMin = chartMin * 0.95
  const displayMax = chartMax * 1.05
  const displayRange = displayMax - displayMin || 1

  // Y-axis gridlines
  const gridLines = [0.8, 0.6, 0.4, 0.2].map(pct => ({
    value: displayMin + pct * displayRange,
    topPct: (1 - pct) * 100,
  }))

  return (
    <>
      <TrackPageView page="/dashboard/valuation/history" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/valuation" className={styles.breadcrumbLink}>Valuation</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>History</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderFlex}>
          <div>
            <div className={styles.pageTitle}>Valuation History</div>
            <div className={styles.pageSubtitle}>
              {data.total} snapshots over time &middot; Updated{' '}
              {latest ? new Date(latest.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'today'}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} aria-label="Export valuation history report">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className={styles.historyHeroStats}>
        <div className={styles.historyHeroStat}>
          <div className={styles.historyHeroStatLabel}>Current Valuation</div>
          <div className={`${styles.historyHeroStatValue} ${styles.historyHeroStatAccent}`}>
            {latest ? formatCurrency(latest.currentValue) : '—'}
          </div>
          {latest && (
            <div className={styles.historyHeroStatSub}>
              As of {new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className={styles.historyHeroStat}>
          <div className={styles.historyHeroStatLabel}>Period Change</div>
          <div className={`${styles.historyHeroStatValue} ${summary && summary.valueChange >= 0 ? styles.historyHeroStatGreen : styles.historyHeroStatRed}`}>
            {summary ? `${summary.valueChangePercent >= 0 ? '+' : ''}${summary.valueChangePercent.toFixed(1)}%` : '—'}
          </div>
          {summary && (
            <div className={styles.historyHeroStatDelta} style={{ color: summary.valueChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                {summary.valueChange >= 0
                  ? <polyline points="18 15 12 9 6 15"/>
                  : <polyline points="18 9 12 15 6 9"/>
                }
              </svg>
              {summary.valueChange >= 0 ? '+' : ''}{formatCurrency(summary.valueChange)}
            </div>
          )}
        </div>
        <div className={styles.historyHeroStat}>
          <div className={styles.historyHeroStatLabel}>All-Time High</div>
          <div className={styles.historyHeroStatValue}>{formatCurrency(ath)}</div>
          {athSnap && (
            <div className={styles.historyHeroStatSub}>
              {new Date(athSnap.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className={styles.historyHeroStat}>
          <div className={styles.historyHeroStatLabel}>All-Time Low</div>
          <div className={styles.historyHeroStatValue}>{formatCurrency(atl)}</div>
          {atlSnap && (
            <div className={styles.historyHeroStatSub}>
              {new Date(atlSnap.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (baseline)
            </div>
          )}
        </div>
      </div>

      {/* Valuation Timeline with Y-axis Gridlines */}
      {chartData.length > 1 && (
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Valuation Timeline</h2>
              <div className={styles.sectionSubtitle}>
                Monthly enterprise value &middot; {
                  new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                } &ndash; {
                  new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                }
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent)' }} /> Prior months
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--green)' }} /> Current
              </div>
            </div>
          </div>

          <div className={styles.chartWrapper}>
            {/* Y-axis gridlines */}
            <div style={{ position: 'absolute', left: '48px', right: 0, top: 0, bottom: '28px', pointerEvents: 'none' }}>
              {gridLines.map((line, i) => (
                <div key={i}>
                  <div style={{
                    position: 'absolute', top: `${line.topPct}%`, left: 0, right: 0,
                    borderTop: '1px dashed var(--border-light)'
                  }} />
                  <div style={{
                    position: 'absolute', top: `${line.topPct}%`, left: '-44px',
                    fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500,
                    transform: 'translateY(-50%)'
                  }}>
                    {formatCurrency(line.value)}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.chartAreaHistory}>
              {chartData.map((point, i) => {
                const heightPct = Math.max(4, ((point.currentValue - displayMin) / displayRange) * 100)
                const isLast = i === chartData.length - 1
                return (
                  <div key={point.id || i} className={styles.chartColHistory}>
                    <div
                      className={`${styles.chartBarHistory} ${isLast ? styles.chartBarHistoryCurrent : ''}`}
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className={styles.chartBarValueHistory}>{formatCurrency(point.currentValue)}</div>
                    </div>
                    <div className={`${styles.chartLabelHistory} ${isLast ? styles.chartLabelHistoryCurrent : ''}`}>
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-light)', marginTop: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              All values are enterprise valuations based on the active valuation method
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Table */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Saved Snapshots</h2>
            <div className={styles.sectionSubtitle}>Point-in-time valuations for comparison and deal documentation</div>
          </div>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} aria-label="Save new snapshot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
            </svg>
            Save New Snapshot
          </button>
        </div>
        <table className={styles.adjTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Valuation</th>
              <th>Label</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snap, i) => {
              const isManual = snap.snapshotReason === 'manual_recalculation'
              const label = snap.snapshotReason
                ? (REASON_LABELS[snap.snapshotReason] || snap.snapshotReason)
                : 'Auto'
              return (
                <tr key={snap.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date(snap.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {i === 0 ? 'Most recent' : daysAgo(snap.date)}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px',
                      color: i === 0 ? 'var(--accent)' : 'var(--text-primary)'
                    }}>
                      {formatCurrency(snap.currentValue)}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.snapshotBadge} ${i === 0 ? styles.snapshotBadgeCurrent : isManual ? styles.snapshotBadgeManual : styles.snapshotBadgeAuto}`}>
                      {i === 0 ? 'Current' : label}
                    </span>
                  </td>
                  <td>
                    <span className={styles.sourceTag}>{isManual ? 'Manual save' : 'Auto-generated'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>View</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Snapshots are auto-generated on key events. Manual snapshots are saved indefinitely. Auto snapshots are retained for 24 months.
        </div>
      </div>

      {/* What Changed — Event Timeline */}
      {/* TODO: wire to a real event/audit log API — /api/companies/${selectedCompanyId}/valuation-events */}
      {snapshots.length > 1 && (
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>What Changed</h2>
              <div className={styles.sectionSubtitle}>Key drivers behind valuation movement over time</div>
            </div>
            {summary && summary.valueChange > 0 && (
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                Total impact: +{formatCurrency(summary.valueChange)}
              </div>
            )}
          </div>

          <div className={styles.eventTimeline}>
            {snapshots.slice(0, 5).map((snap, i) => {
              const prevSnap = snapshots[i + 1]
              const delta = prevSnap ? snap.currentValue - prevSnap.currentValue : 0
              const isPositive = delta >= 0
              const isLast = i === Math.min(snapshots.length - 1, 4)
              const label = snap.snapshotReason
                ? (REASON_LABELS[snap.snapshotReason] || snap.snapshotReason)
                : 'Valuation updated'

              return (
                <div key={snap.id} className={styles.eventItem}>
                  <div className={styles.eventConnector}>
                    <div className={`${styles.eventIcon} ${
                      i === 0 ? styles.eventIconOrange
                      : isPositive ? styles.eventIconGreen
                      : styles.eventIconRed
                    }`}>
                      {i === 0 ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                        </svg>
                      ) : isPositive ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      )}
                    </div>
                    {!isLast && <div className={styles.eventLine} />}
                  </div>
                  <div className={styles.eventContent}>
                    <div className={styles.eventDate}>
                      {new Date(snap.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className={styles.eventTitle}>{label}</div>
                    <div className={styles.eventDesc}>
                      Valuation {i === 0 ? 'recorded' : (isPositive ? 'increased' : 'decreased')} to {formatCurrency(snap.currentValue)}.
                      {snap.createdBy?.name && ` Updated by ${snap.createdBy.name}.`}
                    </div>
                    {prevSnap && delta !== 0 ? (
                      <div className={`${styles.eventImpact} ${isPositive ? styles.eventImpactPositive : styles.eventImpactNegative}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                          {isPositive
                            ? <polyline points="18 15 12 9 6 15"/>
                            : <polyline points="18 9 12 15 6 9"/>
                          }
                        </svg>
                        {isPositive ? '+' : ''}{formatCurrency(delta)} effect
                      </div>
                    ) : (
                      <div className={`${styles.eventImpact} ${styles.eventImpactNeutral}`}>
                        Baseline &mdash; {formatCurrency(snap.currentValue)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
