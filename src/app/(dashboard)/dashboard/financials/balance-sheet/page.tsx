'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/financials/financials-pages.module.css'

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

interface FinancialPeriod {
  id: string
  fiscalYear: number
  periodType: string
  balanceSheet: { id: string } | null
}

interface BalanceSheet {
  cash: number
  accountsReceivable: number
  inventory: number
  otherCurrentAssets: number
  totalCurrentAssets: number
  propertyPlantEquipment: number
  accumulatedDepreciation: number
  goodwill: number
  otherNonCurrentAssets: number
  totalAssets: number
  accountsPayable: number
  shortTermDebt: number
  currentPortionLongTermDebt: number
  accruedLiabilities: number
  totalCurrentLiabilities: number
  longTermDebt: number
  otherNonCurrentLiabilities: number
  totalLiabilities: number
  ownersEquity: number
  retainedEarnings: number
  totalEquity: number
}

export default function BalanceSheetPage() {
  const { selectedCompanyId } = useCompany()
  const [bs, setBs] = useState<BalanceSheet | null>(null)
  const [period, setPeriod] = useState<FinancialPeriod | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/financial-periods`)
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (cancelled || !data) return
        const annualWithBs = (data.periods || [])
          .filter((p: FinancialPeriod) => p.periodType === 'ANNUAL' && p.balanceSheet)
        const latest = annualWithBs[0]
        if (!latest) return

        setPeriod(latest)
        const res = await fetch(`/api/companies/${selectedCompanyId}/financial-periods/${latest.id}/balance-sheet`)
        if (res.ok && !cancelled) {
          const d = await res.json()
          if (d.balanceSheet) setBs(d.balanceSheet)
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

  const totalAssets = bs?.totalAssets || 0
  const totalLiabilities = bs?.totalLiabilities || 0
  const totalEquity = bs?.totalEquity || 0
  const liabPct = totalAssets > 0 ? (totalLiabilities / totalAssets * 100) : 0
  const eqPct = totalAssets > 0 ? (totalEquity / totalAssets * 100) : 0
  const currentRatio = bs && bs.totalCurrentLiabilities > 0
    ? (bs.totalCurrentAssets / bs.totalCurrentLiabilities) : null
  const debtToEquity = bs && totalEquity > 0
    ? (totalLiabilities / totalEquity) : null
  const workingCapital = bs ? (bs.totalCurrentAssets - bs.totalCurrentLiabilities) : null

  return (
    <>
      <TrackPageView page="/dashboard/financials/balance-sheet" />

      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>Balance Sheet</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1>
            Balance Sheet
            {period && (
              <span className={styles.asOfBadge}>
                <CalendarIcon /> As of Dec {period.fiscalYear}
              </span>
            )}
          </h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/financials/edit" className={`${styles.btn} ${styles.btnSecondary}`}>
            Edit Data
          </Link>
        </div>
      </div>

      {!bs ? (
        <div className={styles.card}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No balance sheet data available. <Link href="/dashboard/financials/edit" className={styles.sectionLink}>Enter data &rarr;</Link>
          </p>
        </div>
      ) : (
        <>
          {/* Balance Sheet Grid */}
          <div className={styles.bsGrid}>
            {/* Assets */}
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.bsCardHeader} style={{ padding: '16px 24px' }}>
                <div className={styles.bsCardHeaderLeft}>
                  <div className={`${styles.bsDot} ${styles.bsDotAssets}`} />
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>Assets</span>
                </div>
                <span className={styles.bsCardTotal} style={{ color: 'var(--accent)' }}>
                  {formatCurrency(totalAssets)}
                </span>
              </div>
              <table className={styles.dataTable}>
                <tbody>
                  <tr className={styles.rowHeader}><td colSpan={2}>Current Assets</td></tr>
                  <tr className={styles.rowIndent}><td>Cash & Equivalents</td><td>{formatCurrency(bs.cash)}</td></tr>
                  <tr className={styles.rowIndent}><td>Accounts Receivable</td><td>{formatCurrency(bs.accountsReceivable)}</td></tr>
                  <tr className={styles.rowIndent}><td>Inventory</td><td>{formatCurrency(bs.inventory)}</td></tr>
                  <tr className={styles.rowIndent}><td>Other Current Assets</td><td>{formatCurrency(bs.otherCurrentAssets)}</td></tr>
                  <tr className={styles.rowSubtotal}><td>Total Current Assets</td><td style={{ fontWeight: 700 }}>{formatCurrency(bs.totalCurrentAssets)}</td></tr>

                  <tr className={styles.rowHeader}><td colSpan={2}>Non-Current Assets</td></tr>
                  <tr className={styles.rowIndent}><td>Property, Plant & Equipment</td><td>{formatCurrency(bs.propertyPlantEquipment)}</td></tr>
                  <tr className={styles.rowIndent}><td>Accumulated Depreciation</td><td>{formatCurrency(bs.accumulatedDepreciation)}</td></tr>
                  <tr className={styles.rowIndent}><td>Goodwill</td><td>{formatCurrency(bs.goodwill)}</td></tr>
                  <tr className={styles.rowIndent}><td>Other Non-Current</td><td>{formatCurrency(bs.otherNonCurrentAssets)}</td></tr>

                  <tr className={styles.rowTotal}><td>Total Assets</td><td style={{ fontWeight: 700 }}>{formatCurrency(totalAssets)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Liabilities & Equity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Liabilities */}
              <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.bsCardHeader} style={{ padding: '16px 24px' }}>
                  <div className={styles.bsCardHeaderLeft}>
                    <div className={`${styles.bsDot} ${styles.bsDotLiabilities}`} />
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>Liabilities</span>
                  </div>
                  <span className={styles.bsCardTotal} style={{ color: 'var(--red)' }}>
                    {formatCurrency(totalLiabilities)}
                  </span>
                </div>
                <table className={styles.dataTable}>
                  <tbody>
                    <tr className={styles.rowIndent}><td>Accounts Payable</td><td>{formatCurrency(bs.accountsPayable)}</td></tr>
                    <tr className={styles.rowIndent}><td>Short-Term Debt</td><td>{formatCurrency(bs.shortTermDebt)}</td></tr>
                    <tr className={styles.rowIndent}><td>Current LTD</td><td>{formatCurrency(bs.currentPortionLongTermDebt)}</td></tr>
                    <tr className={styles.rowIndent}><td>Accrued Liabilities</td><td>{formatCurrency(bs.accruedLiabilities)}</td></tr>
                    <tr className={styles.rowSubtotal}><td>Total Current</td><td>{formatCurrency(bs.totalCurrentLiabilities)}</td></tr>
                    <tr className={styles.rowIndent}><td>Long-Term Debt</td><td>{formatCurrency(bs.longTermDebt)}</td></tr>
                    <tr className={styles.rowIndent}><td>Other Non-Current</td><td>{formatCurrency(bs.otherNonCurrentLiabilities)}</td></tr>
                    <tr className={styles.rowTotal}><td>Total Liabilities</td><td>{formatCurrency(totalLiabilities)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Equity */}
              <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.bsCardHeader} style={{ padding: '16px 24px' }}>
                  <div className={styles.bsCardHeaderLeft}>
                    <div className={`${styles.bsDot} ${styles.bsDotEquity}`} />
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>Equity</span>
                  </div>
                  <span className={styles.bsCardTotal} style={{ color: 'var(--green)' }}>
                    {formatCurrency(totalEquity)}
                  </span>
                </div>
                <table className={styles.dataTable}>
                  <tbody>
                    <tr className={styles.rowIndent}><td>Owner&apos;s Equity</td><td>{formatCurrency(bs.ownersEquity)}</td></tr>
                    <tr className={styles.rowIndent}><td>Retained Earnings</td><td>{formatCurrency(bs.retainedEarnings)}</td></tr>
                    <tr className={styles.rowTotal}><td>Total Equity</td><td>{formatCurrency(totalEquity)}</td></tr>
                  </tbody>
                </table>
                <div className={styles.equityCheck}>
                  <CheckIcon />
                  Assets ({formatCurrency(totalAssets)}) = Liabilities ({formatCurrency(totalLiabilities)}) + Equity ({formatCurrency(totalEquity)})
                </div>
              </div>
            </div>
          </div>

          {/* Capital Structure */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Capital Structure</h2>
            </div>
            <div className={styles.equityBar}>
              <div className={`${styles.equityBarSeg} ${styles.equityBarLiab}`} style={{ width: `${liabPct}%` }} />
              <div className={`${styles.equityBarSeg} ${styles.equityBarEq}`} style={{ width: `${eqPct}%` }} />
            </div>
            <div className={styles.equityBarLegend}>
              <div className={styles.equityBarLegendItem}>
                <div className={styles.equityBarLegendDot} style={{ background: 'var(--red)' }} />
                Liabilities ({liabPct.toFixed(0)}%)
              </div>
              <div className={styles.equityBarLegendItem}>
                <div className={styles.equityBarLegendDot} style={{ background: 'var(--green)' }} />
                Equity ({eqPct.toFixed(0)}%)
              </div>
            </div>
          </div>

          {/* Financial Ratios */}
          <div className={styles.ratiosGrid}>
            {currentRatio !== null && (
              <div className={styles.ratioItem}>
                <div className={styles.ratioLabel}>Current Ratio</div>
                <div className={`${styles.ratioValue} ${currentRatio >= 1.5 ? styles.ratioGood : currentRatio >= 1 ? styles.ratioOk : styles.ratioWarn}`}>
                  {currentRatio.toFixed(1)}x
                </div>
                <div className={styles.ratioBenchmark}>Target: &gt;1.5x</div>
                {currentRatio >= 1.5 && <div className={`${styles.ratioBadge} ${styles.ratioBadgeGood}`}>Healthy</div>}
                {currentRatio >= 1 && currentRatio < 1.5 && <div className={`${styles.ratioBadge} ${styles.ratioBadgeOk}`}>Adequate</div>}
              </div>
            )}
            {debtToEquity !== null && (
              <div className={styles.ratioItem}>
                <div className={styles.ratioLabel}>Debt / Equity</div>
                <div className={`${styles.ratioValue} ${debtToEquity <= 1 ? styles.ratioGood : debtToEquity <= 2 ? styles.ratioOk : styles.ratioWarn}`}>
                  {debtToEquity.toFixed(1)}x
                </div>
                <div className={styles.ratioBenchmark}>Target: &lt;1.0x</div>
              </div>
            )}
            {workingCapital !== null && (
              <div className={styles.ratioItem}>
                <div className={styles.ratioLabel}>Working Capital</div>
                <div className={`${styles.ratioValue} ${workingCapital >= 0 ? styles.ratioGood : styles.ratioWarn}`}>
                  {formatCurrency(workingCapital)}
                </div>
              </div>
            )}
            {totalAssets > 0 && (
              <div className={styles.ratioItem}>
                <div className={styles.ratioLabel}>Equity %</div>
                <div className={`${styles.ratioValue} ${eqPct >= 40 ? styles.ratioGood : styles.ratioOk}`}>
                  {eqPct.toFixed(0)}%
                </div>
                <div className={styles.ratioBenchmark}>of total assets</div>
              </div>
            )}
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
