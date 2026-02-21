'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/actions/action-center.module.css'

// TODO: wire to API — GET /api/companies/[id]/action-center/tasks/[taskId]/evidence
const STATIC_DATA = {
  task: {
    title: 'Document Key Customer Relationships',
    category: 'Customer Risk',
    due: 'Feb 28, 2026',
    subtasksComplete: 2,
    subtasksTotal: 4,
  },
  activeUploads: [
    {
      name: 'Customer-Revenue-Breakdown-2025.xlsx',
      size: '86 KB',
      type: 'xlsx' as const,
      progress: 100,
      status: 'complete' as const,
    },
    {
      name: 'Key-Account-Transition-Plan-Draft.pdf',
      size: '1.2 MB',
      type: 'pdf' as const,
      progress: 67,
      status: 'inProgress' as const,
    },
  ],
  evidence: [
    {
      name: 'Top-10-Customers-2025.xlsx',
      size: '48 KB',
      date: 'Feb 10, 2026',
      type: 'xlsx' as const,
    },
    {
      name: 'Relationship-Map.pdf',
      size: '124 KB',
      date: 'Feb 12, 2026',
      type: 'pdf' as const,
    },
    {
      name: 'Account-Owner-Matrix.docx',
      size: '38 KB',
      date: 'Feb 12, 2026',
      type: 'docx' as const,
    },
  ],
  aiChecks: [
    { type: 'pass' as const, text: 'Revenue data matches QuickBooks export within 0.3%' },
    { type: 'pass' as const, text: 'All 10 accounts have a named relationship owner documented' },
    {
      type: 'warn' as const,
      text: 'Austin Commercial Properties (28% of revenue) has no backup relationship owner — high transition risk',
    },
    { type: 'warn' as const, text: 'Contract renewal dates missing for 3 of 10 accounts' },
  ],
}

