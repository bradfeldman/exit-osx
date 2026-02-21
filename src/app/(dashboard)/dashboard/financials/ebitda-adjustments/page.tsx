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

type AdjType = 'ADD_BACK' | 'DEDUCTION'
type AdjStatus = 'ACCEPTED' | 'PENDING' | 'REJECTED'

interface Adjustment {
  id: string
  description: string
  amount: number
  type: AdjType
  category: string | null
  notes: string | null
  aiSuggested: boolean
  status?: AdjStatus
}

const CATEGORY_MAP: Record<string, { pillClass: string; label: string }> = {
  OWNER_COMPENSATION: { pillClass: 'catPillOwner', label: 'Owner Comp' },
  PERSONAL_EXPENSE:   { pillClass: 'catPillPersonal', label: 'Personal' },
  ONE_TIME:           { pillClass: 'catPillOnetime', label: 'One-Time' },
  RELATED_PARTY:      { pillClass: 'catPillOwner', label: 'Related Party' },
  NON_OPERATING:      { pillClass: 'catPillNormalize', label: 'Non-Operating' },
  DISCRETIONARY:      { pillClass: 'catPillPersonal', label: 'Discretionary' },
  NORMALIZE:          { pillClass: 'catPillNormalize', label: 'Normalize' },
}

