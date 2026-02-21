'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/reports/reports.module.css'

// ── Static Demo Data ─────────────────────────────────────────────────────────
// TODO: wire to API

const REPORT_TYPES = [
  {
    id: 'exit-readiness',
    name: 'Exit Readiness Report',
    desc: 'Comprehensive overview of your company\u2019s exit readiness across all dimensions',
    badge: 'Recommended',
  },
  { id: 'valuation', name: 'Valuation Summary', desc: 'Financial focus \u2014 multiples, DCF analysis, and valuation range breakdown', badge: null },
  { id: 'teaser', name: 'Buyer-Facing Teaser', desc: 'Shareable one-page summary designed for prospective buyers and advisors', badge: null },
  { id: 'financial-summary', name: 'Financial Summary', desc: 'Detailed accounting view \u2014 income statement, balance sheet, and cash flow', badge: null },
  { id: 'ai-diagnosis', name: 'AI Company Diagnosis', desc: 'AI-powered analysis of strengths, risks, and improvement opportunities', badge: null },
  { id: 'retirement', name: 'Retirement Projection', desc: 'Personal financial planning \u2014 retirement income, net worth, and gap analysis', badge: null },
]

const SECTIONS = [
  { id: 'exec-summary', name: 'Executive Summary', checked: true },
  { id: 'bri-score', name: 'BRI Score Breakdown', checked: true },
  { id: 'valuation', name: 'Valuation Overview', checked: true },
  { id: 'financial-highlights', name: 'Financial Highlights', checked: true },
  { id: 'key-strengths', name: 'Key Strengths', checked: true },
  { id: 'critical-gaps', name: 'Critical Gaps', checked: true },
  { id: 'recommended-actions', name: 'Recommended Actions', checked: true },
  { id: 'detailed-financials', name: 'Detailed Financials', checked: false },
  { id: 'buyer-analysis', name: 'Buyer Analysis', checked: false },
  { id: 'competitive-landscape', name: 'Competitive Landscape', checked: false },
  { id: 'timeline', name: 'Timeline', checked: true },
  { id: 'appendix', name: 'Appendix', checked: false },
]

