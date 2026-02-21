'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/deal-room/deal-room.module.css'

/* TODO: wire to API */

const BUYERS = [
  {
    initials: 'SM',
    bg: 'linear-gradient(135deg, #1D1D1F, #3A3A3C)',
    name: 'ServiceMaster PE Group',
    typeClass: styles.btPe,
    typeLabel: 'Private Equity',
    matchScore: '87',
    matchClass: styles.loiMatchScoreHigh,
    isBest: true,
  },
  {
    initials: 'BC',
    bg: 'linear-gradient(135deg, var(--accent), #4DA3FF)',
    name: 'Brightcore Capital',
    typeClass: styles.btStrat,
    typeLabel: 'Strategic',
    matchScore: '74',
    matchClass: styles.loiMatchScoreMid,
    isBest: false,
  },
  {
    initials: 'GF',
    bg: 'linear-gradient(135deg, var(--green), #5DD57A)',
    name: 'Greg Forsythe',
    typeClass: styles.btInd,
    typeLabel: 'Individual',
    matchScore: '61',
    matchClass: styles.loiMatchScoreLow,
    isBest: false,
  },
]

type CompRow = {
  label: string
  cells: {
    value: string
    sub?: string
    highlight?: 'highlight' | 'warn' | 'risk'
    riskTag?: string
  }[]
}

const COMP_SECTIONS: { title: string; rows: CompRow[] }[] = [
  {
    title: 'Price',
    rows: [
      { label: 'Total Enterprise Value', cells: [{ value: '$8.2M', sub: '6.4x EBITDA', highlight: 'highlight' }, { value: '$7.5M', sub: '5.9x EBITDA' }, { value: '$6.8M', sub: '5.3x EBITDA' }] },
      { label: 'Cash at Close', cells: [{ value: '$5.74M', sub: '70%' }, { value: '$6.0M', sub: '80%', highlight: 'highlight' }, { value: '$5.44M', sub: '80%' }] },
      { label: 'Seller Note', cells: [{ value: '$2.46M', sub: '24 mo. @ 5%' }, { value: '$1.5M', sub: '18 mo. @ 4%' }, { value: '$1.36M', sub: '12 mo. @ 6%', highlight: 'warn' }] },
    ],
  },
  {
    title: 'Earnout',
    rows: [
      { label: 'Earnout Amount', cells: [{ value: 'None', highlight: 'highlight' }, { value: '$500K', riskTag: 'Risk', highlight: 'warn' }, { value: '$800K', riskTag: 'High Risk', highlight: 'risk' }] },
      { label: 'Earnout Duration', cells: [{ value: 'N/A' }, { value: '24 months' }, { value: '36 months', riskTag: 'Risk' }] },
      { label: 'Performance Metric', cells: [{ value: 'N/A' }, { value: 'Revenue growth' }, { value: 'EBITDA targets' }] },
    ],
  },
  {
    title: 'Terms',
    rows: [
      { label: 'Deal Type', cells: [{ value: 'Stock Sale' }, { value: 'Asset Sale' }, { value: 'Asset Sale' }] },
      { label: 'Non-Compete', cells: [{ value: '3 years' }, { value: '5 years', riskTag: 'Risk' }, { value: '2 years', highlight: 'highlight' }] },
      { label: 'Close Timeline', cells: [{ value: '~90 days' }, { value: '~150 days', highlight: 'warn' }, { value: '~75 days', highlight: 'highlight' }] },
    ],
  },
]

