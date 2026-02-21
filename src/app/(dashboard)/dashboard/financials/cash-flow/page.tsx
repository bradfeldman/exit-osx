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
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

function signedCurrency(value: number): string {
  if (value === 0) return '$0'
  const abs = formatCurrency(Math.abs(value))
  return value > 0 ? `+${abs}` : `(${abs})`
}

interface CashFlow {
  netIncome: number
  depreciation: number
  amortization: number
  changesInWorkingCapital: number
  otherOperating: number
  cashFromOperations: number
  capitalExpenditures: number
  acquisitions: number
  otherInvesting: number
  cashFromInvesting: number
  debtIssuance: number
  debtRepayment: number
  equityIssuance: number
  dividends: number
  otherFinancing: number
  cashFromFinancing: number
  netChangeInCash: number
  beginningCash: number
  endingCash: number
  freeCashFlow: number
}

export default function CashFlowPage() {
  const { selectedCompanyId } = useCompany()
  const [cf, setCf] = useState<CashFlow | null>(null)
  const [fiscalYear, setFiscalYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/financial-periods`)
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (cancelled || !data) return
        const periods = (data.periods || []).filter((p: { periodType: string }) => p.periodType === 'ANNUAL')
        const latest = periods[0]
        if (!latest) return

        setFiscalYear(latest.fiscalYear)
        const res = await fetch(`/api/companies/${selectedCompanyId}/financial-periods/${latest.id}/cash-flow`)
        if (res.ok && !cancelled) {
          const d = await res.json()
          if (d.cashFlow) setCf(d.cashFlow)
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

  const cfOps = cf?.cashFromOperations || 0
  const fcf = cf?.freeCashFlow || 0
  const capex = cf?.capitalExpenditures || 0
  const endingCash = cf?.endingCash || 0
  const beginningCash = cf?.beginningCash || 0
  const maxAbs = Math.max(Math.abs(cfOps), Math.abs(cf?.cashFromInvesting || 0), Math.abs(cf?.cashFromFinancing || 0), 1)

  // FCF conversion rate: FCF / Operating CF
  const fcfConversionRate = cfOps !== 0 ? (fcf / cfOps * 100) : null

  const yrLabel = fiscalYear ? `FY${fiscalYear}` : 'Latest'
  const prevYrLabel = fiscalYear ? `FY${fiscalYear - 1}` : 'Prior Year'
  const prev2YrLabel = fiscalYear ? `FY${fiscalYear - 2}` : '2 Years Prior'

  return (
    <>
      <TrackPageView page="/dashboard/financials/cash-flow" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>Cash Flow</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Cash Flow Statement</h1>
          <p>
            {fiscalYear ? `${yrLabel} — Indirect Method` : 'Year-over-year cash flow analysis'}
            {fiscalYear && <> &middot; Updated {yrLabel}</>}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <DownloadIcon />
            Export PDF
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
            <SyncIcon />
            Sync from QuickBooks
          </button>
        </div>
      </div>

      {!cf ? (
        <div className={styles.card}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No cash flow data available.{' '}
            <Link href="/dashboard/financials/edit" className={styles.sectionLink}>
              Enter data &rarr;
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* FCF Hero — 3 sections */}
          <div className={styles.fcfHeroThree}>
            <div className={styles.fcfSectionInner}>
              <div className={styles.fcfLabel}>{yrLabel} Operating Cash Flow</div>
              <div className={`${styles.fcfValue} ${cfOps >= 0 ? styles.fcfValueGreen : styles.fcfValueOrange}`}>
                {formatShort(cfOps)}
              </div>
              <div className={styles.fcfSub}>Net cash generated from operations</div>
            </div>
            <div className={styles.fcfSectionInner}>
              <div className={styles.fcfLabel}>{yrLabel} Free Cash Flow</div>
              <div className={`${styles.fcfValue} ${styles.fcfValueWhite}`}>
                {formatShort(fcf)}
              </div>
              <div className={styles.fcfSub}>OCF minus CapEx ({formatShort(Math.abs(capex))})</div>
            </div>
            <div className={styles.fcfSectionInner}>
              <div className={styles.fcfLabel}>FCF Conversion Rate</div>
              <div className={`${styles.fcfValue} ${styles.fcfValueOrange}`}>
                {fcfConversionRate !== null ? `${fcfConversionRate.toFixed(1)}%` : '—'}
              </div>
              <div className={styles.fcfSub}>FCF as % of operating cash flow</div>
            </div>
          </div>

          {/* KPI Row */}
          <div className={styles.kpiRow}>
            <div className={styles.kpiRowCard}>
              <div className={styles.kpiLabel}>Ending Cash ({yrLabel})</div>
              <div className={styles.kpiValue} style={{ color: endingCash >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatShort(endingCash)}
              </div>
              <div className={styles.kpiSub}>
                Beginning: {formatShort(beginningCash)} &rarr; Net change: {signedCurrency(cf.netChangeInCash)}
              </div>
            </div>
            <div className={styles.kpiRowCard}>
              <div className={styles.kpiLabel}>Capital Expenditures</div>
              <div className={styles.kpiValue} style={{ color: 'var(--orange)' }}>
                {formatShort(Math.abs(capex))}
              </div>
              <div className={styles.kpiSub}>Investing outflows for {yrLabel}</div>
            </div>
            <div className={styles.kpiRowCard}>
              <div className={styles.kpiLabel}>Net Income</div>
              <div className={styles.kpiValue} style={{ color: 'var(--accent)' }}>
                {formatShort(cf.netIncome)}
              </div>
              <div className={styles.kpiSub}>Starting point for indirect cash flow</div>
            </div>
          </div>

          {/* AI Insight */}
          <div className={styles.aiInsight}>
            <div className={styles.aiInsightIcon}>
              <ChatIcon />
            </div>
            <div>
              <div className={styles.aiInsightTitle}>Exit OS AI &mdash; Cash Flow Analysis</div>
              <div className={styles.aiInsightText}>
                Your business is generating{' '}
                <strong>
                  {cfOps >= 1_000_000 ? 'strong' : 'positive'} operating cash flow ({formatShort(cfOps)} in {yrLabel})
                </strong>
                , which is the most important number a buyer&apos;s lender will scrutinize for debt service coverage.
                {Math.abs(capex) > 0 && (
                  <> The <strong>{formatShort(Math.abs(capex))} in capital expenditures</strong> will prompt due diligence questions — be prepared to explain whether this is a recurring maintenance need or a one-time growth investment.</>
                )}
                {cf.dividends !== 0 && (
                  <> Owner distributions of <strong>{formatShort(Math.abs(cf.dividends))}</strong> are common in owner-operated businesses and buyers expect them.</>
                )}
                {fcfConversionRate !== null && (
                  <> Most importantly, the <strong>FCF conversion rate of {fcfConversionRate.toFixed(1)}%</strong> is {fcfConversionRate >= 50 ? 'healthy' : 'an area to watch'} — buyers&apos; lenders will model annual debt service against your cash flow profile.</>
                )}
              </div>
            </div>
          </div>

          {/* Cash Flow Table — single period with full detail */}
          <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
            <div className={styles.cardInnerHeader}>
              <div className={styles.cardInnerTitle}>Statement of Cash Flows</div>
              <div className={styles.cardInnerSubtitle}>
                Indirect method &mdash; {yrLabel}
              </div>
            </div>
            <div className={styles.overflowX}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '300px' }}>Line Item</th>
                    <th>{prev2YrLabel}</th>
                    <th>{prevYrLabel}</th>
                    <th>{yrLabel}</th>
                    <th style={{ width: '80px' }}>YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Operating Activities */}
                  <tr className={styles.rowGroup}>
                    <td>Operating Activities</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Net Income</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{formatCurrency(cf.netIncome)}</td>
                    <td></td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Add: Depreciation &amp; Amortization</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{formatCurrency(cf.depreciation + cf.amortization)}</td>
                    <td></td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Changes in Working Capital</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{formatCurrency(cf.changesInWorkingCapital)}</td>
                    <td></td>
                  </tr>
                  {cf.otherOperating !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Other Operating Changes</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.otherOperating)}</td>
                      <td></td>
                    </tr>
                  )}
                  <tr className={styles.rowTotalSub}>
                    <td style={{ fontWeight: 700 }}>Net Cash from Operations</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ fontWeight: 700, color: cfOps >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(cfOps)}</td>
                    <td></td>
                  </tr>

                  <tr className={styles.rowSpacer}><td colSpan={5}></td></tr>

                  {/* Investing Activities */}
                  <tr className={styles.rowGroup}>
                    <td>Investing Activities</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  {capex !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Capital Expenditures</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(capex)}</td>
                      <td></td>
                    </tr>
                  )}
                  {cf.acquisitions !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Acquisitions</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.acquisitions)}</td>
                      <td></td>
                    </tr>
                  )}
                  {cf.otherInvesting !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Other Investing</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.otherInvesting)}</td>
                      <td></td>
                    </tr>
                  )}
                  <tr className={styles.rowTotalSub}>
                    <td style={{ fontWeight: 700 }}>Net Cash from Investing</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ fontWeight: 700, color: cf.cashFromInvesting >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatCurrency(cf.cashFromInvesting)}
                    </td>
                    <td></td>
                  </tr>

                  <tr className={styles.rowSpacer}><td colSpan={5}></td></tr>

                  {/* Financing Activities */}
                  <tr className={styles.rowGroup}>
                    <td>Financing Activities</td>
                    <td></td><td></td><td></td><td></td>
                  </tr>
                  {cf.debtRepayment !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Debt Repayments</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.debtRepayment)}</td>
                      <td></td>
                    </tr>
                  )}
                  {cf.debtIssuance !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>New Borrowings</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.debtIssuance)}</td>
                      <td></td>
                    </tr>
                  )}
                  {cf.dividends !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Owner Distributions / Dividends</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.dividends)}</td>
                      <td></td>
                    </tr>
                  )}
                  {cf.equityIssuance !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Equity Issuance</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.equityIssuance)}</td>
                      <td></td>
                    </tr>
                  )}
                  {cf.otherFinancing !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Other Financing</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{formatCurrency(cf.otherFinancing)}</td>
                      <td></td>
                    </tr>
                  )}
                  <tr className={styles.rowTotalSub}>
                    <td style={{ fontWeight: 700 }}>Net Cash from Financing</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ fontWeight: 700, color: cf.cashFromFinancing >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatCurrency(cf.cashFromFinancing)}
                    </td>
                    <td></td>
                  </tr>

                  <tr className={styles.rowSpacer}><td colSpan={5}></td></tr>

                  {/* Summary rows */}
                  <tr className={styles.rowTotalSub}>
                    <td>Net Change in Cash</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ fontWeight: 700, color: cf.netChangeInCash >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {cf.netChangeInCash >= 0 ? '+' : ''}{formatCurrency(cf.netChangeInCash)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Beginning Cash Balance</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{formatCurrency(beginningCash)}</td>
                    <td></td>
                  </tr>
                  <tr className={styles.rowTotal}>
                    <td>Ending Cash Balance</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ color: endingCash >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                      {formatCurrency(endingCash)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Waterfall Visualization */}
          <div className={styles.card}>
            <div className={styles.sectionHeader} style={{ marginBottom: '24px' }}>
              <div>
                <div className={styles.sectionTitle}>Cash Flow Waterfall</div>
                <div className={styles.sectionSubtitle}>
                  Operating, investing, and financing flows &mdash; {yrLabel}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Operating bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Operating Cash Flow</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: cfOps >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {cfOps >= 0 ? '+' : ''}{formatCurrency(cfOps)}
                  </span>
                </div>
                <div style={{ height: '32px', background: 'var(--surface-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Math.abs(cfOps) / maxAbs * 100, 100)}%`,
                    background: cfOps >= 0 ? 'linear-gradient(90deg,var(--green),#28a745)' : 'linear-gradient(90deg,var(--red),#cc2a20)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', paddingLeft: '12px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                      {cfOps >= 0 ? 'Source of cash — strong operations' : 'Cash outflow from operations'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Investing bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Investing Cash Flow</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: cf.cashFromInvesting >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    ({formatCurrency(Math.abs(cf.cashFromInvesting))})
                  </span>
                </div>
                <div style={{ height: '32px', background: 'var(--surface-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Math.abs(cf.cashFromInvesting) / maxAbs * 100, 100)}%`,
                    background: 'linear-gradient(90deg,var(--red),#cc2a20)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', paddingLeft: '12px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                      Capital expenditures
                    </span>
                  </div>
                </div>
              </div>

              {/* Financing bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Financing Cash Flow</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: cf.cashFromFinancing >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    ({formatCurrency(Math.abs(cf.cashFromFinancing))})
                  </span>
                </div>
                <div style={{ height: '32px', background: 'var(--surface-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Math.abs(cf.cashFromFinancing) / maxAbs * 100, 100)}%`,
                    background: 'linear-gradient(90deg,var(--orange),#cc7700)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', paddingLeft: '12px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                      {cf.dividends !== 0 ? 'Distributions + debt payments' : 'Debt payments'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net change */}
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Net Change in Cash</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: cf.netChangeInCash >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {cf.netChangeInCash >= 0 ? '+' : ''}{formatCurrency(cf.netChangeInCash)}
                  </span>
                </div>
                <div style={{ height: '32px', background: 'var(--surface-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(Math.abs(cf.netChangeInCash) / maxAbs * 100, 100)}%`,
                    background: cf.netChangeInCash >= 0
                      ? 'linear-gradient(90deg,#0071E3,#005EC4)'
                      : 'linear-gradient(90deg,var(--red),#cc2a20)',
                    borderRadius: '8px'
                  }} />
                </div>
                {beginningCash > 0 && endingCash > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                    Cash grew from {formatShort(beginningCash)} &rarr; {formatShort(endingCash)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
