'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from '@/components/deal-room/deal-room.module.css'

// TODO: wire to API — GET /api/companies/[id]/data-room/documents/[docId]
const STATIC_DOC = {
  filename: '2025-Annual-PL-Statement.pdf',
  category: 'Financial Documents',
  uploadedAt: 'Feb 10, 2026',
  viewers: 3,
  fileType: 'PDF',
  fileSize: '2.4 MB',
  pages: 4,
  uploadedBy: 'Mike Reynolds',
  uploaderInitials: 'MR',
  aiSummary:
    'Reynolds HVAC Services reported total revenue of $12.8M for FY2025, representing 12.3% year-over-year growth, with gross margin improving to 42% from 41% in the prior year. Adjusted EBITDA came in at $2.05M (16.0% margin), reflecting disciplined cost management and a $320K owner compensation normalization applied in Q3. The P&L includes Q4 actuals through December 31, 2025 and has been reconciled to the company\'s QuickBooks general ledger; no material audit adjustments were noted.',
  versions: [
    { version: 'v3', isCurrent: true, date: 'Feb 10, 2026', author: 'Mike Reynolds', note: 'Updated with Q4 actuals' },
    { version: 'v2', isCurrent: false, date: 'Jan 5, 2026', author: 'Sarah Chen', note: 'Added footnotes' },
    { version: 'v1', isCurrent: false, date: 'Nov 20, 2025', author: 'Mike Reynolds', note: 'Initial upload' },
  ],
  accessLog: [
    { initials: 'JW', color: 'blue', name: 'Jennifer Walsh', org: 'ServiceMaster PE', date: 'Feb 12, 2026', action: 'viewed', duration: '3 min' },
    { initials: 'TL', color: 'green', name: 'Tom Liu', org: 'ServiceMaster PE', date: 'Feb 11, 2026', action: 'downloaded', duration: null },
    { initials: 'JK', color: 'purple', name: 'Jeff Kim', org: 'Reynolds Advisory', date: 'Feb 8, 2026', action: 'viewed', duration: '1 min' },
  ],
  relatedDocs: [
    '2024 Annual P&L',
    '2023 Annual P&L',
    'EBITDA Adjustments',
  ],
}

