'use client'

import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/reports/reports.module.css'

// ── Static Demo Data ─────────────────────────────────────────────────────────
// TODO: wire to API

const SUMMARY_STATS = [
  { value: '$8.2M', label: 'Estimated Enterprise Value' },
  { value: '71/100', label: 'Business Readiness Index' },
  { value: '18 mo.', label: 'Recommended Exit Timeline' },
  { value: '4.1x', label: 'EBITDA Multiple (Industry)' },
]

const BRI_DIMENSIONS = [
  { name: 'Financial Health', score: 82, color: 'var(--green)' },
  { name: 'Revenue Quality', score: 75, color: 'var(--green)' },
  { name: 'Customer Concentration', score: 62, color: 'var(--orange)' },
  { name: 'Owner Dependence', score: 42, color: 'var(--red)' },
  { name: 'Operational Maturity', score: 68, color: '#B8860B' },
  { name: 'Legal & Compliance', score: 71, color: '#B8860B' },
  { name: 'Market Position', score: 78, color: 'var(--green)' },
]

const VALUATION_METHODS = [
  { method: 'EBITDA Multiple (4.1x \u2014 Industry)', indicated: '$8,200,000', weight: '50%', weighted: '$4,100,000', isTotal: false },
  { method: 'Discounted Cash Flow (WACC 12.5%)', indicated: '$8,600,000', weight: '30%', weighted: '$2,580,000', isTotal: false },
  { method: 'Comparable Transactions', indicated: '$7,800,000', weight: '20%', weighted: '$1,560,000', isTotal: false },
  { method: 'Blended Enterprise Value', indicated: '$8,240,000', weight: '100%', weighted: '$8,240,000', isTotal: true },
]

const KEY_STRENGTHS = [
  { type: 'green', text: '<strong>Consistent revenue growth:</strong> Three-year CAGR of 12% with revenue growing from $10.1M in FY2023 to $12.8M in FY2025, demonstrating durable demand and effective sales execution in both residential and commercial markets.' },
  { type: 'green', text: '<strong>Strong EBITDA margins:</strong> Adjusted EBITDA margin of 16.0% ($2.05M on $12.8M revenue) exceeds the industry average of 13\u201314% for comparable HVAC service businesses, reflecting disciplined cost management and effective pricing.' },
  { type: 'green', text: '<strong>Experienced operational team:</strong> A 45-person workforce with seasoned department leads in field operations, dispatch, and customer service provides continuity of operations independent of owner-driven customer relationships.' },
  { type: 'green', text: '<strong>Clean financial documentation:</strong> Three years of reviewed financial statements prepared by an independent CPA with clear add-back schedules and consistent accounting methodology will facilitate buyer due diligence and reduce transaction friction.' },
  { type: 'green', text: '<strong>Established market position:</strong> 23 years in operation with strong brand recognition in the Austin metropolitan area, active maintenance contracts providing recurring revenue, and proven capabilities across residential, commercial, and light industrial segments.' },
]

const CRITICAL_GAPS = [
  { type: 'orange', text: '<strong>Owner dependence (BRI: 42/100):</strong> The owner is the primary relationship holder for 7 of the top 10 commercial accounts and the sole decision-maker for all bids above $50,000. This concentration poses significant acquisition risk and will likely result in earn-out provisions that reduce effective deal value at close.' },
  { type: 'orange', text: '<strong>Customer concentration (BRI: 62/100):</strong> The top 3 commercial customers represent approximately 34% of total revenue. Buyers will scrutinize this concentration, and loss of any single customer post-acquisition could materially impact performance against projections.' },
  { type: 'orange', text: '<strong>Undocumented operational processes:</strong> Key service delivery workflows, supplier agreements, and equipment maintenance protocols exist primarily as institutional knowledge. Formal SOP documentation is a prerequisite for any strategic acquirer seeking scalable operations.' },
  { type: 'orange', text: '<strong>No general manager in place:</strong> The absence of a senior operational leader who can own P&L responsibility will be a significant concern for financial buyers (PE) who require management continuity post-close. Hiring or promoting a GM is the highest-leverage action available.' },
  { type: 'orange', text: '<strong>Lease agreements not assignable:</strong> The current leases on the primary service facility and secondary equipment yard contain change-of-control clauses that require landlord consent for assignment. This must be resolved prior to signing a letter of intent to avoid material deal delays.' },
]

