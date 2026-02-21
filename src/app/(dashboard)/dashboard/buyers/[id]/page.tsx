'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/buyers/buyers.module.css'

/* TODO: wire to API using params.id */

const PIPELINE_STAGES = [
  { label: 'Identified', status: 'completed' },
  { label: 'Engaged', status: 'completed' },
  { label: 'Under NDA', status: 'completed' },
  { label: 'Offer Received', status: 'current' },
  { label: 'Diligence', status: '' },
  { label: 'Closed', status: '' },
]

const TIMELINE_ITEMS = [
  {
    date: 'DEC 15, 2024',
    event: 'LOI Received — $8.2M',
    detail: 'Letter of intent submitted. 70% cash at close, 30% seller note over 24 months.',
    highlight: '$8.2M Offer',
    dotColor: 'green',
    icon: '📄',
  },
  {
    date: 'NOV 28, 2024',
    event: 'NDA Executed',
    detail: 'Mutual NDA signed. Data room access granted.',
    highlight: null,
    dotColor: 'blue',
    icon: '🔒',
  },
  {
    date: 'NOV 14, 2024',
    event: 'Initial Call — 45 min',
    detail: 'Introduction call with Mark Chen, Managing Director. Strong interest expressed.',
    highlight: null,
    dotColor: 'teal',
    icon: '📞',
  },
  {
    date: 'NOV 02, 2024',
    event: 'Teaser Sent',
    detail: 'Blind teaser document delivered via email.',
    highlight: null,
    dotColor: 'orange',
    icon: '📧',
  },
]

const MATCH_CRITERIA = [
  { name: 'Revenue Fit', score: '94%', fill: 94, quality: 'excellent' },
  { name: 'Industry Alignment', score: '88%', fill: 88, quality: 'excellent' },
  { name: 'Geography Match', score: '95%', fill: 95, quality: 'excellent' },
  { name: 'Deal Size Fit', score: '72%', fill: 72, quality: 'good' },
  { name: 'Management Retention', score: '60%', fill: 60, quality: 'fair' },
]

const NOTES = [
  {
    author: 'You',
    date: 'Dec 16, 2024',
    text: 'Mark mentioned they have a portfolio company in plumbing and are building out home services. This could be a very strategic fit — they may pay a premium. Follow up on earnout structure.',
  },
  {
    author: 'Sarah (Advisor)',
    date: 'Dec 14, 2024',
    text: 'Reviewed the LOI. The 30-month seller note is standard for PE. The 6.4x EBITDA multiple is on the lower end but acceptable given the market. Recommend counter at 7.0x.',
  },
]