const RECENT_REPORTS = [
  {
    name: 'Exit Readiness Report \u2014 Feb 2026',
    meta: 'Generated Feb 14, 2026 \u00b7 24 pages \u00b7 Confidential',
    iconBg: 'var(--accent-light)',
    iconColor: 'var(--accent)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    name: 'Valuation Summary \u2014 Q4 2025',
    meta: 'Generated Jan 28, 2026 \u00b7 12 pages \u00b7 Internal Only',
    iconBg: 'var(--green-light)',
    iconColor: 'var(--green)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    name: 'Buyer-Facing Teaser \u2014 ServiceMaster LOI',
    meta: 'Generated Jan 10, 2026 \u00b7 4 pages \u00b7 Shareable',
    iconBg: 'var(--purple-light)',
    iconColor: 'var(--purple)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

const CONFIDENTIALITY_OPTIONS = ['Confidential', 'Internal Only', 'Shareable']

// ── Page Component ────────────────────────────────────────────────────────────

export default function ReportBuilderPage() {
  const [selectedType, setSelectedType] = useState('exit-readiness')
  const [sections, setSections] = useState(SECTIONS)
  const [confidentiality, setConfidentiality] = useState(0) // index of CONFIDENTIALITY_OPTIONS
  const [includeAI, setIncludeAI] = useState(true)
  const [includeBranding, setIncludeBranding] = useState(true)

  const checkedCount = sections.filter((s) => s.checked).length

  function toggleSection(id: string) {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, checked: !s.checked } : s))
  }

  function selectAll() { setSections((prev) => prev.map((s) => ({ ...s, checked: true }))) }
  function deselectAll() { setSections((prev) => prev.map((s) => ({ ...s, checked: false }))) }

  const checkedSections = sections.filter((s) => s.checked)

  return (
    <>
      <TrackPageView page="reports_builder" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/reports">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Build Custom Report</span>
      </div>

      {/* Page Header */}
      <div className={styles.reportPageHeader}>
        <div>
          <h1>Build Custom Report</h1>
          <p>Configure and generate a tailored report for Reynolds HVAC Services</p>
        </div>
      </div>

      {/* Two-column builder layout */}
      <div className={styles.builderLayout}>

        {/* LEFT: Steps */}
        <div>

          {/* STEP 1: Report Type */}
          <div className={styles.builderCard}>
            <div className={styles.stepHeading}>
              <span className={styles.stepLabel}>1</span>
              Select Report Type
            </div>
            <div className={styles.reportTypeGrid}>
              {REPORT_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`${styles.reportTypeCard} ${selectedType === type.id ? styles.reportTypeCardSelected : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <input type="radio" name="report-type" value={type.id} defaultChecked={type.id === 'exit-readiness'} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                  <div className={styles.reportTypeCardHeader}>
                    <div className={styles.reportTypeName}>{type.name}</div>
                    {type.badge && <div className={styles.reportTypeBadge}>{type.badge}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div className={styles.reportTypeDesc}>{type.desc}</div>
                    <div className={`${styles.radioDot} ${selectedType === type.id ? styles.radioDotSelected : ''}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* STEP 2: Configure Sections */}
          <div className={styles.builderCard}>
            <div className={styles.stepHeading}>
              <span className={styles.stepLabel}>2</span>
              Configure Sections
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Choose which sections to include in your report. Checked sections will appear in the order shown.
            </p>
            <div className={styles.sectionGrid}>
              {sections.map((s) => (
                <div
                  key={s.id}
                  className={`${styles.sectionCheckItem} ${s.checked ? styles.sectionCheckItemChecked : ''}`}
                  onClick={() => toggleSection(s.id)}
                >
                  <div className={`${styles.checkBox} ${s.checked ? styles.checkBoxChecked : ''}`}>
                    {s.checked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className={styles.sectionCheckName}>{s.name}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {checkedCount} of {sections.length} sections selected &middot;{' '}
              <button onClick={selectAll} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 'inherit' }}>Select All</button>
              {' '}&middot;{' '}
              <button onClick={deselectAll} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 'inherit' }}>Deselect All</button>
            </div>
          </div>

          {/* STEP 3: Report Settings */}
          <div className={styles.builderCard}>
            <div className={styles.stepHeading}>
              <span className={styles.stepLabel}>3</span>
              Report Settings
            </div>
            <div className={styles.settingsGrid} style={{ marginBottom: '20px' }}>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabel}>Report Title</label>
                <input className={styles.formInput} type="text" defaultValue="Exit Readiness Report \u2014 Reynolds HVAC Services" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date Range</label>
                <select className={styles.formSelect}>
                  <option>Full History</option>
                  <option>Last 3 Years</option>
                  <option>Last 12 Months</option>
                  <option>FY 2025</option>
                  <option>Custom Range</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Confidentiality Level</label>
                <div className={styles.radioGroupSegmented}>
                  {CONFIDENTIALITY_OPTIONS.map((opt, i) => (
                    <div
                      key={opt}
                      className={`${styles.radioGroupItem} ${i === confidentiality ? styles.radioGroupItemActive : ''}`}
                      onClick={() => setConfidentiality(i)}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleLabel}>Include AI Commentary</div>
                <div className={styles.toggleDesc}>Add AI-generated insights and narrative analysis throughout the report</div>
              </div>
              <div
                className={`${styles.toggleSwitch} ${!includeAI ? styles.toggleSwitchOff : ''}`}
                onClick={() => setIncludeAI(!includeAI)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleLabel}>Include Exit OS Branding</div>
                <div className={styles.toggleDesc}>Add Exit OS logo and platform attribution to cover page and footer</div>
              </div>
              <div
                className={`${styles.toggleSwitch} ${!includeBranding ? styles.toggleSwitchOff : ''}`}
                onClick={() => setIncludeBranding(!includeBranding)}
              />
            </div>
          </div>

          {/* Recently Generated */}
          <div className={styles.builderCard}>
            <div className={styles.stepHeading} style={{ marginBottom: '4px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ marginRight: '8px', opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Recently Generated
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Your last three reports &mdash; regenerate or download any time.
            </p>
            {RECENT_REPORTS.map((r) => (
              <div key={r.name} className={styles.recentReportItem}>
                <div className={styles.recentReportIcon} style={{ background: r.iconBg, color: r.iconColor }}>
                  {r.icon}
                </div>
                <div className={styles.recentReportInfo}>
                  <div className={styles.recentReportName}>{r.name}</div>
                  <div className={styles.recentReportMeta}>{r.meta}</div>
                </div>
                <div className={styles.recentReportActions}>
                  <button className={styles.btnGhost}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Preview Panel + Generate */}
        <div>
          <div className={styles.previewPanel}>
            <div className={styles.previewPanelTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              Live Preview
            </div>

            <div className={styles.previewDoc}>
              <div className={styles.previewDocHeader}>
                <div className={styles.previewDocLogo}>EXIT OS</div>
                <div className={styles.previewDocTitle}>
                  {REPORT_TYPES.find((t) => t.id === selectedType)?.name ?? 'Exit Readiness Report'}
                </div>
                <div className={styles.previewDocSubtitle}>
                  Reynolds HVAC Services &middot; February 2026 &middot; {CONFIDENTIALITY_OPTIONS[confidentiality]}
                </div>
              </div>
              <div className={styles.previewDocBody}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Contents
                </div>
                {checkedSections.map((s, i) => (
                  <div key={s.id} className={styles.previewSectionItem}>
                    <div className={styles.previewSectionNum}>{i + 1}</div>
                    <div className={styles.previewSectionName}>{s.name}</div>
                  </div>
                ))}
              </div>
              <div className={styles.previewMeta}>
                <div className={styles.previewMetaRow}>
                  <span>Report Type</span>
                  <span style={{ fontWeight: 600 }}>
                    {REPORT_TYPES.find((t) => t.id === selectedType)?.name?.split(' ').slice(0, 2).join(' ') ?? 'Exit Readiness'}
                  </span>
                </div>
                <div className={styles.previewMetaRow}>
                  <span>Est. Pages</span>
                  <span style={{ fontWeight: 600 }}>~{checkedCount * 3} pages</span>
                </div>
                <div className={styles.previewMetaRow}>
                  <span>AI Commentary</span>
                  <span style={{ color: includeAI ? 'var(--green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                    {includeAI ? 'Included' : 'Excluded'}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.generateArea}>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.generateAreaBtn}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                Generate Report
              </button>
              <div className={styles.generateEst}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Estimated time: ~30 seconds
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
