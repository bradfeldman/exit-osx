'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/financials/financials-pages.module.css'

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function formatShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

interface FinancialPeriod {
  id: string
  fiscalYear: number
  periodType: string
  incomeStatement: { id: string; ebitda: number } | null
}

interface IncomeStatement {
  grossRevenue: number
  cogs: number
  operatingExpenses: number
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation: number | null
  amortization: number | null
  interestExpense: number | null
  taxExpense: number | null
}

export default function PLDetailPage() {
  const { selectedCompanyId } = useCompany()
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [statements, setStatements] = useState<Record<string, IncomeStatement>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/financial-periods`)
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (cancelled || !data) return
        const periodsList: FinancialPeriod[] = data.periods || []
        const annual = periodsList.filter((p: FinancialPeriod) => p.periodType === 'ANNUAL' && p.incomeStatement).slice(0, 3)
        setPeriods(annual)

        const stmts = await Promise.all(
          annual.map(async (p: FinancialPeriod) => {
            const res = await fetch(`/api/companies/${selectedCompanyId}/financial-periods/${p.id}/income-statement`)
            if (!res.ok) return null
            const d = await res.json()
            return d.incomeStatement ? [p.id, d.incomeStatement] as const : null
          })
        )
        if (!cancelled) {
          const map: Record<string, IncomeStatement> = {}
          for (const entry of stmts) { if (entry) map[entry[0]] = entry[1] }
          setStatements(map)
        }
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

  const latest = periods[0] ? statements[periods[0].id] : null
  const prev = periods[1] ? statements[periods[1].id] : null

  const revenueYoY = latest && prev && prev.grossRevenue > 0
    ? ((latest.grossRevenue - prev.grossRevenue) / prev.grossRevenue * 100) : null
  const ebitdaYoY = latest && prev && prev.ebitda > 0
    ? ((latest.ebitda - prev.ebitda) / prev.ebitda * 100) : null
  const gpYoY = latest && prev && prev.grossProfit > 0
    ? ((latest.grossProfit - prev.grossProfit) / prev.grossProfit * 100) : null

  const rows = [
    { section: 'Revenue' },
    { label: 'Total Revenue', field: 'grossRevenue' as const, subtotal: true, yoy: revenueYoY },
    { section: 'Cost of Goods Sold' },
    { label: 'Total COGS', field: 'cogs' as const, subtotal: true },
    { label: 'Gross Profit', field: 'grossProfit' as const, subtotal: true, highlight: true, yoy: gpYoY },
    { section: 'Operating Expenses' },
    { label: 'Total Operating Expenses', field: 'operatingExpenses' as const, subtotal: true },
    { label: 'Depreciation', field: 'depreciation' as const, indent: true },
    { label: 'Amortization', field: 'amortization' as const, indent: true },
    { label: 'Interest Expense', field: 'interestExpense' as const, indent: true },
    { label: 'Tax Expense', field: 'taxExpense' as const, indent: true },
    { label: 'EBITDA', field: 'ebitda' as const, total: true, yoy: ebitdaYoY },
  ]

  return (
    <>
      <TrackPageView page="/dashboard/financials/pnl" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>Profit &amp; Loss</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Profit &amp; Loss</h1>
          <p>Income statement detail</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/financials/edit" className={`${styles.btn} ${styles.btnSecondary}`}>
            Edit Data
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      {latest && (
        <div className={styles.kpiStrip}>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>Revenue</div>
            <div className={styles.kpiValue}>{formatShort(latest.grossRevenue)}</div>
            {revenueYoY !== null && (
              <div className={`${styles.kpiDelta} ${revenueYoY >= 0 ? styles.positive : styles.negative}`}>
                {revenueYoY >= 0 ? '+' : ''}{revenueYoY.toFixed(0)}% YoY
              </div>
            )}
          </div>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>Gross Margin</div>
            <div className={styles.kpiValue}>{latest.grossMarginPct.toFixed(1)}%</div>
          </div>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>EBITDA</div>
            <div className={styles.kpiValue}>{formatShort(latest.ebitda)}</div>
            {ebitdaYoY !== null && (
              <div className={`${styles.kpiDelta} ${ebitdaYoY >= 0 ? styles.positive : styles.negative}`}>
                {ebitdaYoY >= 0 ? '+' : ''}{ebitdaYoY.toFixed(0)}% YoY
              </div>
            )}
          </div>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>EBITDA Margin</div>
            <div className={styles.kpiValue}>{latest.ebitdaMarginPct.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* P&L Table */}
      {periods.length > 0 && (
        <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <h2 className={styles.sectionTitle}>Income Statement</h2>
            </div>
          </div>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ minWidth: '240px' }}></th>
                {periods.map((p, i) => (
                  <th key={p.id}>FY {p.fiscalYear}{i === 0 ? ' (Latest)' : ''}</th>
                ))}
                {periods.length >= 2 && <th>YoY</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                if ('section' in row && row.section) {
                  return (
                    <tr key={idx} className={styles.rowHeader}>
                      <td colSpan={periods.length + (periods.length >= 2 ? 2 : 1)}>{row.section}</td>
                    </tr>
                  )
                }

                const r = row as { label: string; field: keyof IncomeStatement; subtotal?: boolean; total?: boolean; indent?: boolean; highlight?: boolean; yoy?: number | null }
                const rowClass = r.total ? styles.rowTotal
                  : r.subtotal ? styles.rowSubtotal
                  : r.indent ? styles.rowIndent : ''
                const highlightStyle = r.highlight ? { background: 'var(--accent-light)' } : {}

                return (
                  <tr key={idx} className={rowClass} style={highlightStyle}>
                    <td style={r.highlight ? { color: 'var(--accent)', fontWeight: 700 } : undefined}>{r.label}</td>
                    {periods.map((p, i) => {
                      const stmt = statements[p.id]
                      const val = stmt ? stmt[r.field] : null
                      return (
                        <td key={p.id} style={i === 0 ? { fontWeight: 700 } : undefined}>
                          {val !== null && val !== undefined ? formatCurrency(Number(val)) : '—'}
                        </td>
                      )
                    })}
                    {periods.length >= 2 && (
                      <td>
                        {r.yoy !== null && r.yoy !== undefined && (
                          <span className={`${styles.yoyPill} ${r.yoy >= 0 ? styles.yoyPillUp : styles.yoyPillDown}`}>
                            {r.yoy >= 0 ? '+' : ''}{r.yoy.toFixed(0)}%
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}
