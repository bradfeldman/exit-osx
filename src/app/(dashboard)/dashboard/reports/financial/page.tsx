'use client'

import Link from 'next/link'
import styles from '@/components/reports/reports.module.css'

// TODO: wire to API — /api/companies/[id]/reports/financial

const P_AND_L = [
  { label: 'Revenue', fy23: '$10,890,000', fy24: '$11,810,000', fy25: '$12,800,000', cagr: '+8.4%', type: 'group' },
  { label: 'YoY Growth', fy23: '—', fy24: '+8.5%', fy25: '+8.4%', cagr: '—', type: 'indent', posFy24: true, posFy25: true },
  { label: 'Cost of Goods Sold', fy23: '($6,099,600)', fy24: '($6,613,600)', fy25: '($7,040,000)', cagr: '+7.3%', type: 'normal' },
  { label: 'Gross Profit', fy23: '$4,790,400', fy24: '$5,196,400', fy25: '$5,760,000', cagr: '+9.7%', type: 'group', posCAGR: true },
  { label: 'Gross Margin', fy23: '44.0%', fy24: '44.0%', fy25: '45.0%', cagr: '—', type: 'indent' },
  { label: 'Operating Expenses', fy23: '($3,195,000)', fy24: '($3,462,000)', fy25: '($3,710,000)', cagr: '+7.8%', type: 'normal' },
  { label: 'Salaries & Admin', fy23: '($1,900,000)', fy24: '($2,050,000)', fy25: '($2,200,000)', cagr: '+7.5%', type: 'indent' },
  { label: 'Marketing & Sales', fy23: '($380,000)', fy24: '($412,000)', fy25: '($445,000)', cagr: '+8.2%', type: 'indent' },
  { label: 'Fleet & Equipment', fy23: '($520,000)', fy24: '($572,000)', fy25: '($618,000)', cagr: '+9.0%', type: 'indent' },
  { label: 'Other OpEx', fy23: '($395,000)', fy24: '($428,000)', fy25: '($447,000)', cagr: '+6.4%', type: 'indent' },
  { label: 'EBITDA', fy23: '$1,595,400', fy24: '$1,734,400', fy25: '$2,050,000', cagr: '+13.3%', type: 'highlight', posCAGR: true },
  { label: 'EBITDA Margin', fy23: '14.7%', fy24: '14.7%', fy25: '16.0%', cagr: '—', type: 'indent' },
  { label: 'Depreciation & Amortization', fy23: '($295,000)', fy24: '($336,000)', fy25: '($384,000)', cagr: '+14.1%', type: 'normal' },
  { label: 'Interest Expense', fy23: '($62,000)', fy24: '($71,000)', fy25: '($78,000)', cagr: '+12.1%', type: 'normal' },
  { label: 'Income Tax (26%)', fy23: '($322,304)', fy24: '($345,844)', fy25: '($410,280)', cagr: '—', type: 'normal' },
  { label: 'Net Income', fy23: '$916,096', fy24: '$981,556', fy25: '$1,177,720', cagr: '+13.3%', type: 'total', posCAGR: true },
  { label: 'Net Margin', fy23: '8.4%', fy24: '8.3%', fy25: '9.2%', cagr: '—', type: 'indent' },
]

const EBITDA_ITEMS = [
  { label: 'Reported EBITDA', amount: '$2,050,000', type: 'base' },
  { label: '+ Owner excess compensation (above market)', amount: '+$120,000', type: 'add' },
  { label: '+ Owner personal vehicle (non-business)', amount: '+$18,400', type: 'add' },
  { label: '+ One-time legal expense (dispute settled)', amount: '+$45,000', type: 'add' },
  { label: '+ Owner health insurance (family)', amount: '+$28,800', type: 'add' },
  { label: '+ Non-recurring equipment write-off', amount: '+$31,000', type: 'add' },
  { label: '− Ongoing investment in tech/software (buyer would incur)', amount: '−$24,200', type: 'sub' },
]

const RISKS = [
  { severity: 'medium', title: 'Customer Concentration', desc: 'Top customer represents 12% of revenue, above the 10% threshold that triggers buyer diligence questions.', badge: 'Medium' },
  { severity: 'high', title: 'Owner Dependence', desc: 'Owner is central to key customer relationships, estimating functions, and supplier negotiations.', badge: 'High' },
  { severity: 'low', title: 'Financial Reporting', desc: 'Books are clean, QuickBooks-synced, and 3-year auditable. Strong positive signal for buyers.', badge: 'Low Risk' },
]

