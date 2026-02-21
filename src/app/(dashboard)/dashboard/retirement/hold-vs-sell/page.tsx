'use client'

import Link from 'next/link'
import styles from '@/components/retirement/retirement.module.css'

// TODO: wire to API — /api/companies/[id]/retirement/hold-vs-sell

const SENSITIVITY_ROWS = [
  { rate: '4% growth', ev: '$9.1M', net: '$6.5M', diff: '+$600K', diffColor: '#FF9500' },
  { rate: '6% growth', ev: '$10.2M', net: '$7.3M', diff: '+$1.4M', diffColor: '#FF9500' },
  { rate: '8% growth (base case)', ev: '$11.4M', net: '$8.3M', diff: '+$2.4M', diffColor: 'var(--text-primary)', highlighted: true },
  { rate: '10% growth', ev: '$12.8M', net: '$9.2M', diff: '+$3.3M', diffColor: '#34C759' },
]

const ANALYSIS_ASSUMPTIONS = [
  { label: 'Annual Growth Rate', value: '8%', unit: 'per year' },
  { label: 'Discount Rate', value: '7%', unit: 'per year' },
  { label: 'Multiple Expansion', value: '0.1x', unit: 'per year' },
  { label: 'Blended Tax Rate', value: '28%', unit: 'blended' },
]