export default function EvidenceUploadPage() {
  const d = STATIC_DATA
  const [notes, setNotes] = useState(
    'These files document our top 10 customer relationships by revenue, including primary contacts, relationship owners, and a preliminary transition plan. The relationship map was prepared by Sarah Chen (CFO) using CRM data from ServiceTitan and QuickBooks export as of Q4 2025.'
  )
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/action-center">Action Center</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <span>Upload Evidence</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Upload Evidence</h1>
          <p>Attach supporting documents to validate your task completion for buyers and advisors.</p>
        </div>
      </div>

      {/* Task Context Banner */}
      <div className={styles.euTaskContext}>
        <div className={styles.euTaskContextIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className={styles.euTaskContextLabel}>Uploading evidence for</div>
          <div className={styles.euTaskContextTitle}>{d.task.title}</div>
          <div className={styles.euTaskContextMeta}>
            {d.task.category} &middot; Due {d.task.due} &middot; {d.task.subtasksComplete} of {d.task.subtasksTotal} subtasks complete
          </div>
        </div>
        <div className={styles.euTaskContextLink}>
          <Link href="/dashboard/action-center" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            View Task
          </Link>
        </div>
      </div>

      {/* Upload Zone */}
      <div className={styles.euUploadZoneLarge} role="button" tabIndex={0} aria-label="Drop files here or click to browse">
        <div className={styles.euUploadZoneIconLg}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
        </div>
        <div className={styles.euUploadZoneTitle}>Drop files here</div>
        <div className={styles.euUploadZoneSub}>
          or <span>click to browse</span> from your computer
        </div>
        <div className={styles.euFormatChips}>
          {['PDF', 'XLSX', 'DOCX', 'PNG', 'JPG'].map((fmt) => (
            <span key={fmt} className={styles.euFormatChip}>{fmt}</span>
          ))}
          <span className={styles.euFormatChipMuted}>Max 25MB per file</span>
        </div>
      </div>

      {/* Active Uploads */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Uploading</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{d.activeUploads.length} files</span>
        </div>
        <div className={styles.euUploadQueue}>
          {d.activeUploads.map((file) => (
            <div key={file.name} className={styles.euUploadItem}>
              <div className={`${styles.euUploadFileIcon} ${file.type === 'xlsx' ? styles.euFileIconXlsx : file.type === 'pdf' ? styles.euFileIconPdf : styles.euFileIconDocx}`}>
                {file.type.toUpperCase()}
              </div>
              <div className={styles.euUploadFileInfo}>
                <div className={styles.euUploadFileName}>{file.name}</div>
                <div className={styles.euUploadFileSize}>
                  {file.size} &middot; {file.status === 'complete' ? 'Upload complete' : 'Uploading...'}
                </div>
                <div className={styles.euUploadProgressTrack}>
                  <div
                    className={`${styles.euUploadProgressFill} ${file.status === 'complete' ? styles.euProgressComplete : styles.euProgressInProgress}`}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
              <div className={styles.euUploadStatus}>
                {file.status === 'complete' ? (
                  <div className={styles.euUploadCheck} aria-label="Upload complete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                ) : (
                  <>
                    <div className={styles.euUploadStatusPct}>{file.progress}%</div>
                    <div className={styles.euUploadStatusLabel}>uploading</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Previously Uploaded Evidence */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Uploaded Evidence</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{d.evidence.length} files</span>
        </div>
        <div className={styles.euEvidenceGrid}>
          {d.evidence.map((file) => (
            <div key={file.name} className={styles.euEvidenceCard}>
              <div className={`${styles.euEvidencePreview} ${file.type === 'xlsx' ? styles.euPreviewXlsx : file.type === 'pdf' ? styles.euPreviewPdf : styles.euPreviewDocx}`}>
                {file.type.toUpperCase()}
              </div>
              <div className={styles.euEvidenceBody}>
                <div className={styles.euEvidenceFilename}>{file.name}</div>
                <div className={styles.euEvidenceMeta}>{file.size} &middot; {file.date}</div>
                <div className={styles.euEvidenceActions}>
                  {confirmDelete === file.name ? (
                    <>
                      <span style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>Delete?</span>
                      <button className={`${styles.euEvidenceBtn} ${styles.euEvidenceBtnDanger}`} type="button" onClick={() => setConfirmDelete(null)}>Yes</button>
                      <button className={styles.euEvidenceBtn} type="button" onClick={() => setConfirmDelete(null)}>No</button>
                    </>
                  ) : (
                    <>
                      <button className={styles.euEvidenceBtn} type="button">View</button>
                      <button className={styles.euEvidenceBtn} type="button">Download</button>
                      <button className={`${styles.euEvidenceBtn} ${styles.euEvidenceBtnDanger}`} type="button" onClick={() => setConfirmDelete(file.name)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Notes */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Evidence Notes</div>
        </div>
        <textarea
          className={styles.euEvidenceNotes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add context about this evidence — what it shows, how it was prepared, and why it validates this task..."
          aria-label="Evidence notes"
        />
      </div>

      {/* AI Review Card */}
      <div className={styles.euAiCard}>
        <div className={styles.euAiIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className={styles.euAiBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }} aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            AI Review Complete
          </div>
          <div className={styles.euAiTitle}>Customer list validated — 89% revenue coverage confirmed</div>
          <div className={styles.euAiText}>
            Exit OS analyzed your uploaded customer data against your QuickBooks revenue records. The top 10 customers in the spreadsheet account for <strong>89% of FY2025 revenue</strong>, which is sufficient for buyer due diligence. Two items flagged for attention:
          </div>
          {d.aiChecks.map((check, i) => (
            <div key={i} className={styles.euAiCheckRow}>
              {check.type === 'pass' ? (
                <div className={styles.euAiCheck} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              ) : (
                <div className={styles.euAiWarn} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
              )}
              <div className={`${styles.euAiCheckText} ${check.type === 'warn' ? styles.euAiCheckTextMuted : ''}`}>
                {check.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Row */}
      <div className={styles.euActionRow}>
        <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
          Save Draft
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '13px 28px', fontSize: '15px' }} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Submit Evidence
        </button>
      </div>
    </div>
  )
}
