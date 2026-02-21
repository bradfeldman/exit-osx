'use client'

import Link from 'next/link'
import styles from '@/components/deal-room/deal-room.module.css'

/* TODO: wire to API */

const BUYERS = [
  {
    name: 'ServiceMaster PE Group',
    stage: 'LOI Received',
    stageClass: styles.colStagePillLoi,
    type: 'Private Equity',
    score: 87,
    scoreClass: styles.aiScoreBadgeHigh,
    isBest: true,
    avatarBg: 'linear-gradient(135deg, #1D1D1F, #3A3A3C)',
    initials: 'SM',
  },
  {
    name: 'Brightcore Capital',
    stage: 'Preliminary Interest',
    stageClass: styles.colStagePillPreliminary,
    type: 'Strategic Buyer',
    score: 74,
    scoreClass: styles.aiScoreBadgeMid,
    isBest: false,
    avatarBg: 'linear-gradient(135deg, var(--accent), #4DA3FF)',
    initials: 'BC',
  },
  {
    name: 'Greg Forsythe',
    stage: 'Early Engagement',
    stageClass: styles.colStagePillEarly,
    type: 'Individual Buyer',
    score: 61,
    scoreClass: styles.aiScoreBadgeLow,
    isBest: false,
    avatarBg: 'linear-gradient(135deg, var(--green), #5DD57A)',
    initials: 'GF',
  },
]

type DataRow = {
  label: string
  cells: {
    value: string
    sub?: string
    est?: string
    highlight?: 'best' | 'concern'
    tag?: 'yes' | 'likely' | 'uncertain'
  }[]
}

const DEAL_SECTIONS: { category: string; rows: DataRow[] }[] = [
  {
    category: 'Offer Terms',
    rows: [
      { label: 'Total Enterprise Value', cells: [{ value: '$8.2M', sub: '6.4x EBITDA', highlight: 'best' }, { value: '$7.5M', sub: '5.9x EBITDA' }, { value: '$6.8M', sub: '5.3x EBITDA', highlight: 'concern' }] },
      { label: 'Cash at Close', cells: [{ value: '$5.74M', sub: '70%', highlight: 'best' }, { value: '$6.0M', sub: '80%' }, { value: '$5.44M', sub: '80%' }] },
      { label: 'Seller Note', cells: [{ value: '$2.46M', sub: '30%, 24 mo.' }, { value: '$1.5M', sub: '20%, 18 mo.', highlight: 'best' }, { value: '$1.36M', sub: '20%, 12 mo.' }] },
    ],
  },
  {
    category: 'Structure',
    rows: [
      { label: 'Deal Type', cells: [{ value: 'Stock Sale' }, { value: 'Asset Sale' }, { value: 'Asset Sale' }] },
      { label: 'Earnout', cells: [{ value: 'None', tag: 'yes' }, { value: '$500K (2yr)', tag: 'likely' }, { value: '$800K (3yr)', tag: 'uncertain' }] },
      { label: 'Management Retention', cells: [{ value: 'Optional', tag: 'yes' }, { value: 'Required 2yr', tag: 'uncertain' }, { value: 'Required 1yr', tag: 'likely' }] },
    ],
  },
  {
    category: 'Fit & Timeline',
    rows: [
      { label: 'Est. Close Date', cells: [{ value: 'Q2 2025', est: '~90 days' }, { value: 'Q3 2025', est: '~150 days', highlight: 'concern' }, { value: 'Q2 2025', est: '~80 days' }] },
      { label: 'Due Diligence', cells: [{ value: '45 days', tag: 'yes' }, { value: '60 days', tag: 'likely' }, { value: '30 days', tag: 'yes' }] },
      { label: 'Financing Contingency', cells: [{ value: 'None', tag: 'yes' }, { value: 'None', tag: 'yes' }, { value: 'Bank LOC', tag: 'uncertain' }] },
    ],
  },
]