export default function HoldVsSellPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/retirement">Retirement</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Hold vs. Sell Analysis</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1>Should You Sell Now?</h1>
        <p>Compare your options side by side — with real numbers, real tradeoffs</p>
      </div>

      {/* Two-Path Hero */}
      <div className={styles.pathHeroWrap}>
        <div className={styles.pathHero}>
          <div className={styles.pathSell}>
            <div>
              <div className={styles.pathEyebrow}>Option A — Sell Now</div>
              <div className={styles.pathValue}>$8.2M</div>
              <div className={styles.pathSubtitle}>Enterprise value today</div>
              <div className={styles.pathDate}>Net proceeds: $5.9M &nbsp;·&nbsp; Available April 2026</div>
            </div>
            <div className={styles.pathPills}>
              <div className={styles.pathPill}>4.1x EBITDA</div>
              <div className={styles.pathPill}>Retirement: 72%</div>
            </div>
          </div>
          <div className={styles.pathDivider}>
            <div className={styles.vsCircle}>VS</div>
          </div>
          <div className={styles.pathHold}>
            <div>
              <div className={styles.pathEyebrow}>Option B — Hold 3 Years</div>
              <div className={styles.pathValue}>$11.4M</div>
              <div className={styles.pathSubtitle}>Projected value by 2029</div>
              <div className={styles.pathDate}>Net proceeds: $8.3M &nbsp;·&nbsp; Available April 2029</div>
            </div>
            <div className={styles.pathPills}>
              <div className={styles.pathPill}>4.4x EBITDA</div>
              <div className={styles.pathPill}>Retirement: 101%</div>
            </div>
          </div>
        </div>
        <div className={styles.pathHeroFooter}>
          Difference: <strong>+$2.4M net by holding</strong> — but at what cost?
        </div>
      </div>

      {/* Detail Cards */}
      <div className={styles.detailGrid}>

        {/* Sell Now */}
        <div className={`${styles.card} ${styles.detailCardSell}`}>
          <div className={`${styles.detailCardEyebrow} ${styles.detailCardEyebrowSell}`}>Sell Now — Full Picture</div>
          <div className={styles.detailRows}>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Current valuation</span>
              <span className={styles.detailRowValue}>$8.2M</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Multiple</span>
              <span className={styles.detailRowValue}>4.1x EBITDA</span>
            </div>
            <hr className={styles.detailDivider} />
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Taxes &amp; fees</span>
              <span className={`${styles.detailRowValue} ${styles.detailRowNegative}`}>−$2.3M</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Net proceeds</span>
              <span className={`${styles.detailRowValue} ${styles.detailRowBig}`}>$5.9M</span>
            </div>
            <hr className={styles.detailDivider} />
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Retirement funded</span>
              <span className={styles.detailRowValue} style={{ color: '#FF9500' }}>72%</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Retirement gap</span>
              <span className={`${styles.detailRowValue} ${styles.detailRowNegative}`}>$2.3M</span>
            </div>
          </div>
          <div className={styles.detailNote}>
            <strong>Time to retirement income:</strong> Immediate — invest proceeds at close
          </div>
          <div className={styles.riskFactorsLabel}>Market Risk Factors</div>
          <div className={styles.riskFactors}>
            <div className={`${styles.riskFactor} ${styles.riskFactorPositive}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Market multiples at 10-year highs
            </div>
            <div className={`${styles.riskFactor} ${styles.riskFactorWarning}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Interest rates may compress multiples
            </div>
          </div>
          <div className={`${styles.retirementBadge} ${styles.retirementBadgeWarn}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            $2.3M retirement gap remains
          </div>
        </div>

        {/* Hold 3 Years */}
        <div className={`${styles.card} ${styles.detailCardHold}`}>
          <div className={`${styles.detailCardEyebrow} ${styles.detailCardEyebrowHold}`}>Hold 3 Years — Full Picture</div>
          <div className={styles.detailRows}>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>EBITDA growth (8%/yr)</span>
              <span className={styles.detailRowValue}>$2.0M → $2.6M</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Projected multiple</span>
              <span className={styles.detailRowValue}>4.4x (continued growth)</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Projected enterprise value</span>
              <span className={styles.detailRowValue}>$11.4M</span>
            </div>
            <hr className={styles.detailDivider} />
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Projected taxes &amp; fees</span>
              <span className={`${styles.detailRowValue} ${styles.detailRowNegative}`}>−$3.1M</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Net proceeds</span>
              <span className={`${styles.detailRowValue} ${styles.detailRowBig}`}>$8.3M</span>
            </div>
            <hr className={styles.detailDivider} />
            <div className={styles.detailRow}>
              <span className={styles.detailRowLabel}>Retirement funded</span>
              <span className={`${styles.detailRowValue} ${styles.detailRowPositive}`}>101% ✓</span>
            </div>
          </div>
          <div className={styles.detailNote}>
            <strong>Time to retirement income:</strong> 3 more years of operations required
          </div>
          <div className={styles.riskFactorsLabel}>Risk Factors</div>
          <div className={styles.riskFactors}>
            {[
              'Revenue concentration still high',
              'Owner dependence unresolved',
            ].map((r) => (
              <div key={r} className={`${styles.riskFactor} ${styles.riskFactorNegative}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {r}
              </div>
            ))}
            {[
              'Market conditions uncertain',
              '3 more years of operational risk',
            ].map((r) => (
              <div key={r} className={`${styles.riskFactor} ${styles.riskFactorWarning}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {r}
              </div>
            ))}
          </div>
          <div className={`${styles.retirementBadge} ${styles.retirementBadgeOk}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Retirement fully funded
          </div>
        </div>

      </div>

      {/* Opportunity Cost */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 8 }}>Opportunity Cost Analysis</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>What you give up by holding</div>
        <div className={styles.oppItems}>
          <div className={styles.oppItem}>
            <div className={styles.oppBullet} />
            <div><strong>3 years of your time (ages 57→60)</strong> — the most finite resource in this entire analysis</div>
          </div>
          <div className={styles.oppItem}>
            <div className={styles.oppBullet} />
            <div><strong>$5.9M invested at 7% for 3 years = $7.2M</strong> — versus $8.3M from holding. Net advantage of holding: only <strong>$1.1M</strong></div>
          </div>
          <div className={styles.oppItem}>
            <div className={styles.oppBullet} />
            <div><strong>If growth stalls at 4%</strong>, hold value drops to $9.1M (net $6.5M) — just $600K advantage after 3 years of operational risk</div>
          </div>
        </div>
        <div className={styles.sensSection}>
          <div className={styles.sensLabel}>Hold value sensitivity to annual growth rate</div>
          <table className={styles.sensTable}>
            <thead>
              <tr>
                <th>Annual Growth Rate</th>
                <th>Enterprise Value (2029)</th>
                <th>Net Proceeds</th>
                <th>vs. Sell Now</th>
              </tr>
            </thead>
            <tbody>
              {SENSITIVITY_ROWS.map((row) => (
                <tr key={row.rate} className={row.highlighted ? styles.sensTableHighlighted : ''}>
                  <td>{row.highlighted ? <strong>{row.rate}</strong> : row.rate}</td>
                  <td>{row.highlighted ? <strong>{row.ev}</strong> : row.ev}</td>
                  <td>{row.highlighted ? <strong>{row.net}</strong> : row.net}</td>
                  <td style={{ color: row.diffColor, fontWeight: 700 }}>{row.highlighted ? <strong>{row.diff}</strong> : row.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hybrid Card */}
      <div className={styles.hybridCard}>
        <div className={styles.hybridBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Recommended Path
        </div>
        <div className={styles.hybridTitle}>Hold + Improve + Sell in 18 Months</div>
        <div className={styles.hybridDesc}>Complete the owner dependence and customer diversification playbooks (est. 12 months), then go to market with a stronger business commanding a higher multiple.</div>
        <div className={styles.hybridStats}>
          <div className={styles.hybridStat}>
            <div className={styles.hybridStatLabel}>Projected Value</div>
            <div className={styles.hybridStatValue}>$9.8M</div>
          </div>
          <div className={styles.hybridStat}>
            <div className={styles.hybridStatLabel}>Net Proceeds</div>
            <div className={styles.hybridStatValue}>$7.1M</div>
          </div>
          <div className={styles.hybridStat}>
            <div className={styles.hybridStatLabel}>Retirement Funded</div>
            <div className={styles.hybridStatValue}>87%</div>
          </div>
        </div>
        <div className={styles.hybridCapture}>
          This captures 70% of the 3-year upside in half the time — with significantly less operational risk.
        </div>
        <Link href="/dashboard/playbook" className={`${styles.btn} ${styles.btnPrimary}`}>
          Build this plan →
        </Link>
      </div>

      {/* AI Coach Insight */}
      <div className={styles.coachInsight}>
        <div className={styles.coachInsightIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <div className={styles.coachInsightEyebrow}>AI Coach — Hold vs. Sell</div>
          <div className={styles.coachInsightText}>
            Given your age (57), retirement goals, and current owner dependence score (42/100), I&apos;d highlight two things: (1) The hold scenario assumes you maintain 8% growth for 3 years <em>while also</em> reducing owner dependence — that&apos;s ambitious. These goals can conflict if the business still needs you to drive growth. (2) The hybrid 18-month path gives you the best risk-adjusted outcome. You capture most of the upside while reducing the biggest risk — that <em>you are</em> the business.
          </div>
        </div>
      </div>

      {/* Analysis Assumptions */}
      <div className={`${styles.card} ${styles.assumptionsCard}`}>
        <div className={styles.assumptionsCardHeader}>
          <div className={styles.assumptionsCardHeaderLabel}>Analysis Assumptions</div>
          <span className={styles.assumptionsCardHeaderHint}>Adjust to see how numbers change</span>
        </div>
        <div className={styles.assumptionsCardGrid}>
          {ANALYSIS_ASSUMPTIONS.map((a) => (
            <div key={a.label} className={styles.assumptionField}>
              <label>{a.label}</label>
              <div className={styles.assumptionFieldRow}>
                <span className={styles.assumptionFieldVal}>{a.value}</span>
                <span className={styles.assumptionFieldUnit}>{a.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.assumptionsNote}>Adjust assumptions above to see how the analysis changes. Consult your tax advisor for personalized estimates.</div>
      </div>
    </div>
  )
}
