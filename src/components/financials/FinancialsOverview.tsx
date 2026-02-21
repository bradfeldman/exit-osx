'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import styles from './financials-pages.module.css'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

function formatFullCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

interface DashboardData {
  tier1: {
    industryName: string
    currentValue: number
  }
  tier2: {
    adjustedEbitda: number
    multipleRange: { low: number; high: number; current: number }
  }
}

interface FinancialPeriod {
  id: string
  fiscalYear: number
  periodType: string
  incomeStatement: { id: string; ebitda: number } | null
  _count: { adjustments: number }
}

interface IncomeStatementData {
  grossRevenue: number
  cogs: number
  operatingExpenses: number
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
}

interface Adjustment {
  id: string
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
  category: string | null
  notes: string | null
}

export function FinancialsOverview() {
  const { selectedCompanyId } = useCompany()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [statements, setStatements] = useState<Record<string, IncomeStatementData>>({})
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [activeTab, setActiveTab] = useState<'pnl' | 'bs' | 'cf'>('pnl')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/dashboard`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/financial-periods`).then(r => r.ok ? r.json() : null),
    ])
      .then(async ([dashData, periodsData]) => {
        if (cancelled) return
        if (dashData) setDashboard(dashData)

        const periodsList: FinancialPeriod[] = periodsData?.periods || []
        setPeriods(periodsList)

        // Fetch income statements for up to 3 most recent annual periods
        const annualPeriods = periodsList
          .filter((p: FinancialPeriod) => p.periodType === 'ANNUAL' && p.incomeStatement)
          .slice(0, 3)

        const stmtEntries = await Promise.all(
          annualPeriods.map(async (p: FinancialPeriod) => {
            const res = await fetch(`/api/companies/${selectedCompanyId}/financial-periods/${p.id}/income-statement`)
            if (!res.ok) return null
            const data = await res.json()
            return data.incomeStatement ? [p.id, data.incomeStatement] as const : null
          })
        )

        if (!cancelled) {
          const stmtMap: Record<string, IncomeStatementData> = {}
          for (const entry of stmtEntries) {
            if (entry) stmtMap[entry[0]] = entry[1]
          }
          setStatements(stmtMap)
        }

        // Fetch adjustments
        const adjRes = await fetch(`/api/companies/${selectedCompanyId}/adjustments`)
        if (adjRes.ok && !cancelled) {
          const adjData = await adjRes.json()
          setAdjustments(adjData.adjustments || [])
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (loading || !dashboard) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const annualPeriods = periods
    .filter(p => p.periodType === 'ANNUAL' && p.incomeStatement)
    .slice(0, 3)

  const latestPeriod = annualPeriods[0]
  const latestStmt = latestPeriod ? statements[latestPeriod.id] : null

  const { tier2 } = dashboard
  const adjustedEbitda = tier2.adjustedEbitda
  const revenue = latestStmt?.grossRevenue || 0
  const ebitda = latestStmt?.ebitda || 0
  const grossMargin = latestStmt?.grossMarginPct || 0
  const ebitdaMargin = latestStmt?.ebitdaMarginPct || 0
  const grossProfit = latestStmt?.grossProfit || 0
  const cogs = latestStmt?.cogs || 0
  const opex = latestStmt?.operatingExpenses || 0

  const totalAddBacks = adjustments
    .filter(a => a.type === 'ADD_BACK')
    .reduce((sum, a) => sum + a.amount, 0)
  const totalDeductions = adjustments
    .filter(a => a.type === 'DEDUCTION')
    .reduce((sum, a) => sum + a.amount, 0)
  const netAdjustments = totalAddBacks - totalDeductions

  // YoY calculations
  const prevStmt = annualPeriods[1] ? statements[annualPeriods[1].id] : null
  const revenueYoY = prevStmt && prevStmt.grossRevenue > 0
    ? ((revenue - prevStmt.grossRevenue) / prevStmt.grossRevenue * 100)
    : null
  const ebitdaYoY = prevStmt && prevStmt.ebitda > 0
    ? ((ebitda - prevStmt.ebitda) / prevStmt.ebitda * 100)
    : null
  const adjEbitdaYoY = revenueYoY // proxy

  // Bridge chart heights (relative to revenue)
  const maxVal = Math.max(revenue, 1)
  const bridgeItems = [
    { label: 'Revenue', value: revenue, colorClass: styles.bridgeBarRevenue, pct: 85, textColor: 'var(--accent)' },
    { label: 'Cost of Goods', value: -cogs, colorClass: styles.bridgeBarExpense, pct: Math.round((cogs / maxVal) * 100), textColor: 'var(--red)' },
    { label: 'Gross Profit', value: grossProfit, colorClass: styles.bridgeBarSubtotal, pct: Math.round((grossProfit / maxVal) * 100), textColor: 'var(--purple)' },
    { label: 'Operating Expenses', value: -opex, colorClass: styles.bridgeBarExpense, pct: Math.round((opex / maxVal) * 100), textColor: 'var(--red)' },
    { label: 'Reported EBITDA', value: ebitda, colorClass: styles.bridgeBarSubtotal, pct: Math.round((ebitda / maxVal) * 100), textColor: 'var(--purple)' },
    { label: 'Owner Add-Backs', value: netAdjustments, colorClass: styles.bridgeBarAddback, pct: Math.max(Math.round((netAdjustments / maxVal) * 100), 3), textColor: 'var(--green)' },
    { label: 'Adjusted EBITDA', value: adjustedEbitda, colorClass: styles.bridgeBarResult, pct: Math.round((adjustedEbitda / maxVal) * 100), textColor: 'var(--green)' },
  ]

  return (
    <>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Financials</h1>
          <p>{dashboard.tier1.industryName} &mdash; Fiscal Year Overview</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/financials/edit" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Edit Manually
          </Link>
          <Link href="/dashboard/financials/edit?source=sync" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
            </svg>
            Sync QuickBooks
          </Link>
        </div>
      </div>

      {/* KPI Grid — 5 cards matching mocksite */}
      <div className={styles.kpiGrid}>
        {/* Revenue (TTM) */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Revenue (TTM)</div>
          <div className={styles.kpiValue}>{formatCurrency(revenue)}</div>
          {revenueYoY !== null && (
            <div className={`${styles.kpiChange} ${revenueYoY >= 0 ? styles.kpiChangeUp : styles.kpiChangeDown}`}>
              {revenueYoY >= 0
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
              }
              {revenueYoY >= 0 ? '+' : ''}{revenueYoY.toFixed(0)}% YoY
            </div>
          )}
        </div>

        {/* EBITDA */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>EBITDA</div>
          <div className={styles.kpiValue}>{formatCurrency(ebitda)}</div>
          {ebitdaYoY !== null && (
            <div className={`${styles.kpiChange} ${ebitdaYoY >= 0 ? styles.kpiChangeUp : styles.kpiChangeDown}`}>
              {ebitdaYoY >= 0
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
              }
              {ebitdaYoY >= 0 ? '+' : ''}{ebitdaYoY.toFixed(0)}% YoY
            </div>
          )}
        </div>

        {/* Adjusted EBITDA */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Adjusted EBITDA</div>
          <div className={styles.kpiValue} style={{ color: 'var(--accent)' }}>{formatCurrency(adjustedEbitda)}</div>
          {adjEbitdaYoY !== null && (
            <div className={`${styles.kpiChange} ${adjEbitdaYoY >= 0 ? styles.kpiChangeUp : styles.kpiChangeDown}`}>
              {adjEbitdaYoY >= 0
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
              }
              {adjEbitdaYoY >= 0 ? '+' : ''}{adjEbitdaYoY.toFixed(0)}% YoY
            </div>
          )}
        </div>

        {/* Gross Margin */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Gross Margin</div>
          <div className={styles.kpiValue}>{grossMargin.toFixed(0)}%</div>
        </div>

        {/* EBITDA Margin */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>EBITDA Margin</div>
          <div className={styles.kpiValue}>{ebitdaMargin.toFixed(1)}%</div>
          <div className={`${styles.kpiChange} ${styles.kpiChangeFlat}`}>&mdash; Flat YoY</div>
        </div>
      </div>

      {/* AI Coach Insight */}
      <div className={styles.aiInsight}>
        <div className={styles.aiInsightIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightTitle}>Exit OS AI &mdash; Financials Overview</div>
          <div className={styles.aiInsightText}>
            Your financials show <strong>{formatCurrency(revenue)} in revenue</strong> with{' '}
            <strong>{grossMargin.toFixed(0)}% gross margins</strong> and{' '}
            <strong>{formatCurrency(adjustedEbitda)} in Adjusted EBITDA</strong>.
            {netAdjustments > 0 && (
              <> Owner add-backs of <strong>{formatCurrency(netAdjustments)}</strong> normalize
                your earnings for a buyer who wouldn&apos;t inherit these expenses.</>
            )}
          </div>
        </div>
      </div>

      {/* EBITDA Bridge */}
      {revenue > 0 && (
        <div className={styles.bridgeSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>EBITDA Bridge</h2>
            {latestPeriod && (
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                FY {latestPeriod.fiscalYear}
              </span>
            )}
          </div>
          <div className={styles.bridgeCard}>
            <div className={styles.bridgeChart}>
              {bridgeItems.map((item) => (
                <div key={item.label} className={styles.bridgeCol}>
                  <div
                    className={styles.bridgeValue}
                    style={{
                      color: item.textColor,
                      ...(item.label === 'Adjusted EBITDA' ? { fontSize: '14px', fontWeight: 800 } : {})
                    }}
                  >
                    {item.value < 0 ? '-' : item.label !== 'Revenue' && item.label !== 'Gross Profit' && item.label !== 'Reported EBITDA' && item.value > 0 ? '+' : ''}
                    {formatCurrency(Math.abs(item.value))}
                  </div>
                  <div
                    className={`${styles.bridgeBar} ${item.colorClass}`}
                    style={{ height: `${Math.max(item.pct, 3)}%` }}
                  />
                  <div className={styles.bridgeLabel}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Statements with tab bar */}
      {annualPeriods.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Financial Statements</h2>
            <Link href="/dashboard/financials/edit" className={styles.sectionLink}>
              Export all &rarr;
            </Link>
          </div>
          <div className={styles.tabBar}>
            <Link
              href="/dashboard/financials/pnl"
              className={`${styles.tab} ${activeTab === 'pnl' ? styles.tabActive : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab('pnl') }}
            >
              Profit &amp; Loss
            </Link>
            <Link
              href="/dashboard/financials/balance-sheet"
              className={`${styles.tab} ${activeTab === 'bs' ? styles.tabActive : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab('bs') }}
            >
              Balance Sheet
            </Link>
            <Link
              href="/dashboard/financials/cash-flow"
              className={`${styles.tab} ${activeTab === 'cf' ? styles.tabActive : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab('cf') }}
            >
              Cash Flow
            </Link>
          </div>
          <div className={styles.finTableCard}>
            {activeTab === 'pnl' && (
              <table className={styles.finTable}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}></th>
                    {annualPeriods.map((p, i) => (
                      <th key={p.id}>FY {p.fiscalYear}{i === 0 ? ' (TTM)' : ''}</th>
                    ))}
                    {annualPeriods.length >= 2 && <th style={{ minWidth: '80px' }}>YoY</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* Revenue */}
                  <tr className={styles.rowHeader}>
                    <td colSpan={annualPeriods.length + (annualPeriods.length >= 2 ? 2 : 1)}>Revenue</td>
                  </tr>
                  <tr className={styles.rowSubtotal}>
                    <td>Total Revenue</td>
                    {annualPeriods.map((p, i) => {
                      const s = statements[p.id]
                      return <td key={p.id} style={i === 0 ? { fontWeight: 700 } : undefined}>{s ? formatFullCurrency(s.grossRevenue) : '—'}</td>
                    })}
                    {annualPeriods.length >= 2 && revenueYoY !== null && (
                      <td><span className={`${styles.yoyPill} ${revenueYoY >= 0 ? styles.yoyPillUp : styles.yoyPillDown}`}>{revenueYoY >= 0 ? '+' : ''}{revenueYoY.toFixed(0)}%</span></td>
                    )}
                    {annualPeriods.length >= 2 && revenueYoY === null && <td></td>}
                  </tr>

                  {/* COGS */}
                  <tr className={styles.rowHeader}>
                    <td colSpan={annualPeriods.length + (annualPeriods.length >= 2 ? 2 : 1)}>Cost of Goods Sold</td>
                  </tr>
                  <tr className={styles.rowSubtotal}>
                    <td>Total COGS</td>
                    {annualPeriods.map((p, i) => {
                      const s = statements[p.id]
                      return <td key={p.id} style={i === 0 ? { fontWeight: 700 } : undefined}>{s ? formatFullCurrency(s.cogs) : '—'}</td>
                    })}
                    {annualPeriods.length >= 2 && (() => {
                      const cur = statements[annualPeriods[0].id]?.cogs
                      const prev = statements[annualPeriods[1].id]?.cogs
                      if (cur && prev && prev > 0) {
                        const pct = (cur - prev) / prev * 100
                        return <td><span className={`${styles.yoyPill} ${pct <= 0 ? styles.yoyPillUp : styles.yoyPillDown}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(0)}%</span></td>
                      }
                      return <td></td>
                    })()}
                  </tr>

                  {/* Gross Profit */}
                  <tr className={`${styles.rowSubtotal} ${styles.rowGrossProfit}`}>
                    <td>Gross Profit</td>
                    {annualPeriods.map((p, i) => {
                      const s = statements[p.id]
                      return (
                        <td key={p.id} style={i === 0 ? { fontWeight: 700, color: 'var(--accent)' } : { fontWeight: 700 }}>
                          {s ? formatFullCurrency(s.grossProfit) : '—'}
                        </td>
                      )
                    })}
                    {annualPeriods.length >= 2 && (() => {
                      const cur = statements[annualPeriods[0].id]?.grossProfit
                      const prev = statements[annualPeriods[1].id]?.grossProfit
                      if (cur && prev && prev > 0) {
                        const pct = (cur - prev) / prev * 100
                        return <td><span className={`${styles.yoyPill} ${pct >= 0 ? styles.yoyPillUp : styles.yoyPillDown}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(0)}%</span></td>
                      }
                      return <td></td>
                    })()}
                  </tr>

                  {/* OpEx */}
                  <tr className={styles.rowHeader}>
                    <td colSpan={annualPeriods.length + (annualPeriods.length >= 2 ? 2 : 1)}>Operating Expenses</td>
                  </tr>
                  <tr className={styles.rowSubtotal}>
                    <td>Total Operating Expenses</td>
                    {annualPeriods.map((p, i) => {
                      const s = statements[p.id]
                      return <td key={p.id} style={i === 0 ? { fontWeight: 700 } : undefined}>{s ? formatFullCurrency(s.operatingExpenses) : '—'}</td>
                    })}
                    {annualPeriods.length >= 2 && <td></td>}
                  </tr>

                  {/* EBITDA */}
                  <tr className={styles.rowTotal}>
                    <td>EBITDA</td>
                    {annualPeriods.map((p, i) => {
                      const s = statements[p.id]
                      return (
                        <td key={p.id} style={i === 0 ? { fontSize: '16px', fontWeight: 700 } : undefined}>
                          {s ? formatFullCurrency(s.ebitda) : '—'}
                        </td>
                      )
                    })}
                    {annualPeriods.length >= 2 && ebitdaYoY !== null && (
                      <td><span className={`${styles.yoyPill} ${ebitdaYoY >= 0 ? styles.yoyPillUp : styles.yoyPillDown}`}>{ebitdaYoY >= 0 ? '+' : ''}{ebitdaYoY.toFixed(0)}%</span></td>
                    )}
                    {annualPeriods.length >= 2 && ebitdaYoY === null && <td></td>}
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'bs' && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Link href="/dashboard/financials/balance-sheet" className={styles.sectionLink}>
                  View Balance Sheet detail &rarr;
                </Link>
              </div>
            )}

            {activeTab === 'cf' && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Link href="/dashboard/financials/cash-flow" className={styles.sectionLink}>
                  View Cash Flow detail &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EBITDA Adjustments */}
      {adjustments.length > 0 && (
        <div className={styles.adjSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>EBITDA Adjustments</h2>
            <Link
              href="/dashboard/financials/ebitda-adjustments"
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Adjustment
            </Link>
          </div>
          <div className={styles.adjCard}>
            <div className={styles.adjList}>
              {adjustments.map(adj => (
                <div key={adj.id} className={styles.adjItem}>
                  <span className={`${styles.adjTypeBadge} ${adj.type === 'ADD_BACK' ? styles.adjTypeBadgeAdd : styles.adjTypeBadgeSub}`}>
                    {adj.type === 'ADD_BACK' ? 'Add-Back' : 'Deduction'}
                  </span>
                  <div className={styles.adjInfo}>
                    <div className={styles.adjName}>{adj.description}</div>
                    {adj.notes && <div className={styles.adjNote}>{adj.notes}</div>}
                  </div>
                  <div className={`${styles.adjAmount} ${adj.type === 'ADD_BACK' ? styles.adjAmountPositive : styles.adjAmountNegative}`}>
                    {adj.type === 'ADD_BACK' ? '+' : '-'}{formatFullCurrency(adj.amount)}
                  </div>
                  <div className={styles.adjActions}>
                    <button className={styles.adjBtn} aria-label="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.adjTotalRow}>
              <div className={styles.adjTotalLabel}>Total Adjustments</div>
              <div className={styles.adjTotalAmount}>+{formatFullCurrency(netAdjustments)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Flagged Transactions — TODO: wire to AI-flagged items API */}
      {/* TODO: wire to API — renders flagged transactions from QuickBooks */}
    </>
  )
}
