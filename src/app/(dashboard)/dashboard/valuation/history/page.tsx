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

  // Chart bar heights
  const chartMax = Math.max(...chartData.map(d => d.currentValue), 1)
  const chartMin = Math.min(...chartData.map(d => d.currentValue), 0)
  const chartRange = chartMax - chartMin || 1

  return (
    <>
      <TrackPageView page="/dashboard/valuation/history" />

      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1>Valuation History</h1>
            <p>{data.total} snapshots over time</p>
          </div>
          <Link href="/dashboard/valuation" className={styles.sectionLink}>
            &larr; Back to Valuation
          </Link>
        </div>
      </div>

      {/* Hero Stats */}
      <div className={styles.heroStats}>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Current Value</div>
          <div className={`${styles.heroStatValue} ${styles.accent}`}>
            {latest ? formatCurrency(latest.currentValue) : '—'}
          </div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>Change</div>
          <div className={styles.heroStatValue}>
            {summary ? `${summary.valueChangePercent >= 0 ? '+' : ''}${summary.valueChangePercent.toFixed(1)}%` : '—'}
          </div>
          {summary && (
            <div className={styles.heroStatDelta} style={{ color: summary.valueChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {summary.valueChange >= 0 ? '+' : ''}{formatCurrency(summary.valueChange)}
            </div>
          )}
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>All-Time High</div>
          <div className={`${styles.heroStatValue} ${styles.green}`}>{formatCurrency(ath)}</div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroStatLabel}>All-Time Low</div>
          <div className={styles.heroStatValue}>{formatCurrency(atl)}</div>
        </div>
      </div>

      {/* Timeline Chart */}
      {chartData.length > 1 && (
        <div className={styles.trendSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Valuation Timeline</h2>
          </div>
          <div className={styles.chartArea}>
            {chartData.map((point, i) => {
              const heightPct = 20 + ((point.currentValue - chartMin) / chartRange) * 80
              const isLast = i === chartData.length - 1
              return (
                <div key={point.id || i} className={styles.chartCol}>
                  <div className={styles.chartBarValue}>{formatCurrency(point.currentValue)}</div>
                  <div
                    className={`${styles.chartBar} ${isLast ? styles.current : ''}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className={`${styles.chartLabel} ${isLast ? styles.current : ''}`}>
                    {new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Snapshot List */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Snapshots</h2>
        </div>
        <table className={styles.adjTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              <th>Multiple</th>
              <th>BRI</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snap, i) => (
              <tr key={snap.id}>
                <td>{new Date(snap.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(snap.currentValue)}</td>
                <td>{snap.finalMultiple.toFixed(1)}x</td>
                <td>{Math.round(snap.briScore * 100)}</td>
                <td>
                  <span className={`${styles.snapshotBadge} ${i === 0 ? styles.current : styles.auto}`}>
                    {snap.snapshotReason ? (REASON_LABELS[snap.snapshotReason] || snap.snapshotReason) : 'Auto'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
