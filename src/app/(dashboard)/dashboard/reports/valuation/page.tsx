'use client'

import Link from 'next/link'
import styles from '@/components/reports/reports.module.css'

// TODO: wire to API — /api/companies/[id]/reports/valuation

const EBITDA_TABLE = [
  { label: 'Reported Net Income', fy23: '$810,000', fy24: '$1,020,000', fy25: '$1,240,000' },
  { label: '+ Interest Expense', fy23: '$112,000', fy24: '$98,000', fy25: '$87,000' },
  { label: '+ Depreciation & Amortization', fy23: '$184,000', fy24: '$196,000', fy25: '$203,000' },
  { label: '= EBITDA', fy23: '$1,106,000', fy24: '$1,314,000', fy25: '$1,530,000' },
  { label: '+ Owner Compensation Normalization', fy23: '$280,000', fy24: '$310,000', fy25: '$320,000' },
  { label: '+ One-Time Expenses', fy23: '$85,000', fy24: '$145,000', fy25: '$200,000' },
]

const DCF_ASSUMPTIONS = [
  { label: 'WACC', value: '12.5%', note: 'Risk-free 4.5% + equity premium' },
  { label: 'Revenue CAGR (Yr 1–3)', value: '8.0%', note: 'Below recent 12% to be conservative' },
  { label: 'Revenue CAGR (Yr 4–5)', value: '5.5%', note: 'Normalization toward market rate' },
  { label: 'Terminal Growth Rate', value: '2.5%', note: 'Long-term GDP-level growth' },
  { label: 'EBITDA Margin Target', value: '16.5%', note: 'Modest expansion from 16.0%' },
  { label: 'Capital Intensity', value: '5.2%', note: 'Capex % of revenue, stable' },
]

const COMPS = [
  { company: 'HVAC Services Co. A', ev: '$7.2M', revenue: '$9.8M', ebitda: '$1.65M', multiple: '4.4x', year: '2024' },
  { company: 'HVAC Services Co. B', ev: '$11.4M', revenue: '$14.2M', ebitda: '$2.28M', multiple: '5.0x', year: '2024' },
  { company: 'HVAC Services Co. C', ev: '$5.8M', revenue: '$8.1M', ebitda: '$1.32M', multiple: '4.4x', year: '2023' },
  { company: 'HVAC Services Co. D', ev: '$9.1M', revenue: '$11.6M', ebitda: '$1.91M', multiple: '4.8x', year: '2023' },
  { company: 'HVAC Services Co. E', ev: '$6.4M', revenue: '$10.2M', ebitda: '$1.74M', multiple: '3.7x', year: '2022' },
  { company: 'HVAC Services Co. F', ev: '$8.3M', revenue: '$13.0M', ebitda: '$2.06M', multiple: '4.0x', year: '2022' },
]

