'use client'

import Link from 'next/link'
import styles from '@/components/retirement/retirement.module.css'

// TODO: wire to API — fetch real PFS + retirement data
const INCOME_PROJECTION = [
  { year: 'Year 1 (2028)', age: 55, start: '$6,500,000', withdrawal: '($180,000)', wClass: 'negative', return: '+$379,200', rClass: 'positive', end: '$6,699,200' },
  { year: 'Year 2 (2029)', age: 56, start: '$6,699,200', withdrawal: '($185,400)', wClass: 'negative', return: '+$390,348', rClass: 'positive', end: '$6,904,148' },
  { year: 'Year 3 (2030)', age: 57, start: '$6,904,148', withdrawal: '($190,962)', wClass: 'negative', return: '+$402,472', rClass: 'positive', end: '$7,115,658' },
  { year: 'Year 4 (2031)', age: 58, start: '$7,115,658', withdrawal: '($196,691)', wClass: 'negative', return: '+$415,139', rClass: 'positive', end: '$7,334,106' },
  { year: 'Year 5 (2032)', age: 59, start: '$7,334,106', withdrawal: '($202,592)', wClass: 'negative', return: '+$428,491', rClass: 'positive', end: '$7,560,005' },
  { year: 'Year 6 (2033)', age: 60, start: '$7,560,005', withdrawal: '($208,670)', wClass: 'negative', return: '+$442,280', rClass: 'positive', end: '$7,793,615', highlighted: true },
  { year: 'Year 7 (2034)', age: 61, start: '$7,793,615', withdrawal: '($214,930)', wClass: 'negative', return: '+$456,881', rClass: 'positive', end: '$8,035,566' },
  { year: 'Year 8 (2035)', age: 62, start: '$8,035,566', withdrawal: '($182,378)*', wClass: 'socialSecurity', return: '+$473,393', rClass: 'positive', end: '$8,326,581' },
  { year: 'Year 9 (2036)', age: 63, start: '$8,326,581', withdrawal: '($187,849)', wClass: 'negative', return: '+$488,545', rClass: 'positive', end: '$8,627,277' },
  { year: 'Year 10 (2037)', age: 64, start: '$8,627,277', withdrawal: '($193,484)', wClass: 'negative', return: '+$506,508', rClass: 'positive', end: '$8,940,301' },
]

const SS_TABLE = [
  { age: 'Age 62 (Early)', mikeMo: '$2,802', lisaMo: '$1,401', combMo: '$4,203', annual: '$50,436', relief: '$50,436/yr', group: false },
  { age: 'Age 67 (Full)', mikeMo: '$4,017', lisaMo: '$2,009', combMo: '$6,026', annual: '$72,312', relief: '$72,312/yr', group: true },
  { age: 'Age 70 (Maximum)', mikeMo: '$5,021', lisaMo: '$2,511', combMo: '$7,532', annual: '$90,384', relief: '$90,384/yr', group: false },
]

