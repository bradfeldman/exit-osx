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

function pct(part: number, total: number): string {
  if (total === 0) return '—'
  return `${((part / total) * 100).toFixed(1)}%`
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
  const quickRatio = bs && bs.totalCurrentLiabilities > 0
    ? ((bs.cash + bs.accountsReceivable) / bs.totalCurrentLiabilities) : null
  const debtToEquity = bs && totalEquity > 0
    ? (totalLiabilities / totalEquity) : null
  const workingCapital = bs ? (bs.totalCurrentAssets - bs.totalCurrentLiabilities) : null
  const nonCurrentAssets = bs
    ? (bs.propertyPlantEquipment + bs.accumulatedDepreciation + bs.goodwill + bs.otherNonCurrentAssets)
    : 0
  const longTermLiabilities = bs ? (bs.longTermDebt + bs.otherNonCurrentLiabilities) : 0

  const asOfLabel = period ? `Dec ${period.fiscalYear}` : 'Latest'

  return (
    <>
      <TrackPageView page="/dashboard/financials/balance-sheet" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>Balance Sheet</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>
            Balance Sheet
            {period && (
              <span className={styles.asOfBadge}>
                <CalendarIcon />
                As of {asOfLabel}
              </span>
            )}
          </h1>
          <p>Unaudited financial position</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <DownloadIcon />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date selector — TODO: wire to period list for switching */}
      {period && (
        <div className={styles.controlsRow}>
          <div className={styles.tabRow}>
            <button className={`${styles.tabBtn} ${styles.tabBtnActive}`} type="button">
              Dec {period.fiscalYear}
            </button>
            {/* TODO: wire to additional periods */}
          </div>
        </div>
      )}

      {/* AI Insight */}
      <div className={styles.aiInsight}>
        <div className={styles.aiInsightIcon}>
          <ChatIcon />
        </div>
        <div>
          <div className={styles.aiInsightTitle}>Exit OS AI &mdash; Balance Sheet Analysis</div>
          <div className={styles.aiInsightText}>
            {bs ? (
              <>
                Your balance sheet shows a company in{' '}
                <strong>
                  {currentRatio && currentRatio >= 1.5 ? 'solid' : 'adequate'} financial shape
                </strong>{' '}
                heading into a transaction.
                {currentRatio !== null && (
                  <> The <strong>{currentRatio.toFixed(2)}x current ratio</strong> signals{' '}
                  {currentRatio >= 1.5 ? 'strong' : 'adequate'} short-term liquidity — buyers and lenders will view this{' '}
                  {currentRatio >= 1.5 ? 'favorably' : 'as manageable'}.</>
                )}
                {' '}Your <strong>{formatShort(bs.accountsReceivable)} accounts receivable</strong> should be aged — buyers will discount any AR older than 90 days.
                {debtToEquity !== null && (
                  <> Debt-to-equity of <strong>{debtToEquity.toFixed(2)}x</strong> is{' '}
                  {debtToEquity <= 1 ? 'manageable and should not create financing obstacles' : 'a focal point for buyer lenders'}.</>
                )}
              </>
            ) : (
              <>No balance sheet data entered yet. Add your balance sheet figures to unlock AI-powered analysis.</>
            )}
          </div>
        </div>
      </div>

      {!bs ? (
        <div className={styles.card}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No balance sheet data available.{' '}
            <Link href="/dashboard/financials/edit" className={styles.sectionLink}>
              Enter data &rarr;
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* Balance Sheet Grid */}
          <div className={styles.bsGrid}>

            {/* ASSETS */}
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.bsCardHeaderFull}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent)', flexShrink: 0 }} />
                <div className={styles.bsCardTitle}>Assets</div>
                <div className={styles.bsCardTotalFull} style={{ color: 'var(--accent)' }}>
                  {formatCurrency(totalAssets)}
                </div>
              </div>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Amount</th>
                    <th className={styles.colPct}>% Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles.rowGroup}>
                    <td>Current Assets</td>
                    <td>{formatCurrency(bs.totalCurrentAssets)}</td>
                    <td>{pct(bs.totalCurrentAssets, totalAssets)}</td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Cash &amp; Cash Equivalents</td>
                    <td>{formatCurrency(bs.cash)}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.cash, totalAssets)}</td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Accounts Receivable</td>
                    <td>{formatCurrency(bs.accountsReceivable)}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.accountsReceivable, totalAssets)}</td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Inventory</td>
                    <td>{formatCurrency(bs.inventory)}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.inventory, totalAssets)}</td>
                  </tr>
                  {bs.otherCurrentAssets > 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Other Current Assets</td>
                      <td>{formatCurrency(bs.otherCurrentAssets)}</td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.otherCurrentAssets, totalAssets)}</td>
                    </tr>
                  )}
                  <tr className={styles.rowTotalSub}>
                    <td>Total Current Assets</td>
                    <td>{formatCurrency(bs.totalCurrentAssets)}</td>
                    <td></td>
                  </tr>

                  <tr className={styles.rowSpacer}><td colSpan={3}></td></tr>

                  <tr className={styles.rowGroup}>
                    <td>Non-Current Assets</td>
                    <td>{formatCurrency(nonCurrentAssets)}</td>
                    <td>{pct(nonCurrentAssets, totalAssets)}</td>
                  </tr>
                  <tr className={styles.rowIndent}>
                    <td>Property, Plant &amp; Equipment (net)</td>
                    <td>{formatCurrency(bs.propertyPlantEquipment)}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.propertyPlantEquipment, totalAssets)}</td>
                  </tr>
                  {bs.accumulatedDepreciation !== 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Accumulated Depreciation</td>
                      <td>{formatCurrency(bs.accumulatedDepreciation)}</td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.accumulatedDepreciation, totalAssets)}</td>
                    </tr>
                  )}
                  {bs.goodwill > 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Goodwill</td>
                      <td>{formatCurrency(bs.goodwill)}</td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.goodwill, totalAssets)}</td>
                    </tr>
                  )}
                  {bs.otherNonCurrentAssets > 0 && (
                    <tr className={styles.rowIndent}>
                      <td>Other Long-Term Assets</td>
                      <td>{formatCurrency(bs.otherNonCurrentAssets)}</td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.otherNonCurrentAssets, totalAssets)}</td>
                    </tr>
                  )}
                  <tr className={styles.rowTotalSub}>
                    <td>Total Non-Current Assets</td>
                    <td>{formatCurrency(nonCurrentAssets)}</td>
                    <td></td>
                  </tr>

                  <tr className={styles.rowSpacer}><td colSpan={3}></td></tr>

                  <tr className={styles.rowTotal}>
                    <td>TOTAL ASSETS</td>
                    <td>{formatCurrency(totalAssets)}</td>
                    <td>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* LIABILITIES & EQUITY column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Liabilities */}
              <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.bsCardHeaderFull}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--red)', flexShrink: 0 }} />
                  <div className={styles.bsCardTitle}>Liabilities</div>
                  <div className={styles.bsCardTotalFull} style={{ color: 'var(--red)' }}>
                    {formatCurrency(totalLiabilities)}
                  </div>
                </div>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Amount</th>
                      <th className={styles.colPct}>% Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={styles.rowGroup}>
                      <td>Current Liabilities</td>
                      <td>{formatCurrency(bs.totalCurrentLiabilities)}</td>
                      <td>{pct(bs.totalCurrentLiabilities, totalLiabilities)}</td>
                    </tr>
                    <tr className={styles.rowIndent}>
                      <td>Accounts Payable</td>
                      <td>{formatCurrency(bs.accountsPayable)}</td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.accountsPayable, totalLiabilities)}</td>
                    </tr>
                    {bs.accruedLiabilities > 0 && (
                      <tr className={styles.rowIndent}>
                        <td>Accrued Liabilities</td>
                        <td>{formatCurrency(bs.accruedLiabilities)}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.accruedLiabilities, totalLiabilities)}</td>
                      </tr>
                    )}
                    {bs.shortTermDebt > 0 && (
                      <tr className={styles.rowIndent}>
                        <td>Short-Term Debt</td>
                        <td>{formatCurrency(bs.shortTermDebt)}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.shortTermDebt, totalLiabilities)}</td>
                      </tr>
                    )}
                    {bs.currentPortionLongTermDebt > 0 && (
                      <tr className={styles.rowIndent}>
                        <td>Current Portion of Long-Term Debt</td>
                        <td>{formatCurrency(bs.currentPortionLongTermDebt)}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.currentPortionLongTermDebt, totalLiabilities)}</td>
                      </tr>
                    )}
                    <tr className={styles.rowTotalSub}>
                      <td>Total Current Liabilities</td>
                      <td>{formatCurrency(bs.totalCurrentLiabilities)}</td>
                      <td></td>
                    </tr>

                    <tr className={styles.rowSpacer}><td colSpan={3}></td></tr>

                    <tr className={styles.rowGroup}>
                      <td>Long-Term Liabilities</td>
                      <td>{formatCurrency(longTermLiabilities)}</td>
                      <td>{pct(longTermLiabilities, totalLiabilities)}</td>
                    </tr>
                    {bs.longTermDebt > 0 && (
                      <tr className={styles.rowIndent}>
                        <td>Long-Term Debt</td>
                        <td>{formatCurrency(bs.longTermDebt)}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.longTermDebt, totalLiabilities)}</td>
                      </tr>
                    )}
                    {bs.otherNonCurrentLiabilities > 0 && (
                      <tr className={styles.rowIndent}>
                        <td>Other Long-Term Liabilities</td>
                        <td>{formatCurrency(bs.otherNonCurrentLiabilities)}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{pct(bs.otherNonCurrentLiabilities, totalLiabilities)}</td>
                      </tr>
                    )}
                    <tr className={styles.rowTotalSub}>
                      <td>Total Long-Term Liabilities</td>
                      <td>{formatCurrency(longTermLiabilities)}</td>
                      <td></td>
                    </tr>

                    <tr className={styles.rowSpacer}><td colSpan={3}></td></tr>

                    <tr className={styles.rowTotal}>
                      <td>TOTAL LIABILITIES</td>
                      <td>{formatCurrency(totalLiabilities)}</td>
                      <td>{pct(totalLiabilities, totalAssets)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Equity */}
              <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.bsCardHeaderFull}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--green)', flexShrink: 0 }} />
                  <div className={styles.bsCardTitle}>Owner&apos;s Equity</div>
                  <div className={styles.bsCardTotalFull} style={{ color: 'var(--green)' }}>
                    {formatCurrency(totalEquity)}
                  </div>
                </div>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={styles.rowIndent}>
                      <td>Owner&apos;s Equity / Paid-In Capital</td>
                      <td>{formatCurrency(bs.ownersEquity)}</td>
                    </tr>
                    <tr className={styles.rowIndent}>
                      <td>Retained Earnings</td>
                      <td>{formatCurrency(bs.retainedEarnings)}</td>
                    </tr>
                    <tr className={styles.rowSpacer}><td colSpan={2}></td></tr>
                    <tr className={styles.rowTotal}>
                      <td>TOTAL EQUITY</td>
                      <td>{formatCurrency(totalEquity)}</td>
                    </tr>
                  </tbody>
                </table>
                {/* Balance check */}
                <div className={styles.balanceCheck}>
                  <div className={styles.balanceCheckText}>
                    <CheckCircleIcon />
                    Balance check: Assets ({formatShort(totalAssets)}) = Liabilities ({formatShort(totalLiabilities)}) + Equity ({formatShort(totalEquity)})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Capital Structure */}
          <div className={styles.capitalStructureCard}>
            <div className={styles.sectionHeader} style={{ marginBottom: '16px' }}>
              <div>
                <div className={styles.sectionTitle}>Capital Structure</div>
                <div className={styles.sectionSubtitle}>Liabilities vs. equity composition of total assets</div>
              </div>
            </div>
            <div className={styles.equityBar}>
              <div className={`${styles.equityBarSeg} ${styles.equityBarLiab}`} style={{ width: `${liabPct}%` }} />
              <div className={`${styles.equityBarSeg} ${styles.equityBarEq}`} style={{ width: `${eqPct}%` }} />
            </div>
            <div className={styles.equityBarLegend} style={{ marginTop: '8px' }}>
              <div className={styles.equityBarLegendItem}>
                <div className={styles.equityBarLegendDot} style={{ background: 'var(--red)' }} />
                <span>Total Liabilities &mdash; {formatShort(totalLiabilities)} ({liabPct.toFixed(1)}%)</span>
              </div>
              <div className={styles.equityBarLegendItem}>
                <div className={styles.equityBarLegendDot} style={{ background: 'var(--green)' }} />
                <span>Owner&apos;s Equity &mdash; {formatShort(totalEquity)} ({eqPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Key Financial Ratios */}
          <div className={styles.ratiosCard}>
            <div className={styles.sectionHeader} style={{ marginBottom: '20px' }}>
              <div>
                <div className={styles.sectionTitle}>Key Financial Ratios</div>
                <div className={styles.sectionSubtitle}>
                  As of {asOfLabel} &mdash; benchmarked to industry peers
                </div>
              </div>
            </div>
            <div className={styles.ratiosCardGrid}>
              {currentRatio !== null && (
                <div className={styles.ratioItemCard}>
                  <div className={styles.ratioItemLabel}>Current Ratio</div>
                  <div className={`${styles.ratioItemValue} ${currentRatio >= 1.5 ? styles.ratioGood : currentRatio >= 1 ? styles.ratioOk : styles.ratioWarn}`}>
                    {currentRatio.toFixed(2)}x
                  </div>
                  <div className={styles.ratioItemBenchmark}>Industry avg: 1.4x</div>
                  {currentRatio >= 1.5 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeGood}`}>Strong</span>
                  )}
                  {currentRatio >= 1 && currentRatio < 1.5 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeOk}`}>Adequate</span>
                  )}
                </div>
              )}
              {quickRatio !== null && (
                <div className={styles.ratioItemCard}>
                  <div className={styles.ratioItemLabel}>Quick Ratio</div>
                  <div className={`${styles.ratioItemValue} ${quickRatio >= 1 ? styles.ratioGood : quickRatio >= 0.7 ? styles.ratioOk : styles.ratioWarn}`}>
                    {quickRatio.toFixed(2)}x
                  </div>
                  <div className={styles.ratioItemBenchmark}>Industry avg: 1.1x</div>
                  {quickRatio >= 1 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeGood}`}>Strong</span>
                  )}
                  {quickRatio >= 0.7 && quickRatio < 1 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeOk}`}>Adequate</span>
                  )}
                </div>
              )}
              {debtToEquity !== null && (
                <div className={styles.ratioItemCard}>
                  <div className={styles.ratioItemLabel}>Debt-to-Equity</div>
                  <div className={`${styles.ratioItemValue} ${debtToEquity <= 1 ? styles.ratioGood : debtToEquity <= 2 ? styles.ratioOk : styles.ratioWarn}`}>
                    {debtToEquity.toFixed(2)}x
                  </div>
                  <div className={styles.ratioItemBenchmark}>Industry avg: 1.2x</div>
                  {debtToEquity <= 1.2 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeGood}`}>Healthy</span>
                  )}
                  {debtToEquity > 1.2 && debtToEquity <= 2 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeOk}`}>Elevated</span>
                  )}
                </div>
              )}
              {workingCapital !== null && (
                <div className={styles.ratioItemCard}>
                  <div className={styles.ratioItemLabel}>Working Capital</div>
                  <div className={`${styles.ratioItemValue} ${workingCapital >= 0 ? styles.ratioGood : styles.ratioWarn}`}>
                    {formatShort(workingCapital)}
                  </div>
                  <div className={styles.ratioItemBenchmark}>Current assets minus current liabilities</div>
                  {workingCapital >= 0 && (
                    <span className={`${styles.ratioItemBadge} ${styles.ratioItemBadgeGood}`}>Positive</span>
                  )}
                </div>
              )}
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
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

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
