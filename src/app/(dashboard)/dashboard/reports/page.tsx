'use client'

import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/reports/reports.module.css'

// ── Static Demo Data ────────────────────────────────────────────────────────

const REPORTS = [
  {
    id: 'exit-readiness',
    title: 'Exit Readiness Report',
    desc: 'Comprehensive assessment of your business\u2019s readiness to sell \u2014 BRI scores, dimension analysis, and key findings.',
    badge: 'Ready' as const,
    badgeClass: 'badgeReady',
    iconColor: { background: 'var(--green-light)', color: 'var(--green)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    ),
    previewText: '24-page PDF \u00b7 Last generated Feb 15',
    footerDate: 'Updated 2 days ago',
    actions: ['download', 'share', 'regenerate'],
  },
  {
    id: 'valuation-summary',
    title: 'Valuation Summary',
    desc: 'One-page executive summary of your estimated valuation with methodology breakdown and comparable transactions.',
    badge: 'Ready' as const,
    badgeClass: 'badgeReady',
    iconColor: { background: 'var(--accent-light)', color: 'var(--accent)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    ),
    previewText: '4-page PDF \u00b7 $8.2M estimate',
    footerDate: 'Updated 5 days ago',
    actions: ['download', 'share', 'regenerate'],
  },
  {
    id: 'buyer-teaser',
    title: 'Buyer-Facing Teaser',
    desc: 'Anonymous company profile designed to attract buyers without revealing your identity. Share via your broker or directly.',
    badge: 'Draft' as const,
    badgeClass: 'badgeDraft',
    iconColor: { background: 'var(--purple-light)', color: 'var(--purple)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    ),
    previewText: '2-page teaser \u00b7 Draft needs review',
    footerDate: 'Created 1 week ago',
    actions: ['edit', 'download'],
  },
  {
    id: 'financial-summary',
    title: 'Financial Summary',
    desc: '3-year P&L, balance sheet, EBITDA adjustments, and key financial ratios formatted for buyer review.',
    badge: 'Ready' as const,
    badgeClass: 'badgeReady',
    iconColor: { background: 'var(--teal-light)', color: 'var(--teal)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    ),
    previewText: '8-page PDF \u00b7 Synced from QuickBooks',
    footerDate: 'Updated 5 days ago',
    actions: ['download', 'share', 'regenerate'],
  },
  {
    id: 'ai-diagnosis',
    title: 'AI Company Diagnosis',
    desc: 'AI-generated deep analysis of your company\u2019s strengths, weaknesses, opportunities, and threats from a buyer\u2019s perspective.',
    badge: 'New' as const,
    badgeClass: 'badgeNew',
    iconColor: { background: 'var(--orange-light)', color: 'var(--orange)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    ),
    previewText: '12-page report \u00b7 SWOT + risk analysis',
    footerDate: 'Generated today',
    actions: ['download', 'share'],
  },
  {
    id: 'retirement-projection',
    title: 'Retirement Projection',
    desc: 'Personal financial projection showing proceeds waterfall, gap analysis, and retirement readiness at various sale prices.',
    badge: 'Ready' as const,
    badgeClass: 'badgeReady',
    iconColor: { background: 'var(--green-light)', color: 'var(--green)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
    ),
    previewText: '6-page PDF \u00b7 3 exit scenarios',
    footerDate: 'Updated 3 days ago',
    actions: ['download', 'share'],
  },
]

const EXPORT_HISTORY = [
  {
    name: 'Exit Readiness Report v3',
    iconColor: { background: 'var(--green-light)', color: 'var(--green)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    ),
    type: 'PDF',
    generated: 'Feb 15, 2026',
    sharedWith: 'ServiceMaster PE, Jeff Kim',
    status: 'Shared' as const,
  },
  {
    name: 'Valuation Summary v2',
    iconColor: { background: 'var(--accent-light)', color: 'var(--accent)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    ),
    type: 'PDF',
    generated: 'Feb 12, 2026',
    sharedWith: 'ServiceMaster PE',
    status: 'Shared' as const,
  },
  {
    name: 'Exit Readiness Report v2',
    iconColor: { background: 'var(--green-light)', color: 'var(--green)' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    ),
    type: 'PDF',
    generated: 'Jan 28, 2026',
    sharedWith: '\u2014',
    status: 'Private' as const,
  },
]

// ── Action Icons ────────────────────────────────────────────────────────────

function ActionIcon({ type }: { type: string }) {
  switch (type) {
    case 'download':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    case 'share':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    case 'regenerate':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
    case 'edit':
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    default:
      return null
  }
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <>
      <TrackPageView page="reports" />

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Reports</h1>
          <p>Generate, preview, and share professional reports for buyers and advisors</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Generate New Report
        </button>
      </div>

      {/* Report Cards Grid */}
      <div className={styles.reportsGrid}>
        {REPORTS.map((report) => (
          <div key={report.id} className={styles.reportCard}>
            <span className={`${styles.reportBadge} ${styles[report.badgeClass]}`}>
              {report.badge}
            </span>
            <div className={styles.reportCardHeader}>
              <div className={styles.reportIcon} style={report.iconColor}>
                {report.icon}
              </div>
              <div className={styles.reportMeta}>
                <div className={styles.reportTitle}>{report.title}</div>
                <div className={styles.reportDesc}>{report.desc}</div>
              </div>
            </div>
            <div className={styles.reportPreview}>
              <div className={styles.previewPlaceholder}>
                {report.icon}
                <p>{report.previewText}</p>
              </div>
            </div>
            <div className={styles.reportFooter}>
              <div className={styles.reportDate}>{report.footerDate}</div>
              <div className={styles.reportActions}>
                {report.actions.map((action) => (
                  <button
                    key={action}
                    className={styles.reportActionBtn}
                    title={action.charAt(0).toUpperCase() + action.slice(1)}
                  >
                    <ActionIcon type={action} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export History */}
      <div className={styles.sectionHeader}>
        <h2>Export History</h2>
      </div>
      <div className={styles.historyTable}>
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Type</th>
              <th>Generated</th>
              <th>Shared With</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {EXPORT_HISTORY.map((item, i) => (
              <tr key={i}>
                <td>
                  <div className={styles.reportNameCell}>
                    <div className={styles.reportTypeIcon} style={item.iconColor}>
                      {item.icon}
                    </div>
                    {item.name}
                  </div>
                </td>
                <td className={styles.meta}>{item.type}</td>
                <td className={styles.meta}>{item.generated}</td>
                <td className={styles.meta}>{item.sharedWith}</td>
                <td>
                  <span className={`${styles.statusPill} ${item.status === 'Shared' ? styles.pillShared : styles.pillPrivate}`}>
                    <span className={`${styles.statusDot} ${item.status === 'Shared' ? styles.dotGreen : styles.dotGray}`} />
                    {item.status}
                  </span>
                </td>
                <td>
                  <button className={styles.reportActionBtn} title="Download">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
