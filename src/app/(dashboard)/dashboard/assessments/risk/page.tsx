'use client'

import Link from 'next/link'
import styles from '@/components/assessments/assessments.module.css'

// TODO: wire to API — GET /api/companies/[id]/assessments/risk
const STATIC_DATA = {
  companyName: 'Reynolds HVAC Services',
  assessedDate: 'February 10, 2026',
  riskScore: 38,
  riskLabel: 'Moderate Risk',
  riskBadge: 'Manageable',
  description:
    'Reynolds HVAC carries moderate overall risk. Key person dependency and customer concentration are the two risks most likely to impact your exit valuation. Both are addressable before a sale.',
  industryAvgRisk: 44,
  valuationImpact: '-$620K',
  risksIdentified: 6,
  risks: [
    {
      name: 'Customer Concentration',
      desc: 'Top 3 customers account for 34% of revenue. Loss of any single top customer would materially impact EBITDA.',
      metric: 'Concentration: 34%  ·  Threshold: <25%  ·  Industry avg: 28%',
      severity: 'High',
      severityClass: 'riskSeverityHigh' as const,
      trend: '→',
      trendClass: 'riskTrendFlat' as const,
      mitigation: 'In Progress',
      mitigationClass: 'riskMitigationInProgress' as const,
    },
    {
      name: 'Key Person Risk',
      desc: 'Owner BRI sub-score of 42/100 indicates high owner dependence. Primary relationships with 8 of top 10 customers; sole signatory on contracts over $50K.',
      metric: 'Owner Dependence Score: 42/100  ·  Target: >65',
      severity: 'High',
      severityClass: 'riskSeverityHigh' as const,
      trend: '↓',
      trendClass: 'riskTrendDown' as const,
      mitigation: 'In Progress',
      mitigationClass: 'riskMitigationInProgress' as const,
    },
    {
      name: 'Operational Risk',
      desc: 'SOP documentation covers 45% of field operations. No formal training program for field technicians. Dispatch system is manual spreadsheet-based.',
      metric: 'SOP Coverage: 45%  ·  Target: >80%',
      severity: 'Moderate',
      severityClass: 'riskSeverityModerate' as const,
      trend: '→',
      trendClass: 'riskTrendFlat' as const,
      mitigation: 'Planned',
      mitigationClass: 'riskMitigationPlanned' as const,
    },
    {
      name: 'Financial Risk',
      desc: 'Debt/EBITDA ratio of 0.54x is well within buyer comfort range. Working capital management is adequate. Minimal off-balance-sheet obligations.',
      metric: 'Debt/EBITDA: 0.54x  ·  Threshold: <3.0x',
      severity: 'Low',
      severityClass: 'riskSeverityLow' as const,
      trend: '↓',
      trendClass: 'riskTrendDown' as const,
      mitigation: 'No Action Needed',
      mitigationClass: 'riskMitigationNone' as const,
    },
    {
      name: 'Legal & Compliance',
      desc: '62% of customer contracts have multi-year terms. All state contractor licenses current. No pending litigation. 3 vendor contracts lack standard IP assignment clauses.',
      metric: 'Contract Coverage: 62%  ·  Active Licenses: All current',
      severity: 'Low',
      severityClass: 'riskSeverityLow' as const,
      trend: '→',
      trendClass: 'riskTrendFlat' as const,
      mitigation: 'Planned',
      mitigationClass: 'riskMitigationPlanned' as const,
    },
    {
      name: 'Market Position',
      desc: 'Competitive position rated 3 of 5 in Austin HVAC market. Strong reputation but increasing pressure from national HVAC rollup buyers entering as competitors.',
      metric: 'Competitive Rank: 3/5  ·  Market Share: ~4% Austin metro',
      severity: 'Low',
      severityClass: 'riskSeverityLow' as const,
      trend: '↑',
      trendClass: 'riskTrendUp' as const,
      mitigation: 'Monitor',
      mitigationClass: 'riskMitigationNone' as const,
    },
  ],
  matrixDots: [
    { abbr: 'KP', label: 'Key Person', color: 'red', cell: 'highHigh', top: '40%', left: '40%' },
    { abbr: 'CC', label: 'Customers', color: 'red', cell: 'highHigh', top: '60%', left: '65%' },
    { abbr: 'FIN', label: 'Financial', color: 'orange', cell: 'highLow', top: '50%', left: '50%' },
    { abbr: 'MKT', label: 'Market', color: 'green', cell: 'lowLow', top: '50%', left: '50%' },
    { abbr: 'OPS', label: 'Operational', color: 'orange', cell: 'lowHigh', top: '40%', left: '40%' },
    { abbr: 'LEG', label: 'Legal', color: 'green', cell: 'lowHigh', top: '65%', left: '62%' },
  ],
  waterfall: [
    { label: 'Base\nValue', value: '$8.2M', height: 200, color: 'linear-gradient(180deg,#0071E3,#005EC4)', valueColor: 'var(--accent)' },
    { label: 'Key\nPerson', value: '-$260K', height: 64, color: 'linear-gradient(180deg,#FF3B30,#D93025)', valueColor: 'var(--red)' },
    { label: 'Customer\nConc.', value: '-$180K', height: 44, color: 'linear-gradient(180deg,#FF3B30,#D93025)', valueColor: 'var(--red)' },
    { label: 'Ops\nGaps', value: '-$100K', height: 24, color: 'linear-gradient(180deg,#FF9500,#E68400)', valueColor: 'var(--orange)' },
    { label: 'Fin.\nRisk', value: '-$50K', height: 12, color: 'linear-gradient(180deg,#FF9500,#E68400)', valueColor: 'var(--orange)' },
    { label: 'Legal', value: '-$30K', height: 8, color: 'linear-gradient(180deg,#34C759,#28A745)', valueColor: 'var(--green)' },
    { label: 'Risk-Adj.\nValue', value: '$7.58M', height: 184, color: 'linear-gradient(180deg,#34C759,#28A745)', valueColor: 'var(--green)' },
  ],
}

