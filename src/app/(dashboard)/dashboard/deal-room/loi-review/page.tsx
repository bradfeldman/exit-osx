'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/deal-room/deal-room.module.css'

interface Offer {
  buyerId: string
  companyName: string
  buyerType: string
  offerType: 'IOI' | 'LOI'
  amount: number
  deadline: string | null
}

interface DealRoomData {
  activation: {
    isActivated: boolean
  }
  offers: Offer[]
}

const LOI_TERMS = [
  { label: 'Purchase Price', value: '$7,800,000', sub: 'Total enterprise value', col: 'odd' },
  { label: 'Multiple', value: '4.0x Adjusted EBITDA', sub: 'Based on $1,950,000 normalized EBITDA', col: 'even' },
  { label: 'Deal Structure', value: 'Asset Purchase', sub: 'Buyer acquires assets and specified liabilities', col: 'odd' },
  { label: 'Cash at Close', value: '$6,240,000', sub: '80% of purchase price — wire at closing', col: 'even', color: 'var(--green)' },
  { label: 'Seller Note', value: '$1,170,000', sub: '15% — 3-year term, 5% interest, monthly payments', col: 'odd' },
  { label: 'Earnout', value: '$390,000', sub: '5% — tied to EBITDA targets, 2-year period', col: 'even', color: 'var(--orange)' },
  { label: 'Due Diligence Period', value: '60 Days', sub: 'From LOI execution through financial and legal review', col: 'odd' },
  { label: 'Transition Period', value: '12 Months', sub: 'Owner remains as paid consultant at current compensation', col: 'even' },
  { label: 'Non-Compete', value: '3 Years, 100-Mile Radius', sub: 'HVAC services and related trades', col: 'odd', color: 'var(--orange)' },
  { label: 'Employee Protection', value: 'All Retained — 12 Months', sub: 'Full team retained with comparable compensation', col: 'even', color: 'var(--green)' },
  { label: 'Closing Target', value: 'May 15, 2026', sub: 'Approx. 90 days from LOI execution', col: 'odd', noBorder: true },
  { label: 'Exclusivity Period', value: '60 Days', sub: 'No-shop provision during due diligence', col: 'even', noBorder: true },
]

const COUNTER_POINTS = [
  {
    num: 1,
    text: <><strong>Counter at $8,100,000 (4.15x)</strong> — A $300K increase is a realistic ask given your EBITDA trajectory and current market conditions. Frame it around trailing 12-month performance, not the buyer&apos;s normalized figure.</>,
  },
  {
    num: 2,
    text: <><strong>Request revenue-based earnout triggers</strong> — Shift the $390K earnout from EBITDA to gross revenue targets. Revenue is harder for a buyer to manipulate post-close through cost allocation.</>,
  },
  {
    num: 3,
    text: <><strong>Negotiate non-compete to 2 years</strong> — Industry standard is 2 years. The 3-year ask is above market. A 2-year agreement with a geographic carve-out for residential-only work is defensible.</>,
  },
  {
    num: 4,
    text: <><strong>Increase cash at close to 85%</strong> — Reduce the seller note from $1.17M to $780K (10%) by pushing the earnout to 5% and increasing upfront cash. This de-risks your proceeds.</>,
  },
  {
    num: 5,
    text: <><strong>Add an acceleration clause to the seller note</strong> — If the buyer sells your company within 18 months of closing, the full note balance should become immediately due. Protects against a quick flip.</>,
  },
]