export default function LoiComparisonPage() {
  const [showAcceptModal, setShowAcceptModal] = useState(false)

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>LOI Comparison</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Compare Offers</h1>
          <p>Reynolds HVAC Services — 3 active offers received</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>Ask AI Coach</button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className={styles.compTable}>
        {/* Header */}
        <div className={styles.compHeader}>
          <div className={styles.compHeaderLabel}>
            <span>Offer Terms</span>
          </div>
          {BUYERS.map((buyer) => (
            <div
              key={buyer.name}
              className={`${styles.compColHead} ${buyer.isBest ? styles.compColHeadBest : ''}`}
            >
              <div className={styles.loiCompBuyerAvatar} style={{ background: buyer.bg }}>
                {buyer.initials}
              </div>
              <div className={styles.loiCompBuyerName}>{buyer.name}</div>
              <div className={styles.loiCompBuyerBadges}>
                <span className={`${styles.loiCompBuyerType} ${buyer.typeClass}`}>{buyer.typeLabel}</span>
                <span className={`${styles.loiMatchScore} ${buyer.matchClass}`}>{buyer.matchScore} match</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sections */}
        {COMP_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className={styles.compSectionHead}>
              <div className={styles.compSectionTitle}>{section.title}</div>
            </div>
            {section.rows.map((row) => (
              <div key={row.label} className={styles.compRow}>
                <div className={styles.compRowLabel}>{row.label}</div>
                {row.cells.map((cell, ci) => (
                  <div
                    key={ci}
                    className={`${styles.compCell} ${
                      cell.highlight === 'highlight' ? styles.compCellHighlight :
                      cell.highlight === 'warn' ? styles.compCellWarn :
                      cell.highlight === 'risk' ? styles.compCellRisk : ''
                    }`}
                  >
                    {cell.value}
                    {cell.riskTag && <span className={styles.riskTag}>{cell.riskTag}</span>}
                    {cell.sub && <span className={styles.subVal}>{cell.sub}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Net Proceeds Row */}
        <div className={styles.compSectionHead}>
          <div className={styles.compSectionTitle}>Net Proceeds to You</div>
        </div>
        <div className={`${styles.compRow} ${styles.compRowNet}`}>
          <div className={styles.compRowLabel} style={{ fontWeight: 700 }}>Est. Net After Tax</div>
          {[
            { amount: '$6.1M', cls: styles.netAmountBest, pct: '78%', bar: styles.rbGreen, barWidth: 78 },
            { amount: '$5.6M', cls: styles.netAmountMid, pct: '72%', bar: styles.rbAccent, barWidth: 72 },
            { amount: '$5.0M', cls: styles.netAmountLow, pct: '65%', bar: styles.rbGray, barWidth: 65 },
          ].map((net, i) => (
            <div key={i} className={styles.compCell} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
              <div className={`${styles.netAmount} ${net.cls}`}>{net.amount}</div>
              <div className={styles.retirementPct}>{net.pct} of asking retirement goal</div>
              <div className={styles.retirementBar}>
                <div className={`${styles.rbFill} ${net.bar}`} style={{ width: `${net.barWidth}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Coach Card */}
      <div className={styles.coachCard}>
        <div className={styles.coachIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <div className={styles.coachEyebrow}>AI Coach Analysis</div>
          <div className={styles.coachParas}>
            <p className={styles.coachP}>
              <strong>ServiceMaster PE Group</strong> is your strongest offer at $8.2M — 9.3% above the next bid. Their no-earnout structure removes significant execution risk, which is particularly valuable given your stated goal of a clean transition.
            </p>
            <p className={styles.coachP}>
              Before accepting, <strong>consider countering at 7.0x EBITDA (~$8.96M)</strong>. PE buyers often have 10-15% flex in their initial LOI. Their existing home services portfolio means this is likely a strategic premium play for them, which gives you more leverage.
            </p>
          </div>
        </div>
      </div>

      {/* Risk Flags */}
      <div className={styles.riskFlags}>
        <div className={styles.riskFlagsHeader}>
          <div className={styles.riskFlagsTitle}>Risk Flags</div>
        </div>
        {[
          { iconClass: styles.fiOrange, buyer: 'Brightcore Capital', text: '24-month earnout tied to revenue growth targets introduces $500K in contingent value risk', icon: '⚠' },
          { iconClass: styles.fiRed, buyer: 'Greg Forsythe', text: '$800K earnout over 36 months is the highest risk structure — most individual buyers cannot service this level of commitment', icon: '!' },
          { iconClass: styles.fiGreen, buyer: 'ServiceMaster PE Group', text: 'No earnout, no financing contingency. Clean structure with minimal execution risk.', icon: '✓' },
        ].map((flag, i) => (
          <div key={i} className={styles.flagRow}>
            <div className={`${styles.flagIcon} ${flag.iconClass}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {flag.iconClass === styles.fiGreen ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </>
                )}
              </svg>
            </div>
            <div>
              <div className={styles.flagBuyer}>{flag.buyer}</div>
              <div className={styles.flagText}>{flag.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Row */}
      <div className={styles.actionRow}>
        <button
          className={`${styles.btn} ${styles.btnSuccess}`}
          onClick={() => setShowAcceptModal(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Accept ServiceMaster Offer
        </button>
        <span className={styles.actionDivider}>or</span>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>Counter Offer</button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>Request Best &amp; Final</button>
      </div>

      {/* Accept Confirmation Modal */}
      {showAcceptModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAcceptModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Accept LOI from ServiceMaster PE?</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              This will notify your advisor and begin the formal due diligence process. The other offers will be placed on hold. You can still withdraw at any time before signing the definitive agreement.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className={`${styles.btn} ${styles.btnSuccess}`} style={{ flex: 1 }}>
                Yes, Accept Offer
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowAcceptModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