export default function BuyerProfilePage() {
  const [activeTab, setActiveTab] = useState<'details' | 'match' | 'timeline' | 'notes'>('details')

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/buyers">Buyers</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>ServiceMaster PE Group</span>
      </div>

      {/* Buyer Header Card */}
      <div className={styles.buyerHeaderCard}>
        <div className={styles.buyerHeaderLeft}>
          <div className={styles.buyerLogo}>SM</div>
          <div>
            <div className={styles.buyerHeaderName}>ServiceMaster PE Group</div>
            <div className={styles.buyerMeta}>
              <span className={styles.buyerTypeBadgeProfile}>Private Equity</span>
              <span className={styles.loiBadge}>
                <span className={styles.loiBadgeDot} />
                LOI Received
              </span>
              <span className={styles.buyerMetaItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Chicago, IL
              </span>
              <span className={styles.buyerMetaItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
                $350M AUM
              </span>
              <span className={styles.buyerMetaItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                12 Portfolio Cos.
              </span>
            </div>
          </div>
        </div>

        {/* Match Score Ring */}
        <div className={styles.matchScoreRing}>
          <div className={styles.matchRingWrap}>
            <svg viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border-light)" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40" fill="none"
                stroke="var(--green)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40 * 0.87} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
              />
            </svg>
            <div className={styles.matchRingCenter}>
              <div className={styles.matchRingScore}>87</div>
              <div className={styles.matchRingDenom}>/100</div>
            </div>
          </div>
          <div className={styles.matchRingLabel}>Strong Match</div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className={styles.pipelineCardProfile}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 16 }}>Deal Stage</div>
        <div className={styles.pipelineStages}>
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={i}
              className={`${styles.pipelineStageItem} ${stage.status === 'completed' ? styles.completed : ''} ${stage.status === 'current' ? styles.current : ''}`}
            >
              <div className={styles.stageDotProfile}>
                {stage.status === 'completed' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className={styles.stageLabelProfile}>{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Body */}
      <div className={styles.twoCol}>
        {/* Main Column */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 0 }}>
            {(['details', 'match', 'timeline', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className={styles.card}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 8 }}>Key Details</div>
              {[
                { label: 'Buyer Type', value: 'Private Equity' },
                { label: 'Fund Size', value: '$350M AUM' },
                { label: 'Target EBITDA', value: '$500K – $3M' },
                { label: 'Target Revenue', value: '$2M – $20M' },
                { label: 'Preferred Geography', value: 'Southeast & Midwest US' },
                { label: 'Acquisition Type', value: 'Platform + Add-on' },
                { label: 'Hold Period', value: '4–6 years' },
                { label: 'Introduced Via', value: 'M&A Advisor Referral' },
              ].map((row) => (
                <div key={row.label} className={styles.detailRow}>
                  <span className={styles.detailLabel}>{row.label}</span>
                  <span className={styles.detailValue}>{row.value}</span>
                </div>
              ))}

              <div className={styles.contactCard}>
                <div className={styles.contactCardName}>Mark Chen</div>
                <div className={styles.contactCardTitle}>Managing Director, Acquisitions</div>
                <div className={styles.contactLinks}>
                  <a href="mailto:m.chen@servicemaster-pe.com" className={styles.contactLink}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    m.chen@servicemaster-pe.com
                  </a>
                  <a href="tel:+13125550142" className={styles.contactLink}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.11 7.76a16 16 0 006.13 6.13l1.12-1.14a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 15z" />
                    </svg>
                    +1 (312) 555-0142
                  </a>
                  <a href="https://linkedin.com" className={styles.contactLink} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                    View LinkedIn
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Match Analysis Tab */}
          {activeTab === 'match' && (
            <div className={styles.card}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 16 }}>Match Analysis</div>
              <div className={styles.matchCriteria}>
                {MATCH_CRITERIA.map((item) => (
                  <div key={item.name}>
                    <div className={styles.matchItemHeader}>
                      <span className={styles.matchItemName}>{item.name}</span>
                      <span className={styles.matchItemScore} style={{ color: item.quality === 'excellent' ? 'var(--green)' : item.quality === 'good' ? 'var(--accent)' : 'var(--orange)' }}>
                        {item.score}
                      </span>
                    </div>
                    <div className={styles.matchBarTrack}>
                      <div
                        className={`${styles.matchBarFill} ${item.quality === 'excellent' ? styles.matchBarExcellent : item.quality === 'good' ? styles.matchBarGood : styles.matchBarFair}`}
                        style={{ width: `${item.fill}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className={styles.card}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 16 }}>Engagement Timeline</div>
              <div className={styles.profileTimeline}>
                {TIMELINE_ITEMS.map((item, i) => (
                  <div key={i} className={styles.timelineItem}>
                    <div className={styles.timelineLineWrap}>
                      <div className={`${styles.timelineDot} ${styles[`timelineDot${item.dotColor.charAt(0).toUpperCase() + item.dotColor.slice(1)}`]}`}>
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                      </div>
                      <div className={styles.timelineConnector} />
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineDate}>{item.date}</div>
                      <div className={styles.timelineEvent}>{item.event}</div>
                      <div className={styles.timelineDetail}>{item.detail}</div>
                      {item.highlight && (
                        <div className={styles.timelineHighlight}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {item.highlight}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)' }}>Notes</div>
                <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: '5px 12px' }}>+ Add Note</button>
              </div>
              {NOTES.map((note, i) => (
                <div key={i} className={styles.noteItem}>
                  <div className={styles.noteHeader}>
                    <span className={styles.noteAuthor}>{note.author}</span>
                    <span className={styles.noteDate}>{note.date}</span>
                  </div>
                  <div className={styles.noteText}>{note.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div>
          {/* Actions Card */}
          <div className={styles.card}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 12 }}>Actions</div>
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Review LOI
            </button>
            <button className={styles.actionBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Schedule Meeting
            </button>
            <button className={styles.actionBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              Grant Data Room Access
            </button>
            <button className={styles.actionBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Send Message
            </button>
            <button className={styles.actionBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Update Stage
            </button>
          </div>

          {/* LOI Summary */}
          <div className={styles.card}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 12 }}>LOI Summary</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1B7A34', letterSpacing: '-0.8px', marginBottom: 4 }}>$8.2M</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Total enterprise value offer</div>
            {[
              { label: 'Cash at Close', value: '$5.74M (70%)' },
              { label: 'Seller Note', value: '$2.46M (30%)' },
              { label: 'Multiple', value: '6.4x EBITDA' },
              { label: 'Expiry', value: 'Jan 15, 2025' },
            ].map((row) => (
              <div key={row.label} className={styles.detailRow}>
                <span className={styles.detailLabel}>{row.label}</span>
                <span className={styles.detailValue}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Engagement Stats */}
          <div className={styles.card}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: 12 }}>Engagement Stats</div>
            {[
              { label: 'Days in Pipeline', value: '48' },
              { label: 'Meetings Held', value: '3' },
              { label: 'Data Room Views', value: '12' },
              { label: 'Documents Accessed', value: '8 of 14' },
            ].map((row) => (
              <div key={row.label} className={styles.detailRow}>
                <span className={styles.detailLabel}>{row.label}</span>
                <span className={styles.detailValue}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