export default function LOIReviewPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<DealRoomData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room`)
      if (!res.ok) throw new Error('Failed to fetch deal room data')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    let cancelled = false
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(null)
    fetch(`/api/companies/${selectedCompanyId}/deal-room`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch deal room data')
        return res.json()
      })
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading LOI data...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div className={styles.emptyStateTitle}>Could not load LOI data</div>
        <div className={styles.emptyStateText}>{error ?? 'Something went wrong. Please try again.'}</div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={fetchData}>Try Again</button>
      </div>
    )
  }

  const loiOffer = data.offers?.find(o => o.offerType === 'LOI')

  if (!loiOffer) {
    return (
      <>
        <TrackPageView page="deal-room/loi-review" />
        <div className={styles.breadcrumb}>
          <Link href="/dashboard/deal-room">Deal Room</Link>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span>LOI Review</span>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className={styles.emptyStateTitle}>No LOI Received Yet</div>
          <div className={styles.emptyStateText}>
            No Letter of Intent has been received yet. Continue progressing buyer conversations to receive your first LOI.
            Once an LOI arrives, you&apos;ll be able to review terms, compare against your valuation, and access counter-offer strategy.
          </div>
          <Link href="/dashboard/deal-room" className={`${styles.btn} ${styles.btnPrimary}`}>
            Back to Deal Room
          </Link>
        </div>
      </>
    )
  }

  const buyerName = loiOffer.companyName
  const deadline = loiOffer.deadline
    ? new Date(loiOffer.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const daysRemaining = loiOffer.deadline
    ? Math.max(0, Math.ceil((new Date(loiOffer.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <>
      <TrackPageView page="deal-room/loi-review" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>LOI Review — {buyerName}</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>LOI Review</h1>
          <p>{buyerName} &mdash; Letter of Intent{deadline ? ` received — expires ${deadline}` : ' received'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download LOI PDF
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share with Advisor
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={styles.statusBanner}>
        <div className={styles.statusBannerLeft}>
          <div className={styles.statusBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            LOI Received
          </div>
          <div className={styles.statusBannerText}>
            <h2>Active Letter of Intent from {buyerName}</h2>
            <p>Review period is active. Analyze terms, discuss with your advisor, and respond before the deadline.</p>
          </div>
        </div>
        {daysRemaining !== null && (
          <div className={styles.countdownPill}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: 'var(--purple)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <div className={styles.countdownNum}>{daysRemaining}</div>
              <div className={styles.countdownLabel}>days remaining{deadline ? ` — Expires ${deadline}` : ''}</div>
            </div>
          </div>
        )}
      </div>

      {/* LOI Key Terms */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>LOI Key Terms</div>
            <div className={styles.sectionSubtitle}>Summary of material terms as presented by {buyerName}</div>
          </div>
          <span style={{ fontSize: 12, background: 'var(--surface-secondary)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            Non-binding
          </span>
        </div>
        <div className={styles.termsGrid}>
          {LOI_TERMS.map((term, i) => (
            <div
              key={i}
              className={[
                styles.termCell,
                term.col === 'odd' ? styles.termCellOdd : styles.termCellEven,
                term.noBorder ? styles.termCellNoBorder : '',
              ].join(' ')}
            >
              <div className={styles.termLabel}>{term.label}</div>
              <div className={styles.termValue} style={term.color ? { color: term.color } : {}}>
                {term.value}
              </div>
              <div className={styles.termSub}>{term.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Valuation Comparison */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Offer vs. Valuation Estimate</div>
            <div className={styles.sectionSubtitle}>How the LOI compares to your independent valuation</div>
          </div>
        </div>
        <div className={styles.valCompare}>
          <div>
            <div className={styles.valBarGroup}>
              <div className={styles.valBarLabelRow}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Your Valuation Estimate</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>$8,200,000</span>
              </div>
              <div className={styles.valBarTrack}>
                <div className={`${styles.valBarFill} ${styles.valBarFillGreen}`} style={{ width: '100%' }} />
              </div>
              <div className={styles.valBarNote}>Based on 4.1x blended multiple — EBITDA + DCF</div>
            </div>
            <div className={styles.valBarGroup} style={{ marginBottom: 0 }}>
              <div className={styles.valBarLabelRow}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{buyerName} Offer</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--orange)' }}>$7,800,000</span>
              </div>
              <div className={styles.valBarTrack}>
                <div className={`${styles.valBarFill} ${styles.valBarFillOrange}`} style={{ width: '95%' }} />
              </div>
              <div className={styles.valBarNote}>4.0x EBITDA — standard PE platform acquisition</div>
            </div>
            <div className={styles.valBarContext}>
              The $400K gap is within typical negotiation range. PE buyers routinely open 5&ndash;8% below asking.
              A well-structured counter may close part of the gap, particularly on the earnout structure.
            </div>
          </div>
          <div className={styles.gapCallout}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Valuation Gap
            </div>
            <div className={styles.gapNum}>5.1%</div>
            <div className={styles.gapLabel}>below your estimate</div>
            <div className={styles.gapAmount}>$400,000 difference</div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,149,0,0.2)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Implied Cash at Close</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>$6,240,000</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>80% of offer price</div>
            </div>
          </div>
        </div>
      </div>

      {/* Term Analysis */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Term Analysis</div>
            <div className={styles.sectionSubtitle}>AI-assisted assessment based on your goals and market comparables</div>
          </div>
        </div>
        <div className={styles.analysisGrid}>
          {/* Strengths */}
          <div className={`${styles.analysisCard} ${styles.analysisCardGreen}`}>
            <div className={styles.analysisCardHeader}>
              <div className={styles.analysisCardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className={styles.analysisCardTitle}>Strengths</div>
            </div>
            {[
              'Strong 80% cash at close provides certainty — well above the 65–70% typical for PE add-ons',
              'Full employee retention for 12 months protects your team and legacy',
              '60-day due diligence period is reasonable — gives you time to prepare without dragging',
              'Seller note at 5% interest is market-rate and structured fairly',
            ].map((item, i) => (
              <div key={i} className={styles.analysisItem}>
                <div className={styles.analysisDot} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Concerns */}
          <div className={`${styles.analysisCard} ${styles.analysisCardOrange}`}>
            <div className={styles.analysisCardHeader}>
              <div className={styles.analysisCardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className={styles.analysisCardTitle}>Concerns</div>
            </div>
            {[
              'Offer is $400K below your valuation estimate — gap warrants a structured counter',
              '3-year non-compete is longer than the 2-year market standard',
              'Earnout tied to EBITDA gives buyer more leverage through post-close expense control',
              'Asset purchase structure may have tax implications — consult your CPA on allocation',
            ].map((item, i) => (
              <div key={i} className={styles.analysisItem}>
                <div className={styles.analysisDot} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Deal-Breakers */}
          <div className={`${styles.analysisCard} ${styles.analysisCardRed}`}>
            <div className={styles.analysisCardHeader}>
              <div className={styles.analysisCardIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div className={styles.analysisCardTitle}>Deal-Breakers to Watch</div>
            </div>
            <div style={{ paddingTop: 8 }}>
              <div className={styles.noneTag}>None identified in current LOI terms</div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                The LOI as presented does not contain any terms that would be considered non-standard or unacceptable.
                Watch for representation and warranty insurance requirements during due diligence, which could affect net proceeds.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Coach Counter-Offer Strategy */}
      <div className={styles.aiCoachCard} id="ai-insight">
        <div className={styles.aiCoachHeader}>
          <div className={styles.aiCoachAvatar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div>
            <div className={styles.aiCoachName}>AI Coach — Counter-Offer Strategy</div>
            <div className={styles.aiCoachSubtitle}>Based on your goals, market data, and comparable transactions</div>
          </div>
        </div>
        <ul className={styles.counterPoints}>
          {COUNTER_POINTS.map((pt) => (
            <li key={pt.num} className={styles.counterPoint}>
              <div className={styles.counterNum}>{pt.num}</div>
              <div className={styles.counterText}>{pt.text}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionRow}>
        <span className={styles.actionRowLabel}>Your decision:</span>
        <button className={`${styles.btn} ${styles.btnSuccess}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Accept LOI
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Draft Counter-Offer
        </button>
        <div className={styles.actionDivider} />
        <button className={`${styles.btn} ${styles.btnDanger}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Decline
        </button>
        <div className={styles.actionDivider} />
        <button className={`${styles.btn} ${styles.btnPurple}`} style={{ marginLeft: 'auto' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Ask AI Coach
        </button>
      </div>

      {/* Documents */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Documents</div>
            <div className={styles.sectionSubtitle}>Files associated with this LOI</div>
          </div>
        </div>
        <div className={styles.docList}>
          <div className={styles.docItem}>
            <div className={styles.docIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div className={styles.docName}>Letter_of_Intent_Feb2026.pdf</div>
              <div className={styles.docMeta}>Received February 14, 2026 — 8 pages — 412 KB</div>
            </div>
            <div className={styles.docActions}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>
            </div>
          </div>
          <div className={styles.docItem}>
            <div className={`${styles.docIcon} ${styles.docIconBlue}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
              </svg>
            </div>
            <div>
              <div className={styles.docName}>LOI_Analysis_AICoach.pdf</div>
              <div className={styles.docMeta}>Generated by AI Coach — February 15, 2026 — 3 pages</div>
            </div>
            <div className={styles.docActions}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