export default function RiskAssessmentPage() {
  const d = STATIC_DATA

  // SVG ring: circumference ≈ 364.4
  const CIRCUMFERENCE = 364.4
  const ringFill = (d.riskScore / 100) * CIRCUMFERENCE
  const ringGap = CIRCUMFERENCE - ringFill

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/assessments">Assessments</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <span>Risk Assessment</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Risk Assessment Results</h1>
          <p>{d.companyName} &mdash; Lower score = lower risk &middot; Assessed {d.assessedDate}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export PDF
          </button>
          <Link href="/dashboard/action-center" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            Mitigate Risks
          </Link>
        </div>
      </div>

      {/* Risk Hero */}
      <div className={styles.raRiskHero}>
        <div className={styles.raRiskGauge} aria-label={`Risk score: ${d.riskScore} out of 100`}>
          <svg viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
            <circle cx="70" cy="70" r="58" fill="none" stroke="#FF9500" strokeWidth="12"
              strokeDasharray={`${ringFill} ${ringGap}`} strokeLinecap="round" />
          </svg>
          <div className={styles.raGaugeCenter}>
            <div className={styles.raGaugeNumber}>{d.riskScore}</div>
            <div className={styles.raGaugeDenom}>/100</div>
          </div>
        </div>
        <div>
          <div className={styles.raHeroLabel}>Risk Score &mdash; Lower is Better</div>
          <div className={styles.raHeroRating}>
            <span className={styles.raHeroRatingText}>{d.riskLabel}</span>
            <span className={`${styles.raRiskBadge} ${styles.raRiskBadgeModerate}`}>{d.riskBadge}</span>
          </div>
          <div className={styles.raHeroDesc}>{d.description}</div>
          <div className={styles.caHeroStats}>
            <div>
              <div className={styles.caHeroStatLabel}>Industry Avg Risk</div>
              <div className={styles.caHeroStatValue} style={{ color: 'var(--teal)' }}>{d.industryAvgRisk}</div>
            </div>
            <div>
              <div className={styles.caHeroStatLabel}>Valuation Impact</div>
              <div className={styles.caHeroStatValue} style={{ color: 'var(--orange)' }}>{d.valuationImpact}</div>
            </div>
            <div>
              <div className={styles.caHeroStatLabel}>Risks Identified</div>
              <div className={styles.caHeroStatValue} style={{ color: 'rgba(255,255,255,0.8)' }}>{d.risksIdentified}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: Risk Matrix + Waterfall */}
      <div className={styles.raTwoCol}>
        {/* Risk Matrix */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Risk Matrix</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Likelihood vs. Impact on exit value</div>
            </div>
          </div>
          <div className={styles.raMatrix}>
            {/* Row labels + cells */}
            <div className={styles.raMatrixRowLabel}>High<br />Impact</div>
            {/* High Impact / Low Likelihood */}
            <div className={`${styles.raMatrixCell} ${styles.raHighLow}`}>
              <span className={styles.raMatrixCellLabel}>Monitor</span>
              <div className={`${styles.raRiskDot} ${styles.raDotOrange}`} title="Financial Risk" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                FIN
              </div>
            </div>
            {/* High Impact / High Likelihood */}
            <div className={`${styles.raMatrixCell} ${styles.raHighHigh}`}>
              <span className={styles.raMatrixCellLabel}>Critical</span>
              <div className={`${styles.raRiskDot} ${styles.raDotRed}`} title="Key Person" style={{ top: '40%', left: '40%', transform: 'translate(-50%,-50%)' }}>
                KP
              </div>
              <div className={`${styles.raRiskDot} ${styles.raDotRed}`} title="Customer Concentration" style={{ top: '60%', left: '65%', transform: 'translate(-50%,-50%)' }}>
                CC
              </div>
            </div>

            <div className={styles.raMatrixRowLabel}>Low<br />Impact</div>
            {/* Low Impact / Low Likelihood */}
            <div className={`${styles.raMatrixCell} ${styles.raLowLow}`}>
              <span className={styles.raMatrixCellLabel}>Accept</span>
              <div className={`${styles.raRiskDot} ${styles.raDotGreen}`} title="Market Risk" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                MKT
              </div>
            </div>
            {/* Low Impact / High Likelihood */}
            <div className={`${styles.raMatrixCell} ${styles.raLowHigh}`}>
              <span className={styles.raMatrixCellLabel}>Watch</span>
              <div className={`${styles.raRiskDot} ${styles.raDotOrange}`} title="Operational Risk" style={{ top: '40%', left: '40%', transform: 'translate(-50%,-50%)' }}>
                OPS
              </div>
              <div className={`${styles.raRiskDot} ${styles.raDotGreen}`} title="Legal Risk" style={{ top: '65%', left: '62%', transform: 'translate(-50%,-50%)' }}>
                LEG
              </div>
            </div>

            {/* Bottom axis labels */}
            <div />
            <div className={styles.raAxisLabel}>Low Likelihood</div>
            <div className={styles.raAxisLabel}>High Likelihood</div>
          </div>
        </div>

        {/* Valuation Impact Waterfall */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Valuation Impact</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>How each risk discounts your $8.2M enterprise value</div>
            </div>
          </div>
          <div className={styles.raWaterfall}>
            {d.waterfall.map((bar, i) => (
              <div key={i} className={styles.raWfCol}>
                <div className={styles.raWfValue} style={{ color: bar.valueColor, fontSize: i === d.waterfall.length - 1 ? '12px' : undefined }}>
                  {bar.value}
                </div>
                <div
                  className={styles.raWfBar}
                  style={{ height: `${bar.height}px`, background: bar.color }}
                />
                <div className={styles.raWfLabel}>
                  {bar.label.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < bar.label.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Total risk discount: $620K (7.6% of enterprise value)
          </div>
        </div>
      </div>

      {/* Risk Detail Table */}
      <div className={styles.card} style={{ marginTop: '20px' }}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Risk Detail by Category</div>
        </div>
        {d.risks.map((risk) => (
          <div key={risk.name} className={styles.raRiskItem}>
            <div>
              <div className={styles.raRiskItemName}>{risk.name}</div>
              <div className={styles.raRiskItemDesc}>{risk.desc}</div>
              <div className={styles.raRiskItemMetric}>{risk.metric}</div>
            </div>
            <span className={`${styles.raSeverityBadge} ${styles[risk.severityClass]}`}>{risk.severity}</span>
            <div style={{ textAlign: 'right' }}>
              <div className={`${styles.raTrendArrow} ${styles[risk.trendClass]}`}>{risk.trend}</div>
              <div style={{ marginTop: '4px' }}>
                <span className={`${styles.raMitigationBadge} ${styles[risk.mitigationClass]}`}>{risk.mitigation}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