export default function DocumentViewerPage() {
  const params = useParams()
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(100)
  const totalPages = STATIC_DOC.pages

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/data-room">Data Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <Link href="/dashboard/data-room">Financial Documents</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <span>{STATIC_DOC.filename}</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div style={{ flex: 1 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', background: 'var(--red-light)', borderRadius: '8px', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </span>
            {STATIC_DOC.filename}
            <span className={styles.dvBadgeGreen}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Complete
            </span>
          </h1>
          <div className={styles.dvPageHeaderMeta}>
            <div className={styles.dvMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
              {STATIC_DOC.category}
            </div>
            <span style={{ color: 'var(--border)' }}>|</span>
            <div className={styles.dvMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Uploaded {STATIC_DOC.uploadedAt}
            </div>
            <span style={{ color: 'var(--border)' }}>|</span>
            <div className={styles.dvMetaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              {STATIC_DOC.viewers} viewers
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download
          </button>
        </div>
      </div>

      {/* Viewer + Sidebar Layout */}
      <div className={styles.dvViewerLayout}>

        {/* LEFT: Document Preview */}
        <div>
          {/* AI Summary */}
          <div className={styles.dvAiSummary} style={{ marginBottom: '16px' }}>
            <div className={styles.dvAiSummaryHeader}>
              <div className={styles.dvAiSummaryIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', stroke: '#C084FC' }} aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              </div>
              <span className={styles.dvAiSummaryLabel}>AI Summary</span>
              <span className={styles.dvAiSummaryTag}>Auto-generated</span>
            </div>
            <p className={styles.dvAiSummaryText}>
              Reynolds HVAC Services reported <strong>total revenue of $12.8M for FY2025</strong>, representing 12.3% year-over-year growth, with gross margin improving to 42% from 41% in the prior year.{' '}
              <strong>Adjusted EBITDA came in at $2.05M (16.0% margin)</strong>, reflecting disciplined cost management and a $320K owner compensation normalization applied in Q3.
              The P&amp;L includes <strong>Q4 actuals through December 31, 2025</strong> and has been reconciled to the company&apos;s QuickBooks general ledger; no material audit adjustments were noted.
            </p>
          </div>

          {/* Document Viewer Container */}
          <div className={styles.dvViewerContainer}>
            {/* Toolbar */}
            <div className={styles.dvViewerToolbar}>
              <div className={styles.dvToolbarLeft}>
                <div className={styles.dvPageNav}>
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={styles.dvNavBtn}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <span className={styles.dvPageIndicator}>Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={styles.dvNavBtn}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>
              <div className={styles.dvToolbarRight}>
                <div className={styles.dvZoomControls}>
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                    className={styles.dvZoomBtn}
                  >&#8722;</button>
                  <span className={styles.dvZoomLevel}>{zoomLevel}%</span>
                  <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                    className={styles.dvZoomBtn}
                  >&#43;</button>
                </div>
                <div className={styles.dvToolbarDivider} />
                <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm} ${styles.btnIcon}`} title="Fit to width">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm} ${styles.btnIcon}`} title="Rotate">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                </button>
              </div>
            </div>

            {/* Document Preview Area */}
            <div className={styles.dvPreviewArea}>
              <div className={styles.dvPdfPageSim}>
                {/* Simulated document content lines */}
                <div className={styles.dvSimHeaderBlock}>
                  <div className={`${styles.dvSimLine} ${styles.dvSimTitle}`} />
                  <div className={`${styles.dvSimLine} ${styles.dvSimShort} ${styles.dvSimDark}`} style={{ marginTop: '12px' }} />
                  <div className={`${styles.dvSimLine}`} style={{ width: '55%', height: '8px', marginTop: '4px' }} />
                </div>
                <div className={styles.dvSimLine} style={{ height: '1px', background: '#D0D0D0', marginBottom: '16px' }} />
                <div className={`${styles.dvSimTableRow} ${styles.dvSimTableHeader}`}>
                  <div className={`${styles.dvSimTableCell} ${styles.dvSimTableLabel}`} />
                  <div className={styles.dvSimTableCell} />
                  <div className={styles.dvSimTableCell} />
                  <div className={`${styles.dvSimTableCell} ${styles.dvSimTableAccent}`} />
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={styles.dvSimTableRow}>
                    <div className={`${styles.dvSimTableCell} ${styles.dvSimTableLabel}`} />
                    <div className={styles.dvSimTableCell} />
                    <div className={styles.dvSimTableCell} />
                    <div className={`${styles.dvSimTableCell} ${i === 0 ? styles.dvSimTableAccent : ''}`} />
                  </div>
                ))}
                <div className={styles.dvSimLine} style={{ height: '1px', background: '#D0D0D0', margin: '10px 0' }} />
                <div className={styles.dvSimTableRow}>
                  <div className={`${styles.dvSimTableCell} ${styles.dvSimTableLabel} ${styles.dvSimDark}`} />
                  <div className={`${styles.dvSimTableCell} ${styles.dvSimDark}`} />
                  <div className={`${styles.dvSimTableCell} ${styles.dvSimDark}`} />
                  <div className={styles.dvSimTableCell} style={{ background: '#8BB8E8' }} />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className={styles.dvActionBar}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Print
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                Share
              </button>
              <div className={styles.dvActionBarDivider} />
              <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Replace
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Detail Panel */}
        <div className={styles.dvDetailPanel}>
          {/* Document Details */}
          <div className={styles.dvCard}>
            <div className={styles.dvCardTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Document Details
            </div>
            <div className={styles.dvDetailGrid}>
              <div className={styles.dvDetailItem}>
                <div className={styles.dvDetailItemLabel}>File Type</div>
                <div className={styles.dvDetailItemValue}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--red-light)', color: 'var(--red)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                    {STATIC_DOC.fileType}
                  </span>
                </div>
              </div>
              <div className={styles.dvDetailItem}>
                <div className={styles.dvDetailItemLabel}>File Size</div>
                <div className={`${styles.dvDetailItemValue} ${styles.dvMono}`}>{STATIC_DOC.fileSize}</div>
              </div>
              <div className={styles.dvDetailItem}>
                <div className={styles.dvDetailItemLabel}>Pages</div>
                <div className={`${styles.dvDetailItemValue} ${styles.dvMono}`}>{STATIC_DOC.pages}</div>
              </div>
              <div className={styles.dvDetailItem}>
                <div className={styles.dvDetailItemLabel}>Category</div>
                <div className={styles.dvDetailItemValue}>Financial</div>
              </div>
              <div className={styles.dvDetailItem} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.dvDetailItemLabel}>Uploaded By</div>
                <div className={styles.dvDetailItemValue} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {STATIC_DOC.uploaderInitials}
                  </div>
                  {STATIC_DOC.uploadedBy}
                </div>
              </div>
            </div>
          </div>

          {/* Version History */}
          <div className={styles.dvCard}>
            <div className={styles.dvCardTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              Version History
            </div>
            <ul className={styles.dvVersionList}>
              {STATIC_DOC.versions.map((v) => (
                <li key={v.version} className={styles.dvVersionItem}>
                  <span className={`${styles.dvVersionBadge} ${v.isCurrent ? styles.dvVersionCurrent : styles.dvVersionPast}`}>
                    {v.version}
                  </span>
                  <div className={styles.dvVersionInfo}>
                    <div className={styles.dvVersionDate}>
                      {v.date} &mdash; <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{v.author}</span>
                    </div>
                    <div className={styles.dvVersionNote}>&ldquo;{v.note}&rdquo;</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Access Log */}
          <div className={styles.dvCard}>
            <div className={styles.dvCardTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              Access Log
            </div>
            <ul className={styles.dvAccessList}>
              {STATIC_DOC.accessLog.map((entry, i) => (
                <li key={i} className={styles.dvAccessItem}>
                  <div className={`${styles.dvAccessAvatar} ${styles[`dvAvatar${entry.color.charAt(0).toUpperCase() + entry.color.slice(1)}`]}`}>
                    {entry.initials}
                  </div>
                  <div className={styles.dvAccessInfo}>
                    <div className={styles.dvAccessName}>{entry.name}</div>
                    <div className={styles.dvAccessOrg}>{entry.org}</div>
                    <div className={styles.dvAccessMeta}>
                      <span className={styles.dvAccessDate}>{entry.date}</span>
                      <span className={`${styles.dvAccessActionTag} ${entry.action === 'viewed' ? styles.dvTagViewed : styles.dvTagDownloaded}`}>
                        {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                      </span>
                      {entry.duration && <span className={styles.dvAccessDuration}>{entry.duration}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Related Documents */}
          <div className={styles.dvCard}>
            <div className={styles.dvCardTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              Related Documents
            </div>
            <ul className={styles.dvRelatedList}>
              {STATIC_DOC.relatedDocs.map((doc) => (
                <li key={doc}>
                  <Link href="/dashboard/data-room" className={styles.dvRelatedItem}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <span className={styles.dvRelatedItemName}>{doc}</span>
                    <svg className={styles.dvRelatedArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
