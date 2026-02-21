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
  const netIncomeYoY: number | null = null // wire when available

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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>Profit &amp; Loss</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Profit &amp; Loss Statement</h1>
          <p>Annual 3-Year Comparison &middot; Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export to Excel
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            View in CPA Portal
          </button>
        </div>
      </div>

      {/* Period Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.tabRow}>
          <button className={styles.tabBtn}>Monthly</button>
          <button className={styles.tabBtn}>Quarterly</button>
          <button className={`${styles.tabBtn} ${styles.tabBtnActive}`}>Annual</button>
        </div>
        <div className={styles.controlsDivider} />
        <div className={styles.tabRow}>
          {periods.slice(2, 3).map(p => (
            <button key={p.id} className={styles.tabBtn}>FY{p.fiscalYear}</button>
          ))}
          {periods.slice(1, 2).map(p => (
            <button key={p.id} className={styles.tabBtn}>FY{p.fiscalYear}</button>
          ))}
          {periods.slice(0, 1).map(p => (
            <button key={p.id} className={`${styles.tabBtn} ${styles.tabBtnActive}`}>FY{p.fiscalYear}</button>
          ))}
        </div>
      </div>

      {/* KPI Strip — 4 cards matching mocksite */}
      {latest && (
        <div className={styles.kpiStripFour}>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>
              {periods[0] ? `FY${periods[0].fiscalYear} ` : ''}Revenue
            </div>
            <div className={styles.kpiValue}>{formatShort(latest.grossRevenue)}</div>
            {revenueYoY !== null && (
              <div className={`${styles.kpiDelta} ${revenueYoY >= 0 ? styles.kpiDeltaUp : styles.kpiDeltaDown}`}>
                {revenueYoY >= 0
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 9 12 15 6 9"/></svg>
                }
                {revenueYoY >= 0 ? '+' : ''}{revenueYoY.toFixed(1)}% vs prior year
              </div>
            )}
          </div>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>Gross Profit</div>
            <div className={styles.kpiValue}>{formatShort(latest.grossProfit)}</div>
            <div className={`${styles.kpiDelta} ${styles.kpiDeltaUp}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              {latest.grossMarginPct.toFixed(1)}% margin
            </div>
            {prev && <div className={styles.kpiSub}>vs {prev.grossMarginPct.toFixed(1)}% prior year</div>}
          </div>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>EBITDA</div>
            <div className={styles.kpiValue}>{formatShort(latest.ebitda)}</div>
            <div className={`${styles.kpiDelta} ${ebitdaYoY !== null && ebitdaYoY >= 0 ? styles.kpiDeltaUp : styles.kpiDeltaDown}`}>
              {(ebitdaYoY === null || ebitdaYoY >= 0)
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 9 12 15 6 9"/></svg>
              }
              {latest.ebitdaMarginPct.toFixed(1)}% margin
            </div>
            {prev && <div className={styles.kpiSub}>vs {prev.ebitdaMarginPct.toFixed(1)}% prior year</div>}
          </div>
          <div className={styles.kpiStripCard}>
            <div className={styles.kpiLabel}>Net Income</div>
            <div className={styles.kpiValue}>
              {latest.taxExpense && latest.interestExpense
                ? formatShort(latest.ebitda - (latest.depreciation || 0) - (latest.amortization || 0) - (latest.interestExpense || 0) - (latest.taxExpense || 0))
                : '—'}
            </div>
            {netIncomeYoY !== null && (
              <div className={`${styles.kpiDelta} ${styles.kpiDeltaUp}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                {netIncomeYoY}% vs prior year
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Coach Insight */}
      <div className={styles.aiInsight}>
        <div className={styles.aiInsightIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightTitle}>Exit OS AI &mdash; P&amp;L Analysis</div>
          <div className={styles.aiInsightText}>
            {latest ? (
              <>
                Your <strong>{latest.ebitdaMarginPct.toFixed(1)}% EBITDA margin</strong> and strong revenue growth position this business well for exit.
                The shift toward recurring service revenue and expanding margins each year tells a compelling buyer story.
                Marketing investment at {latest.operatingExpenses > 0 ? ((latest.operatingExpenses / latest.grossRevenue * 100).toFixed(1)) : '—'}% of revenue is modest
                — acquirers typically model 2.5–3.0% post-acquisition, which should be framed proactively in buyer conversations.
              </>
            ) : (
              'Add your P&L data to unlock AI-powered analysis of your earnings profile and buyer story.'
            )}
          </div>
        </div>
      </div>

      {/* P&L Table */}
      {periods.length > 0 && (
        <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div className={styles.cardInnerHeader}>
            <div className={styles.cardInnerTitle}>Income Statement</div>
            <div className={styles.cardInnerSubtitle}>Three-year comparison with margins and YoY growth</div>
          </div>
          <div className={styles.overflowX}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: '260px' }}>Line Item</th>
                  {periods.map((p, i) => (
                    <th key={p.id}>FY{p.fiscalYear}</th>
                  ))}
                  {periods.length >= 2 && <th>YoY</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  if ('section' in row && row.section) {
                    return (
                      <tr key={idx} className={styles.rowGroup}>
                        <td colSpan={periods.length + (periods.length >= 2 ? 2 : 1)}>{row.section}</td>
                      </tr>
                    )
                  }

                  const r = row as {
                    label: string
                    field: keyof IncomeStatement
                    subtotal?: boolean
                    total?: boolean
                    indent?: boolean
                    highlight?: boolean
                    yoy?: number | null
                  }

                  const rowClass = r.total ? styles.rowTotalSub
                    : r.subtotal ? styles.rowTotalSub
                    : r.indent ? styles.rowIndent : ''

                  const isHighlight = r.highlight
                  const rowStyle = isHighlight ? { background: 'var(--accent-light)' } : {}

                  return (
                    <tr key={idx} className={rowClass} style={rowStyle}>
                      <td style={isHighlight ? { color: 'var(--accent)', fontWeight: 700 } : undefined}>
                        {r.label}
                      </td>
                      {periods.map((p, i) => {
                        const stmt = statements[p.id]
                        const val = stmt ? stmt[r.field] : null
                        const isLatest = i === 0
                        return (
                          <td
                            key={p.id}
                            className={isLatest ? styles.colHighlight : undefined}
                            style={isLatest && isHighlight ? { fontWeight: 700, color: 'var(--accent)' } : isLatest ? { fontWeight: 700 } : undefined}
                          >
                            {val !== null && val !== undefined ? formatCurrency(Number(val)) : '—'}
                          </td>
                        )
                      })}
                      {periods.length >= 2 && (
                        <td className={styles.colHighlight}>
                          {r.yoy !== null && r.yoy !== undefined ? (
                            <span className={`${styles.yoyPill} ${r.yoy >= 0 ? styles.yoyPillUp : styles.yoyPillDown}`}>
                              {r.yoy >= 0 ? '+' : ''}{r.yoy.toFixed(1)}%
                            </span>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Variance Analysis — TODO: wire to computed top variance drivers */}
      {latest && prev && (
        <div className={styles.card}>
          <div className={styles.sectionHeader} style={{ marginBottom: '20px' }}>
            <div>
              <div className={styles.sectionTitle}>Top Variance Drivers</div>
              <div className={styles.sectionSubtitle}>Largest year-over-year changes vs. prior year</div>
            </div>
          </div>
          {/* TODO: wire to API — compute top 5 line-item variances */}
          <div className={styles.varianceGrid}>
            {revenueYoY !== null && (
              <div className={styles.varianceItem}>
                <div className={styles.varianceRank}>#1 Change</div>
                <div className={styles.varianceName}>Total Revenue</div>
                <div className={`${styles.varianceAmount} ${revenueYoY >= 0 ? styles.varianceAmountPos : styles.varianceAmountNeg}`}>
                  {revenueYoY >= 0 ? '+' : ''}{formatShort(latest.grossRevenue - prev.grossRevenue)}
                </div>
                <div className={styles.variancePct}>{revenueYoY >= 0 ? '+' : ''}{revenueYoY.toFixed(1)}% year-over-year</div>
                <div className={`${styles.varianceBar} ${revenueYoY >= 0 ? styles.varianceBarPos : styles.varianceBarNeg}`} style={{ width: '100%' }} />
              </div>
            )}
            {gpYoY !== null && (
              <div className={styles.varianceItem}>
                <div className={styles.varianceRank}>#2 Change</div>
                <div className={styles.varianceName}>Gross Profit</div>
                <div className={`${styles.varianceAmount} ${gpYoY >= 0 ? styles.varianceAmountPos : styles.varianceAmountNeg}`}>
                  {gpYoY >= 0 ? '+' : ''}{formatShort(latest.grossProfit - prev.grossProfit)}
                </div>
                <div className={styles.variancePct}>{gpYoY >= 0 ? '+' : ''}{gpYoY.toFixed(1)}% year-over-year</div>
                <div className={`${styles.varianceBar} ${gpYoY >= 0 ? styles.varianceBarPos : styles.varianceBarNeg}`} style={{ width: '80%' }} />
              </div>
            )}
            {ebitdaYoY !== null && (
              <div className={styles.varianceItem}>
                <div className={styles.varianceRank}>#3 Change</div>
                <div className={styles.varianceName}>EBITDA</div>
                <div className={`${styles.varianceAmount} ${ebitdaYoY >= 0 ? styles.varianceAmountPos : styles.varianceAmountNeg}`}>
                  {ebitdaYoY >= 0 ? '+' : ''}{formatShort(latest.ebitda - prev.ebitda)}
                </div>
                <div className={styles.variancePct}>{ebitdaYoY >= 0 ? '+' : ''}{ebitdaYoY.toFixed(1)}% year-over-year</div>
                <div className={`${styles.varianceBar} ${ebitdaYoY >= 0 ? styles.varianceBarPos : styles.varianceBarNeg}`} style={{ width: '68%' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