function getRowClass(type: string) {
  if (type === 'group') return styles.rTableRowGroup
  if (type === 'indent') return styles.rTableRowIndent
  if (type === 'total') return styles.rTableRowTotal
  if (type === 'highlight') return styles.rTableRowHighlight
  return ''
}

export default function FinancialReportPage() {
  return (
    <>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/reports">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Financial Summary</span>
      </nav>

      {/* Page Header */}
      <div className={styles.reportPageHeader}>
        <div>
          <h1>Financial Summary Report</h1>
          <p>Reynolds HVAC Services &middot; Generated February 15, 2026</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div className={styles.reportWrapper}>
        <div className={styles.reportMetaBar}>
          <div className={styles.reportMetaLeft}>
            Data through <strong>December 31, 2025</strong> &middot; Fiscal year ending Dec 31 &middot; Prepared for exit planning purposes
          </div>
          <div className={styles.reportPageIndicator}>Comprehensive Report &middot; 8 Sections</div>
        </div>

        <div className={styles.reportDoc}>

          {/* Document Header */}
          <div className={styles.reportDocHeader}>
            <div className={styles.reportCompanyBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              Reynolds HVAC Services &mdash; Austin, TX
            </div>
            <div className={styles.reportDocTitle}>FINANCIAL SUMMARY REPORT</div>
            <div className={styles.reportDocSubtitle}>Three-Year Historical Analysis &middot; FY2023&ndash;FY2025 &middot; Prepared by Exit OSx Platform</div>
            <div className={styles.reportHeaderStats}>
              <div>
                <div className={styles.rhsLabel}>FY2025 Revenue</div>
                <div className={styles.rhsValue}>$12.8M</div>
              </div>
              <div>
                <div className={styles.rhsLabel}>Adj. EBITDA</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueGreen}`}>$2.05M</div>
              </div>
              <div>
                <div className={styles.rhsLabel}>EBITDA Margin</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueTeal}`}>16.0%</div>
              </div>
              <div>
                <div className={styles.rhsLabel}>Revenue CAGR</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueOrange}`}>8.4%</div>
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className={styles.reportDocBody}>

            {/* KPI Grid */}
            <div className={styles.kpiGrid} style={{ marginBottom: 36 }}>
              {[
                { label: 'Total Revenue', value: '$12.8M', delta: '+8.4% vs prior year', deltaUp: true },
                { label: 'Gross Profit', value: '$5.76M', delta: '45.0% margin', deltaUp: true },
                { label: 'Net Income', value: '$1.23M', delta: '9.6% net margin', deltaUp: true },
                { label: 'Working Capital', value: '$1.84M', sub: 'Current ratio 2.3x' },
                { label: 'Total Debt', value: '$1.1M', sub: 'Debt/EBITDA 0.54x' },
                { label: 'Free Cash Flow', value: '$823K', delta: '6.4% of revenue', deltaUp: true },
              ].map((k) => (
                <div key={k.label} className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>{k.label}</div>
                  <div className={styles.kpiValue}>{k.value}</div>
                  {k.delta && (
                    <div className={`${styles.kpiDelta} ${k.deltaUp ? styles.kpiDeltaUp : styles.kpiDeltaDown}`}>
                      {k.deltaUp && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>}
                      {k.delta}
                    </div>
                  )}
                  {k.sub && <div className={styles.kpiSub}>{k.sub}</div>}
                </div>
              ))}
            </div>

            {/* Section 1: Three-Year Financial Overview */}
            <div className={styles.reportDocSection} id="sec-overview">
              <div className={styles.reportDocSectionHeader}>
                <div className={styles.reportDocSectionNum}>1</div>
                <div>
                  <div className={styles.reportDocSectionTitle}>Three-Year Financial Overview</div>
                  <div className={styles.reportDocSectionSubtitle}>FY2023&ndash;FY2025 consolidated income statement</div>
                </div>
              </div>
              <table className={styles.rTable}>
                <thead>
                  <tr>
                    <th>Line Item</th>
                    <th>FY2023</th>
                    <th>FY2024</th>
                    <th>FY2025</th>
                    <th>3-Yr CAGR</th>
                  </tr>
                </thead>
                <tbody>
                  {P_AND_L.map((row) => (
                    <tr key={row.label} className={getRowClass(row.type)}>
                      <td>{row.label}</td>
                      <td>{row.fy23}</td>
                      <td className={row.posFy24 ? styles.rTablePositive : undefined}>{row.fy24}</td>
                      <td className={`${styles.rTableYearCol}`}>{row.fy25}</td>
                      <td className={row.posCAGR ? styles.rTablePositive : styles.rTableMuted}>{row.cagr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={`${styles.insightBox} ${styles.insightBoxGreen}`}>
                <strong>Positive trend:</strong> EBITDA margin expanded 130 basis points from FY2023 to FY2025 (14.7% to 16.0%), driven by operating leverage on a growing residential service contract base. Revenue grew at a consistent 8.4% CAGR without margin compression &mdash; a strong quality indicator for prospective buyers.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 2: Revenue Analysis */}
            <div className={styles.reportDocSection} id="sec-revenue">
              <div className={styles.reportDocSectionHeader}>
                <div className={styles.reportDocSectionNum}>2</div>
                <div>
                  <div className={styles.reportDocSectionTitle}>Revenue Analysis</div>
                  <div className={styles.reportDocSectionSubtitle}>Service mix, growth drivers, and concentration assessment</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 14 }}>FY2025 Revenue Mix</div>
                  {[
                    { label: 'Residential Service', value: '$5.76M', pct: '45%', w: '45%', color: 'var(--accent)' },
                    { label: 'Commercial HVAC', value: '$4.48M', pct: '35%', w: '35%', color: 'var(--purple)' },
                    { label: 'Service Contracts', value: '$2.56M', pct: '20%', w: '20%', color: 'var(--green)' },
                  ].map((item) => (
                    <div key={item.label} className={styles.mixItem}>
                      <div className={styles.mixLabelRow}>
                        <span className={styles.mixLabel}>{item.label}</span>
                        <span className={styles.mixValues}>{item.value} &middot; <strong>{item.pct}</strong></span>
                      </div>
                      <div className={styles.mixBarTrack}>
                        <div className={styles.mixBarFill} style={{ width: item.w, background: item.color }} />
                      </div>
                    </div>
                  ))}
                  <div className={styles.insightBox} style={{ marginTop: 14, padding: 12 }}>
                    Service contracts grew from 14% to 20% of revenue over 3 years. Recurring revenue is valued at a premium by buyers.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 14 }}>Year-over-Year Revenue</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120, marginBottom: 10 }}>
                    {[
                      { label: 'FY2023', val: '$10.9M', h: 72, active: false },
                      { label: 'FY2024', val: '$11.8M', h: 85, active: false },
                      { label: 'FY2025', val: '$12.8M', h: 100, active: true },
                    ].map((b) => (
                      <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: 11, fontWeight: b.active ? 700 : 600, color: 'var(--accent)', marginBottom: 4 }}>{b.val}</div>
                        <div style={{ width: '100%', background: b.active ? 'var(--accent)' : 'var(--accent-light)', borderRadius: '4px 4px 0 0', height: b.h, border: b.active ? 'none' : '2px solid var(--accent)' }} />
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontWeight: b.active ? 600 : 400 }}>{b.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>3-Year CAGR: 8.4%</div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Top Customer Concentration</div>
              <table className={styles.rTable}>
                <thead>
                  <tr>
                    <th>Customer Segment</th>
                    <th>% of Revenue</th>
                    <th>Relationship Length</th>
                    <th>Contract Status</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Top 1 customer</td><td>12%</td><td>8 years</td><td>Contracted</td><td style={{ color: 'var(--orange)', fontWeight: 600 }}>Medium</td></tr>
                  <tr><td>Top 5 customers</td><td>34%</td><td>5.2 yr avg</td><td>Mixed</td><td style={{ color: 'var(--orange)', fontWeight: 600 }}>Medium</td></tr>
                  <tr><td>Top 10 customers</td><td>51%</td><td>4.1 yr avg</td><td>Mixed</td><td style={{ color: 'var(--green)', fontWeight: 600 }}>Acceptable</td></tr>
                  <tr><td>Remaining customers</td><td>49%</td><td>3.8 yr avg</td><td>Transaction</td><td style={{ color: 'var(--green)', fontWeight: 600 }}>Low</td></tr>
                </tbody>
              </table>
              <div className={`${styles.insightBox} ${styles.insightBoxOrange}`}>
                <strong>Concentration note:</strong> Top customer represents 12% of revenue &mdash; above the 10% threshold that triggers buyer diligence questions. Recommend documenting long-term relationship strength and formalizing the contract before a sale process.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 3: Profitability Analysis */}
            <div className={styles.reportDocSection} id="sec-profitability">
              <div className={styles.reportDocSectionHeader}>
                <div className={styles.reportDocSectionNum}>3</div>
                <div>
                  <div className={styles.reportDocSectionTitle}>Profitability Analysis</div>
                  <div className={styles.reportDocSectionSubtitle}>Margin trends and industry benchmark comparison</div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 14 }}>Margin Trend (FY2023&ndash;FY2025)</div>
              <table className={styles.rTable} style={{ marginBottom: 20 }}>
                <thead>
                  <tr><th>Metric</th><th>FY2023</th><th>FY2024</th><th>FY2025</th><th>Trend</th></tr>
                </thead>
                <tbody>
                  <tr><td>Gross Margin</td><td>44.0%</td><td>44.0%</td><td className={styles.rTableYearCol}>45.0%</td><td className={styles.rTablePositive}>+100 bps</td></tr>
                  <tr><td>EBITDA Margin</td><td>14.7%</td><td>14.7%</td><td className={styles.rTableYearCol}>16.0%</td><td className={styles.rTablePositive}>+130 bps</td></tr>
                  <tr><td>Net Margin</td><td>8.4%</td><td>8.3%</td><td className={styles.rTableYearCol}>9.2%</td><td className={styles.rTablePositive}>+80 bps</td></tr>
                  <tr><td>OpEx as % of Revenue</td><td>29.3%</td><td>29.3%</td><td className={styles.rTableYearCol}>29.0%</td><td className={styles.rTablePositive}>&minus;30 bps</td></tr>
                </tbody>
              </table>

              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 14 }}>Industry Benchmark Comparison &mdash; HVAC Services (Revenue $10M&ndash;$20M)</div>
              {[
                { metric: 'Gross Margin', company: '45.0%', industry: '41.2%', barW: '75%', barColor: 'var(--accent)', badge: 'Above', badgeType: 'above' },
                { metric: 'EBITDA Margin', company: '16.0%', industry: '13.8%', barW: '65%', barColor: 'var(--green)', badge: 'Above', badgeType: 'above' },
                { metric: 'Revenue per Employee', company: '$284K', industry: '$295K', barW: '55%', barColor: 'var(--orange)', badge: 'Below', badgeType: 'below' },
                { metric: 'Service Contract %', company: '20%', industry: '18%', barW: '50%', barColor: 'var(--purple)', badge: 'Above', badgeType: 'above' },
                { metric: 'Revenue Growth (3yr CAGR)', company: '8.4%', industry: '6.1%', barW: '70%', barColor: 'var(--teal)', badge: 'Above', badgeType: 'above' },
              ].map((b) => (
                <div key={b.metric} className={styles.benchmarkRow} style={{ paddingTop: b.metric === 'Gross Margin' ? 0 : undefined }}>
                  <div className={styles.benchmarkMetric}>{b.metric}</div>
                  <div className={styles.benchmarkCompany}>{b.company}</div>
                  <div className={styles.benchmarkBarWrap}>
                    <div className={styles.benchmarkBarTrack}>
                      <div style={{ width: b.barW, background: b.barColor, height: 6, borderRadius: 3 }} />
                    </div>
                  </div>
                  <div className={styles.benchmarkIndustry}>{b.industry}</div>
                  <div>
                    <span className={`${styles.benchmarkBadge} ${b.badgeType === 'above' ? styles.benchmarkBadgeAbove : b.badgeType === 'below' ? styles.benchmarkBadgeBelow : styles.benchmarkBadgeAt}`}>
                      {b.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 4: EBITDA Adjustments */}
            <div className={styles.reportDocSection} id="sec-ebitda">
              <div className={styles.reportDocSectionHeader}>
                <div className={styles.reportDocSectionNum}>4</div>
                <div>
                  <div className={styles.reportDocSectionTitle}>EBITDA Adjustments &amp; Normalized Earnings</div>
                  <div className={styles.reportDocSectionSubtitle}>Add-backs and one-time items for FY2025</div>
                </div>
              </div>
              <p className={styles.reportText}>
                Normalized EBITDA represents the true earning power of the business available to a buyer. The following adjustments remove owner-specific expenses, one-time items, and non-recurring costs that would not transfer with the business.
              </p>
              <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 20 }}>
                {EBITDA_ITEMS.map((item, i) => (
                  <div key={i} className={`${styles.waterfallItem} ${item.type === 'base' ? '' : ''}`} style={{ paddingTop: i === 0 ? 0 : undefined }}>
                    <div className={`${styles.waterfallLabel} ${item.type !== 'base' ? styles.waterfallLabelIndent : ''}`} style={item.type === 'base' ? { fontWeight: 700 } : undefined}>{item.label}</div>
                    <div className={`${styles.waterfallAmount} ${item.type === 'add' ? styles.waterfallAmountAdd : item.type === 'sub' ? styles.waterfallAmountSub : ''}`}>{item.amount}</div>
                  </div>
                ))}
                <div className={`${styles.waterfallItem} ${styles.waterfallTotalRow}`} style={{ borderTop: '2px solid var(--border)', marginTop: 4, paddingTop: 14 }}>
                  <div className={styles.waterfallLabel} style={{ fontWeight: 700, fontSize: 15 }}>Adjusted / Normalized EBITDA</div>
                  <div className={`${styles.waterfallAmount} ${styles.waterfallAmountTotal}`}>$2,269,000</div>
                </div>
              </div>
              <div className={styles.insightBox} style={{ marginTop: 16 }}>
                <strong>Note:</strong> Adjusted EBITDA of $2.27M represents a 10.7% premium over reported EBITDA. At the current industry multiple of 4.0x, each dollar of defensible add-back creates approximately $4 of enterprise value. Total add-back impact: +$875,600 in enterprise value.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 5: Cash Flow Summary */}
            <div className={styles.reportDocSection} id="sec-cashflow">
              <div className={styles.reportDocSectionHeader}>
                <div className={styles.reportDocSectionNum}>5</div>
                <div>
                  <div className={styles.reportDocSectionTitle}>Cash Flow Summary</div>
                  <div className={styles.reportDocSectionSubtitle}>Operating, investing, and financing activity for FY2025</div>
                </div>
              </div>
              <div className={styles.cfGrid}>
                <div className={styles.cfCard}>
                  <div className={styles.cfCardLabel}>Operating Cash Flow</div>
                  <div className={styles.cfCardValue} style={{ color: 'var(--green)' }}>$1,487,000</div>
                  <div className={styles.cfCardDesc}>Strong conversion of EBITDA to operating cash. OCF/EBITDA ratio of 72.5%.</div>
                </div>
                <div className={styles.cfCard}>
                  <div className={styles.cfCardLabel}>Capital Expenditures</div>
                  <div className={styles.cfCardValue} style={{ color: 'var(--text-primary)' }}>($664,000)</div>
                  <div className={styles.cfCardDesc}>Fleet replacement and HVAC equipment. Maintenance capex stable at ~5% of revenue.</div>
                </div>
                <div className={styles.cfCard}>
                  <div className={styles.cfCardLabel}>Free Cash Flow</div>
                  <div className={styles.cfCardValue} style={{ color: 'var(--accent)' }}>$823,000</div>
                  <div className={styles.cfCardDesc}>6.4% FCF yield on revenue. Supports debt service and owner distributions.</div>
                </div>
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 6: Financial Risks */}
            <div className={styles.reportDocSection} id="sec-risks">
              <div className={styles.reportDocSectionHeader}>
                <div className={styles.reportDocSectionNum}>6</div>
                <div>
                  <div className={styles.reportDocSectionTitle}>Financial Risk Factors</div>
                  <div className={styles.reportDocSectionSubtitle}>Key risks that may affect valuation or deal structure</div>
                </div>
              </div>
              {RISKS.map((risk) => (
                <div key={risk.title} className={styles.riskItem}>
                  <div className={`${styles.riskSeverity} ${risk.severity === 'high' ? styles.riskSeverityHigh : risk.severity === 'medium' ? styles.riskSeverityMedium : styles.riskSeverityLow}`} />
                  <div>
                    <div className={styles.riskTitle}>
                      {risk.title}
                      <span className={`${styles.riskBadge} ${risk.severity === 'high' ? styles.riskBadgeHigh : risk.severity === 'medium' ? styles.riskBadgeMedium : styles.riskBadgeLow}`}>{risk.badge}</span>
                    </div>
                    <div className={styles.riskDesc}>{risk.desc}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Document Footer */}
          <div className={styles.reportDocFooter}>
            <div className={styles.reportDocFooterLeft}>
              Exit OSx Platform &mdash; Confidential &mdash; Reynolds HVAC Services<br />
              This report is prepared for internal exit planning purposes only. Not a formal financial statement or appraisal.
            </div>
            <div className={styles.reportDocFooterRight}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
