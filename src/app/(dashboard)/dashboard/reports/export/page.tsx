'use client'

import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/reports/reports.module.css'

// ── Static Demo Data ─────────────────────────────────────────────────────────
// TODO: wire to API — in production, report ID from query params drives this data

const EXPORT_HISTORY = [
  {
    date: 'Feb 18, 2026',
    report: 'Exit Readiness Report \u2014 Full',
    size: '2.8 MB',
    format: 'pdf' as const,
    isCurrent: true,
  },
  {
    date: 'Feb 12, 2026',
    report: 'Valuation Summary',
    size: '1.1 MB',
    format: 'pdf' as const,
    isCurrent: false,
  },
  {
    date: 'Feb 7, 2026',
    report: 'Financial Model \u2014 FY2025',
    size: '340 KB',
    format: 'xlsx' as const,
    isCurrent: false,
  },
  {
    date: 'Jan 28, 2026',
    report: 'AI Company Diagnosis',
    size: '1.8 MB',
    format: 'pdf' as const,
    isCurrent: false,
  },
  {
    date: 'Jan 15, 2026',
    report: 'Buyer Teaser \u2014 Reynolds HVAC',
    size: '892 KB',
    format: 'docx' as const,
    isCurrent: false,
  },
]

function FormatBadge({ format }: { format: 'pdf' | 'xlsx' | 'docx' }) {
  const classMap = {
    pdf: styles.formatPdf,
    xlsx: styles.formatXlsx,
    docx: styles.formatDocx,
  }
  return (
    <span className={`${styles.formatBadge} ${classMap[format]}`}>
      {format.toUpperCase()}
    </span>
  )
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function ExportDownloadPage() {
  return (
    <>
      <TrackPageView page="reports_export" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/reports">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Export</span>
      </div>

      {/* Success State */}
      <div className={styles.successSection}>

        {/* Green checkmark icon */}
        <div className={styles.successIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--green)' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className={styles.successHeading}>Your report is ready</h1>
        <p className={styles.successSubtitle}>
          Exit Readiness Report generated successfully &middot; February 18, 2026 at 9:43 AM
        </p>

        {/* File Card */}
        <div className={styles.fileCard}>
          <div className={styles.fileIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: 'var(--red)' }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className={styles.fileMeta}>
            <div className={styles.fileName}>Exit-Readiness-Report-Reynolds-HVAC-Feb-2026.pdf</div>
            <div className={styles.fileDetails}>PDF &middot; 2.8 MB &middot; 24 pages</div>
          </div>
        </div>

        {/* Primary Download Button */}
        <div className={styles.downloadBtnWrap}>
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Secondary Actions */}
        <div className={styles.secondaryActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            Email to myself
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share link
            <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '2px' }}>(expires 7 days)</span>
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in browser
          </button>
        </div>

      </div>

      {/* Export History */}
      <div className={styles.exportHistoryCard}>
        <div className={styles.exportSectionHeader}>
          <div>
            <div className={styles.exportSectionTitle}>Export history</div>
            <div className={styles.exportSectionSubtitle}>Your last 5 report exports</div>
          </div>
          <Link href="/dashboard/reports" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            All Reports
          </Link>
        </div>

        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Report</th>
              <th>Size</th>
              <th>Format</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {EXPORT_HISTORY.map((row, i) => (
              <tr key={i} className={row.isCurrent ? styles.currentRow : undefined}>
                <td style={row.isCurrent ? { color: 'var(--text-primary)', fontWeight: 500 } : undefined}>
                  {row.date}
                  {row.isCurrent && <span className={styles.currentBadge}>New</span>}
                </td>
                <td style={row.isCurrent ? { color: 'var(--text-primary)' } : undefined}>{row.report}</td>
                <td>{row.size}</td>
                <td><FormatBadge format={row.format} /></td>
                <td>
                  <a href="#" className={styles.dlLink}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.generateLink}>
          Need a different report?{' '}
          <Link href="/dashboard/reports/builder">Generate another report &rarr;</Link>
        </div>
      </div>
    </>
  )
}
