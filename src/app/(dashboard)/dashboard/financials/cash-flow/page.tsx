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

  const fcf = cf?.freeCashFlow || 0
  const cfOps = cf?.cashFromOperations || 0
  const capex = cf?.capitalExpenditures || 0

  // Waterfall percentages
  const maxCf = Math.max(Math.abs(cfOps), Math.abs(cf?.cashFromInvesting || 0), Math.abs(cf?.cashFromFinancing || 0), 1)

  return (
    <>
      <TrackPageView page="/dashboard/financials/cash-flow" />

      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>Cash Flow</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1>Cash Flow Statement</h1>
          {fiscalYear && <p>Fiscal Year {fiscalYear}</p>}
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/financials/edit" className={`${styles.btn} ${styles.btnSecondary}`}>
            Edit Data
          </Link>
        </div>
      </div>

      {!cf ? (
        <div className={styles.card}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No cash flow data available. <Link href="/dashboard/financials/edit" className={styles.sectionLink}>Enter data &rarr;</Link>
          </p>
        </div>
      ) : (
        <>
          {/* FCF Hero */}
          <div className={styles.fcfHero}>
            <div className={styles.fcfSection}>
              <div className={styles.fcfLabel}>Free Cash Flow</div>
              <div className={`${styles.fcfValue} ${fcf >= 0 ? styles.fcfValueGreen : styles.fcfValueOrange}`}>
                {formatShort(fcf)}
              </div>
              <div className={styles.fcfSub}>Operating cash less capital expenditures</div>
            </div>
            <div className={styles.fcfSection}>
              <div className={styles.fcfLabel}>Cash from Operations</div>
              <div className={`${styles.fcfValue} ${styles.fcfValueWhite}`}>
                {formatShort(cfOps)}
              </div>
            </div>
            <div className={styles.fcfSection}>
              <div className={styles.fcfLabel}>Capital Expenditures</div>
              <div className={`${styles.fcfValue} ${styles.fcfValueOrange}`}>
                {formatShort(capex)}
              </div>
            </div>
          </div>

          {/* Cash Flow Table */}
          <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 className={styles.sectionTitle}>Cash Flow Detail</h2>
            </div>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ minWidth: '240px' }}></th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.rowHeader}><td colSpan={2}>Operating Activities</td></tr>
                <tr className={styles.rowIndent}><td>Net Income</td><td>{formatCurrency(cf.netIncome)}</td></tr>
                <tr className={styles.rowIndent}><td>Depreciation</td><td>{formatCurrency(cf.depreciation)}</td></tr>
                <tr className={styles.rowIndent}><td>Amortization</td><td>{formatCurrency(cf.amortization)}</td></tr>
                <tr className={styles.rowIndent}><td>Changes in Working Capital</td><td>{formatCurrency(cf.changesInWorkingCapital)}</td></tr>
                {cf.otherOperating !== 0 && <tr className={styles.rowIndent}><td>Other Operating</td><td>{formatCurrency(cf.otherOperating)}</td></tr>}
                <tr className={styles.rowSubtotal}><td>Cash from Operations</td><td style={{ fontWeight: 700 }}>{formatCurrency(cfOps)}</td></tr>

                <tr className={styles.rowHeader}><td colSpan={2}>Investing Activities</td></tr>
                <tr className={styles.rowIndent}><td>Capital Expenditures</td><td>{formatCurrency(capex)}</td></tr>
                {cf.acquisitions !== 0 && <tr className={styles.rowIndent}><td>Acquisitions</td><td>{formatCurrency(cf.acquisitions)}</td></tr>}
                {cf.otherInvesting !== 0 && <tr className={styles.rowIndent}><td>Other Investing</td><td>{formatCurrency(cf.otherInvesting)}</td></tr>}
                <tr className={styles.rowSubtotal}><td>Cash from Investing</td><td style={{ fontWeight: 700 }}>{formatCurrency(cf.cashFromInvesting)}</td></tr>

                <tr className={styles.rowHeader}><td colSpan={2}>Financing Activities</td></tr>
                {cf.debtIssuance !== 0 && <tr className={styles.rowIndent}><td>Debt Issuance</td><td>{formatCurrency(cf.debtIssuance)}</td></tr>}
                {cf.debtRepayment !== 0 && <tr className={styles.rowIndent}><td>Debt Repayment</td><td>{formatCurrency(cf.debtRepayment)}</td></tr>}
                {cf.dividends !== 0 && <tr className={styles.rowIndent}><td>Dividends</td><td>{formatCurrency(cf.dividends)}</td></tr>}
                {cf.otherFinancing !== 0 && <tr className={styles.rowIndent}><td>Other Financing</td><td>{formatCurrency(cf.otherFinancing)}</td></tr>}
                <tr className={styles.rowSubtotal}><td>Cash from Financing</td><td style={{ fontWeight: 700 }}>{formatCurrency(cf.cashFromFinancing)}</td></tr>

                <tr className={styles.rowTotal}>
                  <td>Net Change in Cash</td>
                  <td style={{ fontWeight: 700, color: cf.netChangeInCash >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {formatCurrency(cf.netChangeInCash)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Waterfall Visualization */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Cash Flow Waterfall</h2>
            </div>
            <div className={styles.waterfallRow}>
              <div className={styles.waterfallRowHeader}>
                <span className={styles.waterfallLabel}>Operating Activities</span>
                <span className={`${styles.waterfallAmount} ${cfOps >= 0 ? styles.positive : styles.negative}`}>
                  {formatShort(cfOps)}
                </span>
              </div>
              <div className={styles.waterfallBarTrack}>
                <div
                  className={`${styles.waterfallBarFill} ${styles.waterfallBarGreen}`}
                  style={{ width: `${Math.min(Math.abs(cfOps) / maxCf * 100, 100)}%` }}
                >
                  {formatShort(cfOps)}
                </div>
              </div>
            </div>

            <div className={styles.waterfallRow}>
              <div className={styles.waterfallRowHeader}>
                <span className={styles.waterfallLabel}>Investing Activities</span>
                <span className={`${styles.waterfallAmount} ${(cf.cashFromInvesting) >= 0 ? styles.positive : styles.negative}`}>
                  {formatShort(cf.cashFromInvesting)}
                </span>
              </div>
              <div className={styles.waterfallBarTrack}>
                <div
                  className={`${styles.waterfallBarFill} ${styles.waterfallBarRed}`}
                  style={{ width: `${Math.min(Math.abs(cf.cashFromInvesting) / maxCf * 100, 100)}%` }}
                >
                  {formatShort(cf.cashFromInvesting)}
                </div>
              </div>
            </div>

            <div className={styles.waterfallRow}>
              <div className={styles.waterfallRowHeader}>
                <span className={styles.waterfallLabel}>Financing Activities</span>
                <span className={`${styles.waterfallAmount} ${(cf.cashFromFinancing) >= 0 ? styles.positive : styles.negative}`}>
                  {formatShort(cf.cashFromFinancing)}
                </span>
              </div>
              <div className={styles.waterfallBarTrack}>
                <div
                  className={`${styles.waterfallBarFill} ${styles.waterfallBarOrange}`}
                  style={{ width: `${Math.min(Math.abs(cf.cashFromFinancing) / maxCf * 100, 100)}%` }}
                >
                  {formatShort(cf.cashFromFinancing)}
                </div>
              </div>
            </div>

            <div className={styles.waterfallNetChange}>
              <span className={styles.waterfallNetLabel}>Net Change in Cash</span>
              <span className={styles.waterfallNetAmount}>{formatShort(cf.netChangeInCash)}</span>
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