const PRIORITY_ACTIONS = [
  { num: 1, action: 'Hire or promote a General Manager to own operational P&L and lead field operations', priority: 'high', timeline: '0\u201390 days', impact: '+$350,000\u2013$500,000' },
  { num: 2, action: 'Transition top 7 commercial account relationships from owner to senior sales/ops team', priority: 'high', timeline: '90\u2013180 days', impact: '+$200,000\u2013$300,000' },
  { num: 3, action: 'Negotiate assignable lease amendments with both landlords; obtain landlord estoppel letters', priority: 'high', timeline: '60\u2013120 days', impact: 'Risk Mitigation' },
  { num: 4, action: 'Document 12 core operational SOPs covering dispatch, estimating, and service delivery', priority: 'medium', timeline: '120\u2013240 days', impact: '+$100,000\u2013$150,000' },
  { num: 5, action: 'Expand recurring maintenance contract revenue to 25% of total (currently 18%)', priority: 'medium', timeline: '180\u2013365 days', impact: '+$80,000\u2013$120,000' },
]

const TIMELINE_ITEMS = [
  { dot: 'Q1', state: 'done', period: 'Now \u2014 March 2026', milestone: 'Foundations: Management & Legal', desc: 'Initiate GM search or internal promotion. Engage legal counsel to begin lease amendment negotiations. Commission formal Quality of Earnings report.' },
  { dot: 'Q2', state: 'active', period: 'April \u2014 June 2026', milestone: 'Relationship Transition & SOP Development', desc: 'Systematically transition commercial account relationships. Begin SOP documentation for 12 core processes. Finalize lease assignability. GM onboarded and managing day-to-day operations.' },
  { dot: 'Q3', state: 'future', period: 'July \u2014 September 2026', milestone: 'Revenue Quality Enhancement', desc: 'Launch commercial maintenance contract expansion campaign. Target 25% recurring revenue mix. Finalize SOP documentation and conduct internal review. Update financial model with trailing 12-month performance.' },
  { dot: 'Q4\u2013Q1', state: 'future', period: 'October 2026 \u2014 March 2027', milestone: 'Market Preparation & Advisor Engagement', desc: 'Engage M&A advisor or investment bank. Prepare Confidential Information Memorandum (CIM). Compile data room documentation. Refine financial model and management presentation.' },
  { dot: 'Go-To-Market', state: 'future', period: 'Q2\u2013Q4 2027', milestone: 'Market Process & Transaction', desc: 'Run structured sale process. Target PE firms and strategic acquirers in the HVAC services roll-up space. Negotiate LOI, manage due diligence, and close transaction. Projected enterprise value: $9.0M\u2013$9.5M.' },
]

// ── Sub-Components ────────────────────────────────────────────────────────────