export default function RetirementReportPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/retirement">Retirement</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Retirement Report</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeaderRow}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px' }}>Retirement Projection Report</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Mike &amp; Lisa Reynolds &middot; Generated February 12, 2026</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div className={styles.reportWrapper}>

        {/* Meta bar */}
        <div className={styles.reportMetaBar}>
          <div className={styles.reportMetaLeft}>
            Projections as of <strong>February 12, 2026</strong> &middot; Based on PFS data and retirement questionnaire &middot; Assumes business exit in 2028
          </div>
          <div className={styles.reportPageIndicator}>Pages 1&ndash;3 of 6</div>
        </div>

        {/* Document card */}
        <div className={styles.reportDoc}>

          {/* Dark green gradient header */}
          <div className={styles.reportDocHeader}>
            <div className={styles.reportCompanyBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Mike &amp; Lisa Reynolds &mdash; Austin, TX
            </div>
            <div className={styles.reportDocTitle}>RETIREMENT PROJECTION REPORT</div>
            <div className={styles.reportDocSubtitle}>Post-Exit Financial Planning &middot; 35-Year Projection Horizon &middot; Prepared by Exit OS Platform</div>
            <div className={styles.reportHeaderStats}>
              <div>
                <div className={styles.rhsLabel}>Net Exit Proceeds</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueGreen}`}>$5.9M</div>
              </div>
              <div>
                <div className={styles.rhsLabel}>Total Post-Exit Portfolio</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueTeal}`}>$7.15M</div>
              </div>
              <div>
                <div className={styles.rhsLabel}>Annual Income Goal</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueOrange}`}>$180K</div>
              </div>
              <div>
                <div className={styles.rhsLabel}>Portfolio Longevity</div>
                <div className={`${styles.rhsValue} ${styles.rhsValueGreen}`}>35+ yrs</div>
              </div>
            </div>
          </div>

          {/* Report body */}
          <div className={styles.reportBody}>

            {/* Section 1: Personal Financial Summary */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>1</div>
                <div>
                  <div className={styles.reportSectionTitle}>Personal Financial Summary</div>
                  <div className={styles.reportSectionSubtitle}>Household profile and retirement parameters</div>
                </div>
              </div>

              <div className={styles.personalGrid}>
                <div className={styles.personalCard}>
                  <div className={styles.personalCardLabel}>Mike&apos;s Age</div>
                  <div className={styles.personalCardValue}>52</div>
                  <div className={styles.personalCardSub}>Target retirement age: 55</div>
                </div>
                <div className={styles.personalCard}>
                  <div className={styles.personalCardLabel}>Lisa&apos;s Age</div>
                  <div className={styles.personalCardValue}>50</div>
                  <div className={styles.personalCardSub}>Does not work outside home</div>
                </div>
                <div className={styles.personalCard}>
                  <div className={styles.personalCardLabel}>Years to Retirement</div>
                  <div className={styles.personalCardValue}>3</div>
                  <div className={styles.personalCardSub}>Target: 2028 exit</div>
                </div>
                <div className={styles.personalCard}>
                  <div className={styles.personalCardLabel}>Planning Horizon</div>
                  <div className={styles.personalCardValue}>35 yrs</div>
                  <div className={styles.personalCardSub}>Through age 90 (Lisa)</div>
                </div>
              </div>

              {/* Goal highlight card */}
              <div className={styles.goalCard}>
                <div className={styles.goalIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
                    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
                  </svg>
                </div>
                <div className={styles.goalMain}>
                  <div className={styles.goalLabel}>Monthly Retirement Income Goal</div>
                  <div className={styles.goalAmount}>$15,000</div>
                  <div className={styles.goalDetail}>$180,000 per year &middot; in today&apos;s dollars &middot; inflation-adjusted annually at 3.0%</div>
                </div>
                <div className={styles.goalStats}>
                  <div>
                    <div className={styles.goalStatLabel}>Annual (Year 1)</div>
                    <div className={styles.goalStatValue}>$180,000</div>
                  </div>
                  <div>
                    <div className={styles.goalStatLabel}>Annual at Age 65</div>
                    <div className={styles.goalStatValue} style={{ color: '#FBB040' }}>$256,400</div>
                  </div>
                  <div>
                    <div className={styles.goalStatLabel}>Annual at Age 80</div>
                    <div className={styles.goalStatValue} style={{ color: 'rgba(255,255,255,0.7)' }}>$399,200</div>
                  </div>
                </div>
              </div>

              <div className={`${styles.reportInsightBox} ${styles.reportInsightBoxGreen}`}>
                <strong>On track:</strong> Based on moderate assumptions (6% portfolio return, 3% inflation), the projected portfolio of $7.15M provides sufficient income through age 90+ with a projected ending balance of approximately $4.8M. The retirement goal is achievable under the current exit scenario.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 2: Exit Proceeds Waterfall */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>2</div>
                <div>
                  <div className={styles.reportSectionTitle}>Exit Proceeds Waterfall</div>
                  <div className={styles.reportSectionSubtitle}>From enterprise value to net proceeds in hand</div>
                </div>
              </div>

              <p className={styles.reportText}>
                This waterfall shows how the $8.2M enterprise valuation translates to actual proceeds after transaction costs, taxes, and obligations are satisfied. These figures are estimates &mdash; a tax advisor should review the structure before finalizing.
              </p>

              <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
                {/* Enterprise value */}
                <div className={styles.wfRow} style={{ paddingTop: 0 }}>
                  <div className={styles.wfArrow}></div>
                  <div className={styles.wfLabelTotal}>Enterprise Value</div>
                  <div className={styles.wfAmount} style={{ color: 'var(--foreground)', fontSize: 18 }}>$8,200,000</div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', padding: '14px 0 6px 20px' }}>Transaction Costs</div>

                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>M&amp;A Broker Fee (5% of EV)</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '5%', background: 'var(--destructive)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountNegative}`}>($410,000)</div>
                </div>
                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>Legal / Accounting / Closing Costs</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '4%', background: 'var(--destructive)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountNegative}`}>($328,000)</div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', padding: '14px 0 6px 20px' }}>Taxes</div>

                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>Federal Capital Gains Tax (est. 20%)</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '18%', background: 'var(--accent)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountNegative}`}>($1,293,000)</div>
                </div>
                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>State Capital Gains Tax (TX: 0%)</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '0%', background: 'var(--green-500, #22c55e)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountPositive}`}>$0</div>
                </div>
                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>NIIT (3.8% Net Investment Income Tax)</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '4%', background: 'var(--accent)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountNegative}`}>($246,000)</div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', padding: '14px 0 6px 20px' }}>Obligations at Close</div>

                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>Business Debt Payoff</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '13%', background: 'var(--text-muted)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountNegative}`}>($1,100,000)</div>
                </div>
                <div className={styles.wfRow}>
                  <div className={styles.wfArrow} style={{ color: 'var(--destructive)' }}>&minus;</div>
                  <div className={styles.wfLabelIndent}>Working Capital Adjustment</div>
                  <div className={styles.wfBar}><div className={styles.wfBarTrack}><div className={styles.wfBarFill} style={{ width: '4%', background: 'var(--text-muted)' }}></div></div></div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountNegative}`}>($350,000)</div>
                </div>

                {/* Total row */}
                <div className={styles.wfRow} style={{ borderTop: '2px solid var(--foreground)', marginTop: 4, paddingTop: 14 }}>
                  <div className={styles.wfArrow} style={{ color: 'var(--green-600, #16a34a)', fontSize: 16 }}>&#8250;</div>
                  <div className={styles.wfLabelTotal}>Net Proceeds to Mike &amp; Lisa</div>
                  <div className={`${styles.wfAmount} ${styles.wfAmountTotal}`}>$4,473,000</div>
                </div>
                <div style={{ paddingLeft: 34, paddingTop: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    +Escrow release (est. 24 months): <strong>$820,000</strong> &middot; Total expected net after escrow: <strong>$5,293,000</strong><br />
                    +Seller note receivable (est.): <strong>+$607,000</strong> &middot; Total all-in net proceeds: <strong>$5,900,000</strong>
                  </p>
                </div>
              </div>

              {/* Net proceeds callout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--green-50, #f0fdf4)', border: '1px solid rgba(52,199,89,0.2)', borderRadius: 8, padding: '16px 20px', marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Total Net Exit Proceeds (all-in, including escrow &amp; seller note)</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Texas has no state income tax &mdash; this saves approximately $380K&ndash;$500K vs. comparable owners in CA, NY, or OR.</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', letterSpacing: '-1px' }}>$5,900,000</div>
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 3: Post-Exit Portfolio Construction */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>3</div>
                <div>
                  <div className={styles.reportSectionTitle}>Post-Exit Portfolio Construction</div>
                  <div className={styles.reportSectionSubtitle}>Exit proceeds + existing non-business assets = total investable portfolio</div>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 14 }}>Current Non-Business Assets</div>

              <div className={styles.assetGrid}>
                <div className={styles.assetCard} style={{ borderTop: '3px solid var(--purple, #a855f7)' }}>
                  <div className={styles.assetLabel}>Retirement Accounts (IRA, 401k)</div>
                  <div className={styles.assetValue} style={{ color: 'var(--purple, #a855f7)' }}>$420,000</div>
                  <div className={styles.assetSub}>Mike: $280K IRA &middot; Lisa: $140K IRA &middot; Tax-deferred growth</div>
                </div>
                <div className={styles.assetCard} style={{ borderTop: '3px solid var(--accent)' }}>
                  <div className={styles.assetLabel}>Real Estate (Primary Residence)</div>
                  <div className={styles.assetValue} style={{ color: 'var(--accent)' }}>$650,000</div>
                  <div className={styles.assetSub}>Est. equity after mortgage. Not included in income model.</div>
                </div>
                <div className={styles.assetCard} style={{ borderTop: '3px solid var(--teal, #14b8a6)' }}>
                  <div className={styles.assetLabel}>Other Savings / Investments</div>
                  <div className={styles.assetValue} style={{ color: 'var(--teal, #14b8a6)' }}>$180,000</div>
                  <div className={styles.assetSub}>Brokerage account, CDs, cash savings</div>
                </div>
                <div className={styles.assetCard} style={{ borderTop: '3px solid var(--primary)', background: 'var(--primary-50, #eff6ff)' }}>
                  <div className={styles.assetLabel}>Total Investable Non-Business Assets</div>
                  <div className={styles.assetValue} style={{ color: 'var(--primary)' }}>$600,000</div>
                  <div className={styles.assetSub}>Retirement accounts ($420K) + Other savings ($180K)</div>
                </div>
              </div>

              {/* Portfolio composition */}
              <div className={styles.portfolioComposition}>
                <div className={styles.portfolioCompositionLabel}>Post-Exit Portfolio Composition</div>
                <div className={styles.portfolioRow}>
                  <div className={styles.portfolioColorDot} style={{ background: '#16a34a' }}></div>
                  <div className={styles.portfolioRowLabel}>Net Exit Proceeds</div>
                  <div className={styles.portfolioRowAmount}>$5,900,000</div>
                  <div className={styles.portfolioBarWrap}>
                    <div className={styles.portfolioBarTrack}><div className={styles.portfolioBarFill} style={{ width: '82.5%', background: '#16a34a' }}></div></div>
                  </div>
                  <div className={styles.portfolioRowPct}>82.5%</div>
                </div>
                <div className={styles.portfolioRow}>
                  <div className={styles.portfolioColorDot} style={{ background: 'var(--purple, #a855f7)' }}></div>
                  <div className={styles.portfolioRowLabel}>Retirement Accounts (IRA/401k)</div>
                  <div className={styles.portfolioRowAmount}>$420,000</div>
                  <div className={styles.portfolioBarWrap}>
                    <div className={styles.portfolioBarTrack}><div className={styles.portfolioBarFill} style={{ width: '5.9%', background: 'var(--purple, #a855f7)' }}></div></div>
                  </div>
                  <div className={styles.portfolioRowPct}>5.9%</div>
                </div>
                <div className={styles.portfolioRow}>
                  <div className={styles.portfolioColorDot} style={{ background: 'var(--teal, #14b8a6)' }}></div>
                  <div className={styles.portfolioRowLabel}>Other Savings &amp; Investments</div>
                  <div className={styles.portfolioRowAmount}>$180,000</div>
                  <div className={styles.portfolioBarWrap}>
                    <div className={styles.portfolioBarTrack}><div className={styles.portfolioBarFill} style={{ width: '2.5%', background: 'var(--teal, #14b8a6)' }}></div></div>
                  </div>
                  <div className={styles.portfolioRowPct}>2.5%</div>
                </div>
                <div className={styles.portfolioTotal}>
                  <div className={styles.portfolioTotalLabel}>Total Investable Portfolio</div>
                  <div className={styles.portfolioTotalValue}>$6,500,000</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  + Primary residence equity ($650K) = Total net worth: $7.15M
                </div>
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 4: 10-Year Income Projection */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>4</div>
                <div>
                  <div className={styles.reportSectionTitle}>10-Year Income Projection</div>
                  <div className={styles.reportSectionSubtitle}>Moderate scenario: 6% annual return, 3% inflation on withdrawals</div>
                </div>
              </div>

              <table className={styles.rTable}>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Mike&apos;s Age</th>
                    <th>Starting Balance</th>
                    <th>Annual Withdrawal</th>
                    <th>Investment Return</th>
                    <th>Ending Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {INCOME_PROJECTION.map((row) => (
                    <tr key={row.year} className={row.highlighted ? styles.rTableGroupRow : undefined}>
                      <td>{row.year}</td>
                      <td>{row.age}</td>
                      <td>{row.start}</td>
                      <td className={row.wClass === 'socialSecurity' ? styles.rTablePositive : styles.rTableNegative}>{row.withdrawal}</td>
                      <td className={styles.rTablePositive}>{row.return}</td>
                      <td className={styles.rTableYearCol}>{row.end}</td>
                    </tr>
                  ))}
                  <tr className={styles.rTableTotalRow}>
                    <td>Cumulative (10 yrs)</td>
                    <td className={styles.rTableMuted}>&mdash;</td>
                    <td className={styles.rTableMuted}>$6,500,000</td>
                    <td className={styles.rTableNegative}>($1,942,956)</td>
                    <td className={styles.rTablePositive}>+$4,383,257</td>
                    <td className={styles.rTableYearCol}>$8,940,301</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                *Year 8: Social Security begins at age 62 for Mike ($33,622/yr). Withdrawal from portfolio reduces accordingly.
              </p>
              <div className={`${styles.reportInsightBox} ${styles.reportInsightBoxGreen}`}>
                <strong>Strong trajectory:</strong> At the moderate 6% return assumption, the portfolio grows from $6.5M to $8.94M over the first 10 years despite $180K+ annual withdrawals. The portfolio is self-sustaining and growing in this scenario. Portfolio longevity exceeds 35 years with high confidence.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 5: Three-Scenario Analysis */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>5</div>
                <div>
                  <div className={styles.reportSectionTitle}>Three-Scenario Analysis</div>
                  <div className={styles.reportSectionSubtitle}>How long does the money last under different market conditions?</div>
                </div>
              </div>

              <div className={styles.scenarioGrid}>
                {/* Conservative */}
                <div className={`${styles.reportScenarioCard} ${styles.reportScenarioConservative}`}>
                  <div className={styles.reportScenarioName}>Conservative</div>
                  <div className={`${styles.reportScenarioReturn} ${styles.reportScenarioReturnConservative}`}>4.0%</div>
                  <div className={styles.reportScenarioLasts}>Annual portfolio return assumption</div>
                  <div className={styles.reportScenarioDetails}>
                    <div className={styles.reportScenarioDetailRow}><span>Portfolio lasts through</span><span style={{ fontWeight: 700 }}>Age 84 (2056)</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 75</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>$5.2M</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 80</span><span style={{ fontWeight: 700, color: 'var(--destructive)' }}>$2.8M</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 85</span><span style={{ fontWeight: 700, color: 'var(--destructive)' }}>Depleted</span></div>
                  </div>
                  <div className={styles.reportScenarioNote}>In this scenario, you would need to reduce withdrawals at age 80 or rely on Social Security + home equity. Manageable with adjustments but requires monitoring.</div>
                </div>

                {/* Moderate (base case) */}
                <div className={`${styles.reportScenarioCard} ${styles.reportScenarioModerate} ${styles.reportScenarioActive}`}>
                  <div className={styles.reportScenarioBadge}>Base Case</div>
                  <div className={styles.reportScenarioName}>Moderate</div>
                  <div className={`${styles.reportScenarioReturn} ${styles.reportScenarioReturnModerate}`}>6.0%</div>
                  <div className={styles.reportScenarioLasts}>Annual portfolio return assumption</div>
                  <div className={styles.reportScenarioDetails}>
                    <div className={styles.reportScenarioDetailRow}><span>Portfolio lasts through</span><span style={{ fontWeight: 700, color: '#16a34a' }}>Age 90+ (2063+)</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 75</span><span style={{ fontWeight: 700, color: '#16a34a' }}>$9.8M</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 80</span><span style={{ fontWeight: 700, color: '#16a34a' }}>$8.4M</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 90</span><span style={{ fontWeight: 700, color: '#16a34a' }}>$4.8M</span></div>
                  </div>
                  <div className={styles.reportScenarioNote} style={{ color: '#166534' }}>This is the recommended base case. Portfolio grows for the first 15 years, providing a significant cushion. Leaves substantial estate value.</div>
                </div>

                {/* Optimistic */}
                <div className={`${styles.reportScenarioCard} ${styles.reportScenarioOptimistic}`}>
                  <div className={styles.reportScenarioName}>Optimistic</div>
                  <div className={`${styles.reportScenarioReturn} ${styles.reportScenarioReturnOptimistic}`}>8.0%</div>
                  <div className={styles.reportScenarioLasts}>Annual portfolio return assumption</div>
                  <div className={styles.reportScenarioDetails}>
                    <div className={styles.reportScenarioDetailRow}><span>Portfolio lasts through</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>Age 95+ (2068+)</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 75</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>$15.6M</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 80</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>$16.9M</span></div>
                    <div className={styles.reportScenarioDetailRow}><span>Balance at age 90</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>$18.2M</span></div>
                  </div>
                  <div className={styles.reportScenarioNote}>Significant wealth accumulation. Consider philanthropic giving, trust structures, or increased annual lifestyle spending. Estate plan becomes very important.</div>
                </div>
              </div>

              <div className={`${styles.reportInsightBox} ${styles.reportInsightBoxOrange}`} style={{ marginTop: 16 }}>
                <strong>Important note on conservative scenario:</strong> Even in the conservative 4% case, Social Security benefits ($33,622/yr at 62, $48,200/yr at full retirement age 67) provide a meaningful supplement. The combination of portfolio + SS income means the conservative case does not require any lifestyle reduction until approximately age 80.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 6: Social Security Integration */}
            <div className={styles.reportSection}>
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>6</div>
                <div>
                  <div className={styles.reportSectionTitle}>Social Security Integration</div>
                  <div className={styles.reportSectionSubtitle}>When and how SS benefits reduce portfolio withdrawal requirements</div>
                </div>
              </div>

              {/* SS milestone timeline */}
              <div className={styles.ssMilestoneLine}>
                {[
                  { dot: 'active', age: '55', label: 'Exit & Retire', detail: '2028' },
                  { dot: 'future', age: '62', label: 'Early SS', detail: 'Mike eligible' },
                  { dot: 'future', age: '62', label: 'Lisa Early SS', detail: 'Lisa eligible (2038)' },
                  { dot: 'future', age: '67', label: 'Full SS (Mike)', detail: '2040' },
                  { dot: 'future', age: '67', label: 'Full SS (Lisa)', detail: '2043' },
                  { dot: 'future', age: '70', label: 'Max SS', detail: 'If delayed' },
                ].map((pt) => (
                  <div key={pt.label} className={styles.ssMilestonePoint}>
                    <div className={`${styles.ssMilestoneDot} ${pt.dot === 'active' ? styles.ssMilestoneDotActive : styles.ssMilestoneDotFuture}`}>{pt.age}</div>
                    <div className={styles.ssMilestoneLabel}>{pt.label}</div>
                    <div className={styles.ssMilestoneDetail}>{pt.detail}</div>
                  </div>
                ))}
              </div>

              <table className={styles.rTable}>
                <thead>
                  <tr>
                    <th>Claiming Age</th>
                    <th>Mike Monthly</th>
                    <th>Lisa Monthly*</th>
                    <th>Combined Monthly</th>
                    <th>Annual Benefit</th>
                    <th>Portfolio Relief</th>
                  </tr>
                </thead>
                <tbody>
                  {SS_TABLE.map((row) => (
                    <tr key={row.age} className={row.group ? styles.rTableGroupRow : undefined}>
                      <td>{row.age}</td>
                      <td>{row.mikeMo}</td>
                      <td>{row.lisaMo}</td>
                      <td>{row.combMo}</td>
                      <td>{row.annual}</td>
                      <td className={styles.rTablePositive}>{row.relief}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                *Lisa&apos;s benefit based on spousal benefit (50% of Mike&apos;s FRA benefit). Actual amounts depend on lifetime earnings history.
              </p>
              <div className={`${styles.reportInsightBox} ${styles.reportInsightBoxGreen}`}>
                <strong>Recommendation: Delay to age 67.</strong> The 7-year difference between early (62) and full retirement (67) is $21,876/yr — cumulative break-even at age 77. Given your portfolio strength, delaying maximizes lifetime SS income. Consider delaying Mike to 70 if health permits for an additional $216K+ lifetime benefit.
              </div>
            </div>

          </div>

          {/* Document Footer */}
          <div className={styles.reportDocFooter}>
            <div className={styles.reportFooterLeft}>
              Generated by Exit OS Platform &middot; February 12, 2026<br />
              These projections are estimates only. Consult a qualified financial advisor before making decisions based on this report.
            </div>
            <div className={styles.reportFooterRight}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Calculator link */}
        <Link href="/dashboard/retirement/scenarios" className={styles.calculatorLink}>
          <div className={styles.calculatorLinkLeft}>
            <div className={styles.calculatorLinkIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="12" y2="14" />
              </svg>
            </div>
            <div>
              <div className={styles.calculatorLinkText}>Open Scenario Modeler</div>
              <div className={styles.calculatorLinkSub}>Adjust assumptions and see how outcomes change in real time</div>
            </div>
          </div>
          <div className={styles.calculatorLinkArrow}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

      </div>
    </div>
  )
}