export default function ValuationReportPage() {
  return (
    <>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/reports">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Valuation Summary</span>
      </nav>

      {/* Page Header */}
      <div className={styles.reportPageHeader}>
        <div>
          <h1>Valuation Summary Report</h1>
          <p>Reynolds HVAC Services &mdash; Generated February 15, 2026 &middot; 4 pages</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Regenerate
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Viewer Bar */}
      <div className={styles.reportViewerBar}>
        <div className={styles.reportViewerInfo}>
          <div className={`${styles.reportViewerIcon} ${styles.reportViewerIconBlue}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--accent)' }} aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div>
            <div className={styles.reportViewerTitle}>Valuation Summary Report</div>
            <div className={styles.reportViewerMeta}>Reynolds HVAC Services &middot; Generated Feb 15, 2026 &middot; Showing pages 1&ndash;2 of 4</div>
          </div>
        </div>
        <div className={styles.reportViewerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            Previous
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Document Container */}
      <div className={styles.documentContainer}>

        {/* PAGE 1: Cover */}
        <div className={styles.docPage}>
          <div className={styles.coverPage}>
            <div className={styles.coverContent}>
              <div className={styles.coverLogo}>
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0071E3"/><path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className={styles.coverLogoText}>Exit OSx</span>
              </div>
              <div className={styles.coverConfidential}>Confidential &mdash; Valuation Analysis</div>
              <div className={styles.coverReportType}>Enterprise Valuation</div>
              <div className={styles.coverTitle}>VALUATION<br />SUMMARY<br />REPORT</div>
              <div className={styles.coverSubtitle}>Reynolds HVAC Services</div>
              <div className={styles.coverDivider} />
              <div className={styles.coverMeta}>
                <div>
                  <div className={styles.coverMetaLabel}>Date Issued</div>
                  <div className={styles.coverMetaValue}>February 15, 2026</div>
                </div>
                <div>
                  <div className={styles.coverMetaLabel}>Fiscal Year</div>
                  <div className={styles.coverMetaValue}>FY2025</div>
                </div>
                <div>
                  <div className={styles.coverMetaLabel}>Methodology</div>
                  <div className={styles.coverMetaValue}>Blended (3 Methods)</div>
                </div>
              </div>
            </div>
            <div className={styles.coverFooter}>
              <div className={styles.coverFooterLeft}>
                Exit OSx Platform &mdash; Confidential<br />
                For planning purposes only. Not a formal appraisal.
              </div>
              <div className={styles.coverValBadge}>
                <div className={styles.coverValValue}>$8.2M</div>
                <div className={styles.coverValRange}>Range: $7.4M &ndash; $9.1M</div>
                <div className={styles.coverValLabel}>Estimated Enterprise Value</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.pageBreak}><span className={styles.pageBreakLabel}>Page 2</span></div>

        {/* PAGE 2: Valuation Content */}
        <div className={styles.docPage}>
          <div className={styles.reportBodyPage}>
            <div className={styles.reportBodyHeader}>
              <div className={styles.reportBodyCompany}>Reynolds HVAC Services</div>
              <div className={styles.reportBodyTitle}>
                <strong>Valuation Summary Report</strong>
                February 15, 2026 &mdash; Confidential
              </div>
            </div>

            {/* Valuation Conclusion */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 1</div>
              <div className={styles.reportSectionTitle}>Valuation Conclusion</div>

              <div className={styles.valConclusion}>
                <div className={styles.valConclusionLeft}>
                  <div className={styles.valConclusionLabel}>Estimated Enterprise Value</div>
                  <div className={styles.valConclusionAmount}>$8,200,000</div>
                  <div className={styles.valConclusionRange}>Reasonable range: <strong>$7,400,000</strong> to <strong>$9,100,000</strong></div>
                </div>
                <div className={styles.valConclusionRight}>
                  <div className={styles.valStat}>
                    <div className={styles.valStatLabel}>EBITDA Multiple</div>
                    <div className={`${styles.valStatValue} ${styles.valStatBlue}`}>4.1x</div>
                  </div>
                  <div className={styles.valStat}>
                    <div className={styles.valStatLabel}>Adj. EBITDA</div>
                    <div className={`${styles.valStatValue} ${styles.valStatGreen}`}>$2.05M</div>
                  </div>
                  <div className={styles.valStat}>
                    <div className={styles.valStatLabel}>Revenue</div>
                    <div className={`${styles.valStatValue} ${styles.valStatPurple}`}>$12.8M</div>
                  </div>
                </div>
              </div>

              <p className={styles.reportBodyText}>
                The valuation conclusion of $8,200,000 represents the blended enterprise value of Reynolds HVAC Services as of February 15, 2026, based on fiscal year 2025 financial performance. This estimate is derived from a weighted average of three independent methodologies: EBITDA multiples analysis (50%), discounted cash flow modeling (30%), and comparable transaction analysis (20%). The reasonable value range of $7.4 million to $9.1 million reflects sensitivity to buyer type, market conditions at time of sale, and the company&apos;s ability to demonstrate management independence prior to closing.
              </p>
            </div>

            {/* Section 2: Methodology */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 2</div>
              <div className={styles.reportSectionTitle}>Valuation Methodology Overview</div>
              <p className={styles.reportBodyText}>Three standard methodologies were employed to triangulate enterprise value. Each method reflects different aspects of the business&apos;s performance, risk profile, and market positioning.</p>

              <div className={styles.methodCards}>
                <div className={`${styles.methodCard} ${styles.methodCardPrimary}`}>
                  <div className={`${styles.methodCardTag} ${styles.methodCardTagPrimary}`}>Primary &mdash; 50% Weight</div>
                  <div className={styles.methodCardName}>EBITDA Multiples Analysis</div>
                  <div className={styles.methodCardValue}>$8,200,000</div>
                  <div className={styles.methodCardWeight}>4.1x multiple &middot; Adj. EBITDA <strong>$2,050,000</strong></div>
                </div>
                <div className={styles.methodCard}>
                  <div className={`${styles.methodCardTag} ${styles.methodCardTagSecondary}`}>Secondary &mdash; 30% Weight</div>
                  <div className={styles.methodCardName}>Discounted Cash Flow</div>
                  <div className={styles.methodCardValue}>$8,600,000</div>
                  <div className={styles.methodCardWeight}>WACC 12.5% &middot; 5-year projection</div>
                </div>
                <div className={styles.methodCard}>
                  <div className={`${styles.methodCardTag} ${styles.methodCardTagSecondary}`}>Supporting &mdash; 20% Weight</div>
                  <div className={styles.methodCardName}>Comparable Transactions</div>
                  <div className={styles.methodCardValue}>$7,800,000</div>
                  <div className={styles.methodCardWeight}>6 transactions &middot; 2022&ndash;2025</div>
                </div>
              </div>

              <div className={styles.weightingBar}>
                <div className={styles.weightingSeg} style={{ width: '50%', background: 'var(--accent)' }}>50%</div>
                <div className={styles.weightingSeg} style={{ width: '30%', background: 'var(--purple)' }}>30%</div>
                <div className={styles.weightingSeg} style={{ width: '20%', background: 'var(--green)' }}>20%</div>
              </div>
              <div className={styles.weightingLegend}>
                <div className={styles.weightingLegendItem}><div className={styles.weightingDot} style={{ background: 'var(--accent)' }} />EBITDA Multiples (50%)</div>
                <div className={styles.weightingLegendItem}><div className={styles.weightingDot} style={{ background: 'var(--purple)' }} />Discounted Cash Flow (30%)</div>
                <div className={styles.weightingLegendItem}><div className={styles.weightingDot} style={{ background: 'var(--green)' }} />Comparable Transactions (20%)</div>
              </div>
            </div>

            {/* Section 3: EBITDA Multiples */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 3</div>
              <div className={styles.reportSectionTitle}>EBITDA Multiples Analysis</div>
              <p className={styles.reportBodyText}>The industry multiples method applies a market-derived earnings multiple to the company&apos;s trailing twelve-month adjusted EBITDA. Industry multiples for HVAC service businesses currently range from 3.5x to 5.0x EBITDA.</p>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>FY2023</th>
                    <th>FY2024</th>
                    <th>FY2025 (TTM)</th>
                  </tr>
                </thead>
                <tbody>
                  {EBITDA_TABLE.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.fy23}</td>
                      <td>{row.fy24}</td>
                      <td>{row.fy25}</td>
                    </tr>
                  ))}
                  <tr className={styles.reportTableTotal}>
                    <td>Adjusted EBITDA</td>
                    <td>$1,471,000</td>
                    <td>$1,769,000</td>
                    <td><strong>$2,050,000</strong></td>
                  </tr>
                  <tr className={styles.reportTableSecondary}>
                    <td>Applied Multiple (4.1x)</td>
                    <td>&mdash;</td>
                    <td>&mdash;</td>
                    <td>4.1x</td>
                  </tr>
                  <tr className={styles.reportTableTotal}>
                    <td>Indicated Value</td>
                    <td>&mdash;</td>
                    <td>&mdash;</td>
                    <td><strong>$8,205,000</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 4: DCF */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 4</div>
              <div className={styles.reportSectionTitle}>Discounted Cash Flow Analysis</div>
              <p className={styles.reportBodyText}>The DCF model projects free cash flows over a five-year horizon and discounts them to present value using a WACC of 12.5%. Terminal value is calculated using the Gordon Growth Model with a long-term growth rate of 2.5%. The model yields an enterprise value of $8.6 million.</p>
              <div className={styles.assumptionsGrid}>
                {DCF_ASSUMPTIONS.map((a) => (
                  <div key={a.label} className={styles.assumptionItem}>
                    <div className={styles.assumptionLabel}>{a.label}</div>
                    <div className={styles.assumptionValue}>{a.value}</div>
                    <div className={styles.assumptionNote}>{a.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Comparable Transactions */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionNumber}>Section 5</div>
              <div className={styles.reportSectionTitle}>Comparable Transaction Analysis</div>
              <p className={styles.reportBodyText}>Six comparable HVAC services transactions completed between 2022 and 2025 were analyzed. All companies were in the $8M&ndash;$15M revenue range and located in Sun Belt markets.</p>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Enterprise Value</th>
                    <th>Revenue</th>
                    <th>EBITDA</th>
                    <th>EV/EBITDA</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPS.map((c) => (
                    <tr key={c.company}>
                      <td>{c.company}</td>
                      <td>{c.ev}</td>
                      <td>{c.revenue}</td>
                      <td>{c.ebitda}</td>
                      <td style={{ fontWeight: 600 }}>{c.multiple}</td>
                      <td>{c.year}</td>
                    </tr>
                  ))}
                  <tr className={styles.reportTableTotal}>
                    <td>Median Multiple</td>
                    <td>&mdash;</td>
                    <td>&mdash;</td>
                    <td>&mdash;</td>
                    <td><strong>4.4x</strong></td>
                    <td>&mdash;</td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.reportNote}>
                <strong>Applied multiple:</strong> 3.8x applied to Reynolds HVAC Services (discount to median) reflecting owner dependence risk and geographic concentration. Applied to TTM Adj. EBITDA of $2.05M yields comparable value of $7.79M.
              </div>
            </div>

            {/* Disclaimer */}
            <div className={styles.disclaimer}>
              <div className={styles.disclaimerTitle}>Important Disclaimer</div>
              <div className={styles.disclaimerText}>
                This valuation analysis is prepared by the Exit OSx platform for internal planning purposes only and does not constitute a formal business appraisal, fairness opinion, or investment advice. The conclusions presented are estimates based on publicly available market data and company-provided financials. Actual transaction value may differ materially based on buyer type, deal structure, market conditions, and due diligence findings. This analysis should not be shared with third parties without the consent of the business owner.
              </div>
            </div>

            <div className={styles.reportFooterRow}>
              <div className={styles.reportFooterLeft}>Exit OSx Platform &mdash; Confidential &mdash; Reynolds HVAC Services<br />This document is intended solely for the use of the named recipient.</div>
              <div className={styles.reportFooterRight}>Page 2 of 4</div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