function CategoryPill({ category }: { category: string | null }) {
  if (!category || !CATEGORY_MAP[category]) return null
  const { pillClass, label } = CATEGORY_MAP[category]
  return (
    <span className={`${styles.catPill} ${styles[pillClass as keyof typeof styles]}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status?: AdjStatus }) {
  if (!status) return null
  const cls =
    status === 'ACCEPTED' ? styles.statusBadgeAccepted :
    status === 'REJECTED' ? styles.statusBadgeRejected :
    styles.statusBadgePending
  const label = status === 'ACCEPTED' ? 'Accepted' : status === 'REJECTED' ? 'Rejected' : 'Pending'
  return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>
}

export default function EbitdaAdjustmentsPage() {
  const { selectedCompanyId } = useCompany()
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [reportedEbitda, setReportedEbitda] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/adjustments`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/dashboard`).then(r => r.ok ? r.json() : null),
    ])
      .then(([adjData, dashData]) => {
        if (cancelled) return
        if (adjData?.adjustments) setAdjustments(adjData.adjustments)
        if (dashData?.tier2?.adjustedEbitda) {
          const adjustedEbitda = dashData.tier2.adjustedEbitda
          const addBacks = (adjData?.adjustments || [])
            .filter((a: Adjustment) => a.type === 'ADD_BACK')
            .reduce((s: number, a: Adjustment) => s + a.amount, 0)
          const deductions = (adjData?.adjustments || [])
            .filter((a: Adjustment) => a.type === 'DEDUCTION')
            .reduce((s: number, a: Adjustment) => s + a.amount, 0)
          // Reported EBITDA = Adjusted EBITDA - add-backs + deductions
          setReportedEbitda(adjustedEbitda - addBacks + deductions)
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

  const addBacks = adjustments.filter(a => a.type === 'ADD_BACK')
  const deductions = adjustments.filter(a => a.type === 'DEDUCTION')
  const totalAddBacks = addBacks.reduce((s, a) => s + a.amount, 0)
  const totalDeductions = deductions.reduce((s, a) => s + a.amount, 0)
  const netAdjustments = totalAddBacks - totalDeductions
  const adjustedEbitda = reportedEbitda + netAdjustments

  // Implied valuation at 4x multiple for note text
  const impliedVal4x = adjustedEbitda * 4

  return (
    <>
      <TrackPageView page="/dashboard/financials/ebitda-adjustments" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>EBITDA Adjustments</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>EBITDA Adjustments</h1>
          <p>Normalization schedule for buyer underwriting</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <DownloadIcon />
            Export Schedule
          </button>
          <Link href="/dashboard/financials/edit" className={`${styles.btn} ${styles.btnPrimary}`}>
            <PlusIcon />
            Add Adjustment
          </Link>
        </div>
      </div>

      {/* EBITDA Bridge Hero */}
      <div className={styles.ebitdaHero}>
        <div className={styles.ebitdaHeroLabel}>EBITDA Normalization Bridge</div>
        <div className={styles.ebitdaBridge}>
          <div className={styles.ebitdaBridgeItem}>
            <div className={styles.ebitdaBridgeSublabel}>Reported EBITDA</div>
            <div className={`${styles.ebitdaBridgeValue} ${styles.ebitdaBridgeReported}`}>
              {formatShort(reportedEbitda)}
            </div>
          </div>

          <div className={styles.ebitdaBridgeArrow}>&rarr;</div>

          <div className={styles.ebitdaBridgeDelta}>
            <div className={styles.ebitdaBridgeSublabel}>Net Adjustments</div>
            <div className={`${styles.ebitdaBridgeValue} ${styles.ebitdaBridgeAdj}`} style={{ color: netAdjustments >= 0 ? '#4ade80' : '#fb923c', fontSize: '26px' }}>
              {netAdjustments >= 0 ? '+' : '\u2212'}{formatShort(Math.abs(netAdjustments))}
            </div>
            <div className={styles.ebitdaBridgeDeltaDesc}>
              Add-backs {formatShort(totalAddBacks)} &minus; Deductions {formatShort(totalDeductions)}
            </div>
          </div>

          <div className={styles.ebitdaBridgeArrow}>&rarr;</div>

          <div className={styles.ebitdaBridgeItem}>
            <div className={styles.ebitdaBridgeSublabel}>Adjusted EBITDA</div>
            <div className={`${styles.ebitdaBridgeValue} ${styles.ebitdaBridgeAdj}`}>
              {formatShort(adjustedEbitda)}
            </div>
          </div>
        </div>
        <div className={styles.ebitdaHeroNote}>
          Adjusted EBITDA reflects normalized, recurring earnings a new owner would experience. It is the figure buyers use to determine enterprise value.
          {impliedVal4x > 0 && (
            <> At a 4.0x multiple, this implies a valuation of <strong style={{ color: '#fff' }}>{formatShort(impliedVal4x)}</strong>.</>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div className={styles.aiInsight}>
        <div className={styles.aiInsightIcon}>
          <ChatIcon />
        </div>
        <div>
          <div className={styles.aiInsightTitle}>Exit OS AI &mdash; Adjustment Risk Assessment</div>
          <div className={styles.aiInsightText}>
            {adjustments.length > 0 ? (
              <>
                {(() => {
                  const pendingCount = adjustments.filter(a => !a.status || a.status === 'PENDING').length
                  return (
                    <>
                      {pendingCount > 0 && (
                        <><strong>{pendingCount} adjustment{pendingCount > 1 ? 's' : ''} in &ldquo;Pending&rdquo; status carry meaningful risk</strong> of buyer challenge.{' '}</>
                      )}
                      The <strong>owner compensation normalization</strong> is the highest-value and most scrutinized adjustment — ensure payroll records, a market comp analysis, and your CPA&apos;s sign-off are all in the data room before engaging buyers. Each dollar of defensible add-back increases your valuation by your applied multiple.
                    </>
                  )
                })()}
              </>
            ) : (
              <>No adjustments entered yet. EBITDA adjustments are one of the highest-impact levers in exit valuation — adding legitimate add-backs directly increases your implied enterprise value at the multiple applied.</>
            )}
          </div>
        </div>
      </div>

      {/* Explainer Card */}
      <div className={styles.explainerCard}>
        <div className={styles.explainerIcon}>
          <InfoCircleIcon />
        </div>
        <div>
          <div className={styles.explainerTitle}>Why EBITDA Adjustments Matter to Buyers</div>
          <div className={styles.explainerText}>
            Buyers normalize earnings to answer one question: <strong>what would this business earn if I owned it?</strong>{' '}
            Owner-operated businesses routinely run personal expenses through the P&amp;L, pay family members, and compensate the owner above or below market rate.{' '}
            Adjustments remove these distortions. <strong>Add-backs</strong> increase Adjusted EBITDA (they&apos;re legitimate expenses a buyer won&apos;t incur).{' '}
            <strong>Subtractions</strong> decrease it (they&apos;re costs the buyer will have to pay that the current owner isn&apos;t).{' '}
            Every adjustment must be defensible with documentation — buyers and their advisors will scrutinize each line.
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      {adjustments.length > 0 ? (
        <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div className={styles.normScheduleHeader}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <div>
                <div className={styles.sectionTitle}>Normalization Schedule</div>
                <div className={styles.normScheduleSubtitle}>
                  {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''} to reported EBITDA of {formatShort(reportedEbitda)}
                </div>
              </div>
            </div>
          </div>

          <table className={styles.adjTable}>
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Category</th>
                <th>Description</th>
                <th className="num" style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                <th style={{ width: '110px' }}>Status</th>
              </tr>
            </thead>
            <tbody>

              {/* Starting point row */}
              <tr style={{ background: 'var(--surface-secondary)' }}>
                <td colSpan={2} style={{ fontWeight: 700, fontSize: '14px', padding: '14px 16px' }}>Reported EBITDA</td>
                <td className="num" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--accent)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '14px 16px' }}>
                  {formatCurrency(reportedEbitda)}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '14px 16px' }}>As reported on P&amp;L</td>
              </tr>

              {/* ADD-BACKS section */}
              {addBacks.length > 0 && (
                <>
                  <tr className={`${styles.adjSectionHeader} ${styles.adjSectionAddbacks}`}>
                    <td colSpan={4}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', display: 'inline', marginRight: '6px', verticalAlign: '-1px' }}>
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                      Add-Backs (increases Adj. EBITDA) &mdash; Total: +{formatCurrency(totalAddBacks)}
                    </td>
                  </tr>
                  {addBacks.map(adj => (
                    <tr key={adj.id}>
                      <td>
                        <CategoryPill category={adj.category} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{adj.description}</div>
                        {adj.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{adj.notes}</div>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '13px 16px', verticalAlign: 'top' }}>
                        <span className={styles.amtAdd}>+{formatCurrency(adj.amount)}</span>
                      </td>
                      <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                        <StatusBadge status={adj.status} />
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.adjSubtotalRow}>
                    <td colSpan={2} style={{ fontSize: '13px', fontWeight: 700 }}>Total Add-Backs</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--green)', fontSize: '15px', padding: '13px 16px' }}>
                      +{formatCurrency(totalAddBacks)}
                    </td>
                    <td></td>
                  </tr>
                </>
              )}

              {/* DEDUCTIONS section */}
              {deductions.length > 0 && (
                <>
                  <tr className={`${styles.adjSectionHeader} ${styles.adjSectionSubtractions}`}>
                    <td colSpan={4}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', display: 'inline', marginRight: '6px', verticalAlign: '-1px' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                      Subtractions (decreases Adj. EBITDA) &mdash; Total: &minus;{formatCurrency(totalDeductions)}
                    </td>
                  </tr>
                  {deductions.map(adj => (
                    <tr key={adj.id}>
                      <td>
                        <CategoryPill category={adj.category} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{adj.description}</div>
                        {adj.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{adj.notes}</div>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '13px 16px', verticalAlign: 'top' }}>
                        <span className={styles.amtSub}>&minus;{formatCurrency(adj.amount)}</span>
                      </td>
                      <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                        <StatusBadge status={adj.status} />
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.adjSubtotalRow}>
                    <td colSpan={2} style={{ fontSize: '13px', fontWeight: 700 }}>Total Subtractions</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--red)', fontSize: '15px', padding: '13px 16px' }}>
                      &minus;{formatCurrency(totalDeductions)}
                    </td>
                    <td></td>
                  </tr>
                </>
              )}

              {/* Summary section */}
              <tr className={`${styles.adjSectionHeader} ${styles.adjSectionSummary}`}>
                <td colSpan={4}>Net Adjustment &amp; Adjusted EBITDA</td>
              </tr>
              <tr style={{ background: 'var(--surface-secondary)' }}>
                <td colSpan={2} style={{ fontWeight: 600, padding: '13px 16px' }}>Net Adjustment</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '15px', color: netAdjustments >= 0 ? 'var(--green)' : 'var(--red)', padding: '13px 16px' }}>
                  {netAdjustments >= 0 ? '+' : '\u2212'}{formatCurrency(Math.abs(netAdjustments))}
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '13px 16px' }}>
                  Add-backs (+{formatShort(totalAddBacks)}) minus deductions (&minus;{formatShort(totalDeductions)})
                </td>
              </tr>
              <tr className={styles.adjTotalRowTable}>
                <td colSpan={2} style={{ fontSize: '15px', letterSpacing: '-0.2px' }}>Adjusted EBITDA</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '18px', color: 'var(--green)', fontWeight: 800, padding: '13px 16px' }}>
                  {formatCurrency(adjustedEbitda)}
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '13px 16px' }}>
                  {impliedVal4x > 0 && <>Implied valuation at 4.0x: <strong>{formatShort(impliedVal4x)}</strong></>}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.card}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No EBITDA adjustments yet.{' '}
            <Link href="/dashboard/financials/edit" className={styles.sectionLink}>
              Add adjustments &rarr;
            </Link>
          </p>
        </div>
      )}

      {/* Benchmark Section */}
      <div className={styles.card}>
        <div className={styles.sectionHeader} style={{ marginBottom: '20px' }}>
          <div>
            <div className={styles.sectionTitle}>EBITDA Margin Benchmarks</div>
            <div className={styles.sectionSubtitle}>
              Adjusted EBITDA margins &mdash; industry peers, recent transactions
            </div>
          </div>
        </div>
        <div className={styles.benchmarkGrid}>
          {/* Company highlight */}
          <div className={`${styles.benchmarkItem} ${styles.benchmarkHighlight}`}>
            <div className={styles.benchmarkCo}>Your Business</div>
            <div className={styles.benchmarkPct}>
              {reportedEbitda > 0
                ? `${((adjustedEbitda / reportedEbitda) * 100 > 0 ? (adjustedEbitda / reportedEbitda) * 100 : 0).toFixed(1)}%`
                : '—'}
            </div>
            <div className={styles.benchmarkLabel}>Adj. EBITDA / Revenue</div>
          </div>
          {/* Industry benchmarks — TODO: wire to industry data */}
          <div className={styles.benchmarkItem}>
            <div className={styles.benchmarkCo}>Industry Bottom Quartile</div>
            <div className={styles.benchmarkPct}>10.5%</div>
            <div className={styles.benchmarkLabel}>25th percentile</div>
          </div>
          <div className={styles.benchmarkItem}>
            <div className={styles.benchmarkCo}>Industry Median</div>
            <div className={styles.benchmarkPct}>14.2%</div>
            <div className={styles.benchmarkLabel}>50th percentile</div>
          </div>
          <div className={styles.benchmarkItem}>
            <div className={styles.benchmarkCo}>Industry Top Quartile</div>
            <div className={styles.benchmarkPct}>19.8%</div>
            <div className={styles.benchmarkLabel}>75th percentile</div>
          </div>
          {/* TODO: wire to API → /api/companies/[id]/valuation for industry-specific benchmarks */}
        </div>
        <div className={styles.benchmarkNote}>
          <strong>Above median margins</strong> support higher valuation multiples. Businesses in the top quartile (19.8%+) can command 4.5x or higher. Each dollar of defensible add-back directly increases enterprise value at your applied multiple.
        </div>
      </div>
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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

function InfoCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