function FindingIcon({ type }: { type: 'green' | 'orange' }) {
  if (type === 'green') {
    return (
      <div className={`${styles.findingIcon} ${styles.findingIconGreen}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    )
  }
  return (
    <div className={`${styles.findingIcon} ${styles.findingIconOrange}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>
  )
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function ExitReadinessReportPage() {
  // BRI circumference calculation: r=66, C=2πr≈414.69; 71% of 414.69≈294.4
  const BRI_SCORE = 71
  const circumference = 2 * Math.PI * 66
  const filled = (BRI_SCORE / 100) * circumference
  const empty = circumference - filled

  return (
    <>
      <TrackPageView page="reports_exit_readiness" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/reports">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Exit Readiness Report</span>
      </div>

      {/* Page Header */}
      <div className={styles.reportPageHeader}>
        <div>
          <h1>Exit Readiness Report</h1>
          <p>Reynolds HVAC Services &mdash; Generated February 15, 2026 &middot; 24 pages</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Regenerate
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Viewer Bar */}
      <div className={styles.reportViewerBar}>
        <div className={styles.reportViewerInfo}>
          <div className={`${styles.reportViewerIcon} ${styles.reportViewerIconRed}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div className={styles.reportViewerTitle}>Exit Readiness Report</div>
            <div className={styles.reportViewerMeta}>Reynolds HVAC Services &middot; Generated Feb 15, 2026 &middot; Showing pages 1&ndash;3 of 24</div>
          </div>
        </div>
        <div className={styles.reportViewerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Document Container */}
      <div className={styles.documentContainer}>

        {/* PAGE 1: Cover */}
        <div className={styles.docPage}>
          <div className={styles.coverPage}>
            <div className={styles.coverPageContent}>
              <div className={styles.coverLogo}>
                <svg viewBox="0 0 32 32" fill="none" width="36" height="36">
                  <rect width="32" height="32" rx="8" fill="#0071E3" />
                  <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.coverLogoText}>Exit OS</span>
              </div>
              <div className={styles.coverConfidential}>Confidential &mdash; For Authorized Recipients Only</div>
              <div className={styles.coverReportType}>Business Readiness Index</div>
              <div className={styles.coverTitle}>EXIT READINESS<br />REPORT</div>
              <div className={styles.coverSubtitle}>Reynolds HVAC Services</div>
              <div className={styles.coverDivider} />
              <div className={styles.coverMeta}>
                <div className={styles.coverMetaItem}>
                  <div className={styles.coverMetaLabel}>Date Issued</div>
                  <div className={styles.coverMetaValue}>February 15, 2026</div>
                </div>
                <div className={styles.coverMetaItem}>
                  <div className={styles.coverMetaLabel}>Prepared For</div>
                  <div className={styles.coverMetaValue}>Mike Reynolds, Owner</div>
                </div>
                <div className={styles.coverMetaItem}>
                  <div className={styles.coverMetaLabel}>Industry</div>
                  <div className={styles.coverMetaValue}>HVAC Services &mdash; Residential &amp; Commercial</div>
                </div>
              </div>
            </div>
            <div className={styles.coverFooter}>
              <div className={styles.coverFooterLeft}>
                Exit OS Platform &mdash; Confidential Report<br />
                This report contains proprietary financial analysis and should<br />not be distributed without the express consent of the owner.
              </div>
              <div className={styles.coverScoreBadge}>
                <div className={styles.coverScoreValue}>71</div>
                <div className={styles.coverScoreLabel}>BRI Score / 100</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.pageBreak}><span className={styles.pageBreakLabel}>Page 2</span></div>

        {/* PAGE 2: Executive Summary + BRI */}
        <div className={styles.docPage}>
          <div className={styles.reportBodyPage}>
            <div className={styles.reportBodyHeader}>
              <div className={styles.reportBodyCompany}>Reynolds HVAC Services</div>
              <div className={styles.reportBodyTitle}>
                <strong>Exit Readiness Report</strong>
                <br />February 15, 2026 &mdash; Confidential
              </div>
            </div>

            {/* Section 1: Executive Summary */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 1</div>
              <div className={styles.reportSectionTitle}>Executive Summary</div>

              <div className={styles.summaryStats}>
                {SUMMARY_STATS.map((s) => (
                  <div key={s.label} className={styles.summaryStat}>
                    <div className={styles.summaryStatValue}>{s.value}</div>
                    <div className={styles.summaryStatLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              <p className={styles.reportBodyText}>
                Reynolds HVAC Services has demonstrated consistent financial performance over the past three years,
                generating $12.8 million in revenue and $2.05 million in adjusted EBITDA for fiscal year 2025. The
                business has achieved a Business Readiness Index (BRI) score of 71 out of 100, reflecting a company
                that is well-positioned for a near-term exit with several identifiable areas for value enhancement
                prior to going to market.
              </p>
              <p className={styles.reportBodyText}>
                Based on a blended valuation analysis incorporating industry multiples, discounted cash flow modeling,
                and comparable transaction data, Reynolds HVAC Services is currently valued at approximately{' '}
                <strong>$8.2 million</strong>, with a reasonable range of $7.4 million to $9.1 million. The primary
                valuation driver is the company&rsquo;s adjusted EBITDA multiple of 4.1x, consistent with recent HVAC
                services transactions in the $10&ndash;15 million revenue range.
              </p>
              <p className={styles.reportBodyText}>
                The most significant risk factor identified in this assessment is <strong>owner dependence</strong>,
                which scored 42 out of 100. Mike Reynolds is currently central to key customer relationships, estimating
                functions, and supplier negotiations. Reducing this dependency over the recommended 18-month timeline is
                projected to add $400,000 to $600,000 in enterprise value by improving buyer confidence and reducing
                deal-structure risk (earn-outs, holdbacks).
              </p>
              <p className={styles.reportBodyText}>
                With targeted improvements in documented processes, customer concentration reduction, and succession
                planning for key roles, Reynolds HVAC Services is positioned to achieve a full acquisition in the
                $9.0 million to $9.5 million range within an 18-month horizon.
              </p>
            </div>

            {/* Section 2: BRI Score */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 2</div>
              <div className={styles.reportSectionTitle}>Business Readiness Index (BRI)</div>

              <p className={styles.reportBodyText}>
                The Business Readiness Index assesses seven dimensions of exit readiness on a 100-point scale. A score
                of 71 places Reynolds HVAC Services in the <strong>Strong</strong> category.
              </p>

              <div className={styles.briLayout}>
                <div className={styles.briRingWrap}>
                  <div className={styles.briRingLabel}>Overall BRI Score</div>
                  <div className={styles.briRing}>
                    <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', width: 160, height: 160 }}>
                      <circle cx="80" cy="80" r="66" fill="none" stroke="var(--border-light)" strokeWidth="12" />
                      <circle
                        cx="80" cy="80" r="66" fill="none"
                        stroke="#FFD60A" strokeWidth="12"
                        strokeDasharray={`${filled.toFixed(1)} ${empty.toFixed(1)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className={styles.briRingCenter}>
                      <div className={styles.briScoreBig}>
                        71<span className={styles.briScoreDenom}>/100</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.briRingSubLabel} style={{ color: '#B8860B', fontWeight: 700 }}>Strong</div>
                </div>

                <div className={styles.briDimensions}>
                  {BRI_DIMENSIONS.map((dim) => (
                    <div key={dim.name} className={styles.briDimRow}>
                      <div className={styles.briDimName}>{dim.name}</div>
                      <div className={styles.briDimTrack}>
                        <div className={styles.briDimFill} style={{ width: `${dim.score}%`, background: dim.color }} />
                      </div>
                      <div className={styles.briDimScore} style={{ color: dim.color }}>{dim.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.reportFooterRow}>
              <div className={styles.reportFooterLeft}>Exit OS Platform &mdash; Confidential &mdash; Reynolds HVAC Services<br />This document is intended solely for the use of the named recipient.</div>
              <div className={styles.reportFooterRight}>Page 2 of 24</div>
            </div>
          </div>
        </div>

        <div className={styles.pageBreak}><span className={styles.pageBreakLabel}>Page 3</span></div>

        {/* PAGE 3: Valuation, Strengths, Gaps, Actions, Timeline */}
        <div className={styles.docPage}>
          <div className={styles.reportBodyPage}>
            <div className={styles.reportBodyHeader}>
              <div className={styles.reportBodyCompany}>Reynolds HVAC Services</div>
              <div className={styles.reportBodyTitle}>
                <strong>Exit Readiness Report</strong>
                <br />February 15, 2026 &mdash; Confidential
              </div>
            </div>

            {/* Section 3: Valuation Overview */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 3</div>
              <div className={styles.reportSectionTitle}>Valuation Overview</div>
              <p className={styles.reportBodyText}>
                The estimated enterprise value of Reynolds HVAC Services is <strong>$8.2 million</strong>, derived from
                a weighted blended analysis of three standard valuation methodologies.
              </p>
              <table className={styles.reportValTable}>
                <thead>
                  <tr>
                    <th>Methodology</th>
                    <th>Indicated Value</th>
                    <th>Weight</th>
                    <th>Weighted Value</th>
                  </tr>
                </thead>
                <tbody>
                  {VALUATION_METHODS.map((row) => (
                    <tr key={row.method}>
                      <td>{row.isTotal ? <strong>{row.method}</strong> : row.method}</td>
                      <td>{row.isTotal ? <strong>{row.indicated}</strong> : row.indicated}</td>
                      <td><span className={styles.weightPill}>{row.weight}</span></td>
                      <td>{row.isTotal ? <strong>{row.weighted}</strong> : row.weighted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 4: Key Strengths */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 4</div>
              <div className={styles.reportSectionTitle}>Key Strengths</div>
              <ul className={styles.findingsList}>
                {KEY_STRENGTHS.map((item, i) => (
                  <li key={i}>
                    <FindingIcon type={item.type as 'green' | 'orange'} />
                    <span dangerouslySetInnerHTML={{ __html: item.text }} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 5: Critical Gaps */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 5</div>
              <div className={styles.reportSectionTitle}>Critical Gaps</div>
              <ul className={styles.findingsList}>
                {CRITICAL_GAPS.map((item, i) => (
                  <li key={i}>
                    <FindingIcon type={item.type as 'green' | 'orange'} />
                    <span dangerouslySetInnerHTML={{ __html: item.text }} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 6: Priority Actions */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 6</div>
              <div className={styles.reportSectionTitle}>Recommended Priority Actions</div>
              <p className={styles.reportBodyText}>
                The following five actions represent the highest-return improvements available ahead of a go-to-market
                process. Completing all five is projected to increase enterprise value by $600,000 to $900,000.
              </p>
              <table className={styles.actionsTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Action</th>
                    <th>Priority</th>
                    <th>Timeline</th>
                    <th>Est. Value Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIORITY_ACTIONS.map((row) => (
                    <tr key={row.num}>
                      <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{row.num}</td>
                      <td>{row.action}</td>
                      <td>
                        <span className={`${styles.priorityPill} ${row.priority === 'high' ? styles.priorityPillHigh : styles.priorityPillMedium}`}>
                          {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                        </span>
                      </td>
                      <td>{row.timeline}</td>
                      <td className={styles.actionImpact}>{row.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 7: Exit Timeline */}
            <div className={styles.reportSection} style={{ marginBottom: 0 }}>
              <div className={styles.reportSectionNumber}>Section 7</div>
              <div className={styles.reportSectionTitle}>Recommended 18-Month Exit Timeline</div>
              <p className={styles.reportBodyText}>
                The following milestone schedule is designed to maximize enterprise value ahead of a formal go-to-market
                process targeted for Q3&ndash;Q4 2027.
              </p>
              <div className={styles.reportTimeline}>
                <div className={styles.reportTimelineTrack} />
                {TIMELINE_ITEMS.map((item, i) => (
                  <div key={i} className={styles.reportTimelineItem}>
                    <div className={`${styles.reportTimelineDot} ${item.state === 'done' ? styles.reportTimelineDotDone : item.state === 'active' ? styles.reportTimelineDotActive : styles.reportTimelineDotFuture}`}>
                      {item.dot}
                    </div>
                    <div className={styles.reportTimelineContent}>
                      <div className={styles.reportTimelinePeriod}>{item.period}</div>
                      <div className={styles.reportTimelineMilestone}>{item.milestone}</div>
                      <div className={styles.reportTimelineDesc}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.reportFooterRow}>
              <div className={styles.reportFooterLeft}>Exit OS Platform &mdash; Confidential &mdash; Reynolds HVAC Services<br />This report is for planning purposes only and does not constitute financial or legal advice.</div>
              <div className={styles.reportFooterRight}>Page 3 of 24</div>
            </div>
          </div>
        </div>

      </div>
      {/* /document-container */}

      {/* Page Navigation */}
      <div className={styles.pageNav}>
        <button className={styles.pageNavBtn} disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous
        </button>
        <span className={styles.pageNavInfo}>Showing pages <strong>1&ndash;3</strong> of <strong>24</strong></span>
        <button className={styles.pageNavBtn}>
          Next
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </>
  )
}
