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

interface Adjustment {
  id: string
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
  category: string | null
  notes: string | null
  aiSuggested: boolean
}

const CATEGORY_STYLES: Record<string, { class: string; label: string }> = {
  OWNER_COMPENSATION: { class: 'catPillOwner', label: 'Owner Comp' },
  PERSONAL_EXPENSE: { class: 'catPillPersonal', label: 'Personal' },
  ONE_TIME: { class: 'catPillOnetime', label: 'One-Time' },
  RELATED_PARTY: { class: 'catPillOwner', label: 'Related Party' },
  NON_OPERATING: { class: 'catPillNormalize', label: 'Non-Operating' },
  DISCRETIONARY: { class: 'catPillPersonal', label: 'Discretionary' },
}

export default function EbitdaAdjustmentsPage() {
  const { selectedCompanyId } = useCompany()
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [ebitda, setEbitda] = useState<number>(0)
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
          // Get reported EBITDA from latest snapshot
          const adjustedEbitda = dashData.tier2.adjustedEbitda
          const addBacks = (adjData?.adjustments || [])
            .filter((a: Adjustment) => a.type === 'ADD_BACK')
            .reduce((s: number, a: Adjustment) => s + a.amount, 0)
          const deductions = (adjData?.adjustments || [])
            .filter((a: Adjustment) => a.type === 'DEDUCTION')
            .reduce((s: number, a: Adjustment) => s + a.amount, 0)
          setEbitda(adjustedEbitda - addBacks + deductions)
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
  const adjustedEbitda = ebitda + netAdjustments

  return (
    <>
      <TrackPageView page="/dashboard/financials/ebitda-adjustments" />

      <div className={styles.breadcrumb}>
        <Link href="/dashboard/financials">Financials</Link>
        <ChevronIcon />
        <span>EBITDA Adjustments</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1>EBITDA Adjustments</h1>
          <p>Normalization schedule for buyer underwriting</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/financials/edit" className={`${styles.btn} ${styles.btnSecondary}`}>
            Edit Adjustments
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
              {formatShort(ebitda)}
            </div>
          </div>
          <div className={styles.ebitdaBridgeArrow}>&rarr;</div>
          <div className={styles.ebitdaBridgeDelta}>
            <div className={styles.ebitdaBridgeDeltaValue}>+{formatShort(netAdjustments)}</div>
            <div className={styles.ebitdaBridgeDeltaDesc}>Net adjustments</div>
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
          Adjusted EBITDA normalizes your earnings by removing one-time expenses and owner perks that a buyer wouldn&apos;t inherit.
        </div>
      </div>

      {/* Explainer */}
      <div className={styles.explainerCard}>
        <div className={styles.explainerIcon}>
          <InfoIcon />
        </div>
        <div>
          <div className={styles.explainerTitle}>Why EBITDA Adjustments Matter</div>
          <div className={styles.explainerText}>
            Buyers value your business based on <strong>Adjusted EBITDA</strong> — your true recurring earnings after removing one-time costs, personal expenses,
            and above-market owner compensation. Each dollar of add-backs increases your valuation by your applied multiple.
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      {adjustments.length > 0 ? (
        <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <h2 className={styles.sectionTitle}>Normalization Schedule</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <table className={styles.adjTable}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {addBacks.length > 0 && (
                <>
                  <tr><td colSpan={4} className={`${styles.adjSectionHeader} ${styles.adjSectionAddbacks}`}>Add-Backs</td></tr>
                  {addBacks.map(adj => (
                    <tr key={adj.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{adj.description}</div>
                        {adj.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{adj.notes}</div>}
                      </td>
                      <td>
                        {adj.category && CATEGORY_STYLES[adj.category] && (
                          <span className={`${styles.catPill} ${styles[CATEGORY_STYLES[adj.category].class]}`}>
                            {CATEGORY_STYLES[adj.category].label}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.adjTypeBadge} ${styles.adjTypeBadgeAdd}`}>Add-Back</span>
                      </td>
                      <td className={`${styles.adjTableNum} ${styles.amtAdd}`}>+{formatCurrency(adj.amount)}</td>
                    </tr>
                  ))}
                  <tr className={styles.adjSubtotalRow}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>Subtotal Add-Backs</td>
                    <td className={`${styles.adjTableNum} ${styles.amtAdd}`}>+{formatCurrency(totalAddBacks)}</td>
                  </tr>
                </>
              )}

              {deductions.length > 0 && (
                <>
                  <tr><td colSpan={4} className={`${styles.adjSectionHeader} ${styles.adjSectionSubtractions}`}>Deductions</td></tr>
                  {deductions.map(adj => (
                    <tr key={adj.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{adj.description}</div>
                        {adj.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{adj.notes}</div>}
                      </td>
                      <td>
                        {adj.category && CATEGORY_STYLES[adj.category] && (
                          <span className={`${styles.catPill} ${styles[CATEGORY_STYLES[adj.category].class]}`}>
                            {CATEGORY_STYLES[adj.category].label}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.adjTypeBadge} ${styles.adjTypeBadgeSub}`}>Deduction</span>
                      </td>
                      <td className={`${styles.adjTableNum} ${styles.amtSub}`}>-{formatCurrency(adj.amount)}</td>
                    </tr>
                  ))}
                  <tr className={styles.adjSubtotalRow}>
                    <td colSpan={3} style={{ fontWeight: 700 }}>Subtotal Deductions</td>
                    <td className={`${styles.adjTableNum} ${styles.amtSub}`}>-{formatCurrency(totalDeductions)}</td>
                  </tr>
                </>
              )}

              {/* Summary */}
              <tr><td colSpan={4} className={`${styles.adjSectionHeader} ${styles.adjSectionSummary}`}>Summary</td></tr>
              <tr><td colSpan={3}>Reported EBITDA</td><td className={styles.adjTableNum}>{formatCurrency(ebitda)}</td></tr>
              <tr><td colSpan={3}>Net Adjustments</td><td className={`${styles.adjTableNum} ${styles.amtAdd}`}>+{formatCurrency(netAdjustments)}</td></tr>
              <tr className={styles.adjTotalRowTable}>
                <td colSpan={3}>Adjusted EBITDA</td>
                <td className={`${styles.adjTableNum} ${styles.amtAdd}`}>{formatCurrency(adjustedEbitda)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.card}>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No EBITDA adjustments yet. <Link href="/dashboard/financials/edit" className={styles.sectionLink}>Add adjustments &rarr;</Link>
          </p>
        </div>
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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}