export default function DealComparisonPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Deal Comparison</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Deal Comparison</h1>
          <p>Side-by-side analysis of all active buyer offers — Reynolds HVAC Services</p>
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
        </div>
      </div>

      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        AI match scores and financial comparisons are provided for informational purposes only and do not constitute financial advice. Consult your M&A advisor before making any decisions.
      </div>

      {/* Comparison Table */}
      <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th className={styles.colLabelSpacer} />
              {BUYERS.map((buyer) => (
                <th key={buyer.name} className={styles.colHeader}>
                  <div className={styles.colHeaderInner}>
                    <div className={styles.colBuyerName}>{buyer.name}</div>
                    <span className={`${styles.colStagePill} ${buyer.stageClass}`}>{buyer.stage}</span>
                    <div className={styles.colTypeTag}>{buyer.type}</div>
                    <div className={`${styles.aiScoreBadge} ${buyer.scoreClass}`}>
                      <span className={styles.aiScoreBadgeNum}>{buyer.score}</span>
                      <span className={styles.aiScoreBadgeLabel}>AI Match<br />Score</span>
                    </div>
                    {buyer.isBest && (
                      <div className={styles.bestBadge}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 10, height: 10 }}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Best Overall
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEAL_SECTIONS.map((section) => (
              <>
                <tr key={`cat-${section.category}`} className={styles.rowCategoryHeader}>
                  <td colSpan={4}>{section.category}</td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label}>
                    <td className={styles.rowLabelCell}>{row.label}</td>
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`${styles.dataCell} ${cell.highlight === 'best' ? styles.dataCellBest : ''} ${cell.highlight === 'concern' ? styles.dataCellConcern : ''}`}
                      >
                        <div>
                          {cell.tag ? (
                            <span className={cell.tag === 'yes' ? styles.yesTag : cell.tag === 'likely' ? styles.likelyTag : styles.uncertainTag}>
                              {cell.tag === 'yes' ? 'Yes' : cell.tag === 'likely' ? 'Likely' : 'Uncertain'}
                            </span>
                          ) : (
                            <span className={styles.cellValue}>{cell.value}</span>
                          )}
                          {cell.sub && <div className={styles.cellSub}>{cell.sub}</div>}
                          {cell.est && <div className={styles.cellEst}>{cell.est}</div>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Recommendation Card */}
      <div className={styles.aiRecCard}>
        <div className={styles.aiRecHeader}>
          <div className={styles.aiRecAvatar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div>
            <div className={styles.aiRecLabel}>AI Recommendation</div>
            <div className={styles.aiRecSublabel}>Based on your stated goals and offer analysis</div>
          </div>
        </div>

        <div className={styles.winnerCallout}>
          <div className={styles.winnerCalloutIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <div className={styles.winnerLabel}>Recommended Buyer</div>
            <div className={styles.winnerName}>ServiceMaster PE Group</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className={styles.winnerScore}>87</div>
            <div className={styles.winnerScoreLabel}>Match Score</div>
          </div>
        </div>

        <div className={styles.recGrid}>
          {[
            { icon: 'green', text: 'Highest total value at $8.2M — $700K more than next best offer' },
            { icon: 'green', text: 'No earnout contingency reduces risk significantly' },
            { icon: 'blue', text: 'PE buyer means clean transition — no management requirements' },
            { icon: 'orange', text: 'Counter at 7.0x EBITDA to test their ceiling before accepting' },
          ].map((point, i) => (
            <div key={i} className={styles.recPoint}>
              <div className={`${styles.recPointIcon} ${point.icon === 'green' ? styles.recPointIconGreen : point.icon === 'blue' ? styles.recPointIconBlue : styles.recPointIconOrange}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {point.icon === 'orange' ? (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </>
                  ) : (
                    <polyline points="20 6 9 17 4 12" />
                  )}
                </svg>
              </div>
              <span>{point.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <Link href="/dashboard/deal-room/loi-comparison" className={`${styles.btn} ${styles.btnPrimary}`}>
          View LOI Comparison
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>Schedule Advisor Call</button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>Request Best &amp; Final</button>
      </div>
    </div>
  )
}
