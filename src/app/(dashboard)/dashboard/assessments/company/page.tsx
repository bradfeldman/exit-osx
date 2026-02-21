'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/assessments/assessments.module.css'

// TODO: wire to API — GET /api/companies/[id]/assessments/company
const STATIC_DATA = {
  companyName: 'Reynolds HVAC Services',
  completedDate: 'February 10, 2026',
  questionCount: 24,
  dimensionCount: 7,
  overallScore: 74,
  rating: 'Good',
  grade: 'B+',
  description:
    'Reynolds HVAC shows strong financial performance and revenue quality. Key areas of improvement are owner dependence and operational documentation — both are common pre-exit priorities in the trades sector.',
  industryAvg: 61,
  topQuartile: 82,
  percentile: '68th',
  lastAssessment: 'Nov 2025',
  dimensions: [
    {
      name: 'Financial Health',
      desc: 'EBITDA margin, revenue growth, working capital',
      weight: '25%',
      score: 84,
      color: 'green' as const,
      grade: 'A',
      gradeClass: 'gradeA' as const,
    },
    {
      name: 'Revenue Quality',
      desc: 'Recurring revenue, contract mix, churn rate',
      weight: '20%',
      score: 78,
      color: 'green' as const,
      grade: 'B+',
      gradeClass: 'gradeB' as const,
    },
    {
      name: 'Customer Concentration',
      desc: 'Top customer % of revenue, client diversification',
      weight: '15%',
      score: 62,
      color: 'orange' as const,
      grade: 'C',
      gradeClass: 'gradeC' as const,
    },
    {
      name: 'Owner Dependence',
      desc: 'Business continuity, management depth, key person risk',
      weight: '15%',
      score: 42,
      color: 'orange' as const,
      grade: 'C-',
      gradeClass: 'gradeC' as const,
    },
    {
      name: 'Operational Maturity',
      desc: 'SOPs, documented processes, technology systems',
      weight: '10%',
      score: 58,
      color: 'orange' as const,
      grade: 'C+',
      gradeClass: 'gradeC' as const,
    },
    {
      name: 'Legal & Compliance',
      desc: 'Contracts, licenses, IP protection, regulatory standing',
      weight: '10%',
      score: 80,
      color: 'green' as const,
      grade: 'A-',
      gradeClass: 'gradeA' as const,
    },
    {
      name: 'Market Position',
      desc: 'Competitive moat, brand strength, market share',
      weight: '5%',
      score: 72,
      color: 'green' as const,
      grade: 'B',
      gradeClass: 'gradeB' as const,
    },
  ],
  strengths: [
    '16% EBITDA margin consistently exceeds the 12–14% HVAC industry average over 3 consecutive years',
    '38% of revenue is recurring maintenance contracts, providing predictable cash flow that buyers prize',
    'All licenses current, no pending litigation, and strong contractor compliance record in Austin market',
  ],
  improvements: [
    'Top 3 customers represent 34% of revenue — above the 25% threshold most PE buyers flag in diligence',
    'Business continuity is critically dependent on the owner for key customer relationships and operational decisions',
    'Only 45% of field operations are covered by documented SOPs, limiting buyer confidence in a smooth transition',
  ],
  comparisons: [
    { label: 'Financial Health', yours: 84, industry: 65, yoursColor: 'accent' as const },
    { label: 'Revenue Quality', yours: 78, industry: 54, yoursColor: 'accent' as const },
    { label: 'Owner Dependence', yours: 42, industry: 48, yoursColor: 'orange' as const },
    { label: 'Operational Maturity', yours: 58, industry: 55, yoursColor: 'orange' as const },
  ],
}

export default function CompanyAssessmentPage() {
  const d = STATIC_DATA

  // SVG ring: circumference = 2 * π * 58 ≈ 364.4
  const CIRCUMFERENCE = 364.4
  const ringFill = (d.overallScore / 100) * CIRCUMFERENCE
  const ringGap = CIRCUMFERENCE - ringFill

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/assessments">Assessments</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <span>Company Assessment</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Company Assessment Results</h1>
          <p>{d.companyName} &mdash; Completed {d.completedDate} &middot; {d.questionCount} questions across {d.dimensionCount} dimensions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export PDF
          </button>
          <Link href="/dashboard/assessments/take" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
            Retake Assessment
          </Link>
        </div>
      </div>

      {/* Score Hero */}
      <div className={styles.caScoreHero}>
        <div className={styles.caScoreRing} aria-label={`Overall score: ${d.overallScore} out of 100`}>
          <svg viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
            <circle cx="70" cy="70" r="58" fill="none" stroke="#34C759" strokeWidth="12"
              strokeDasharray={`${ringFill} ${ringGap}`} strokeLinecap="round" />
          </svg>
          <div className={styles.caScoreRingCenter}>
            <div className={styles.caScoreNumber}>{d.overallScore}</div>
            <div className={styles.caScoreDenom}>/100</div>
          </div>
        </div>
        <div className={styles.caScoreContent}>
          <div className={styles.caScoreLabel}>Overall Company Assessment Score</div>
          <div className={styles.caScoreRating}>
            <span className={styles.caScoreRatingText}>{d.rating}</span>
            <span className={`${styles.caRatingBadge} ${styles.caRatingGood}`}>{d.grade}</span>
          </div>
          <div className={styles.caScoreDesc}>{d.description}</div>
          <div className={styles.caHeroStats}>
            <div>
              <div className={styles.caHeroStatLabel}>Industry Avg</div>
              <div className={styles.caHeroStatValue} style={{ color: 'var(--teal)' }}>{d.industryAvg}</div>
            </div>
            <div>
              <div className={styles.caHeroStatLabel}>Top Quartile</div>
              <div className={styles.caHeroStatValue} style={{ color: '#C084FC' }}>{d.topQuartile}</div>
            </div>
            <div>
              <div className={styles.caHeroStatLabel}>Percentile</div>
              <div className={styles.caHeroStatValue} style={{ color: 'var(--green)' }}>{d.percentile}</div>
            </div>
            <div>
              <div className={styles.caHeroStatLabel}>Last Assessment</div>
              <div className={styles.caHeroStatValue} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{d.lastAssessment}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className={styles.card} style={{ marginBottom: '20px' }}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Score by Dimension</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {d.dimensionCount} dimensions weighted by buyer importance in HVAC sector transactions
            </div>
          </div>
        </div>
        <table className={styles.caBreakdownTable}>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Weight</th>
              <th style={{ minWidth: '160px' }}>Score</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {d.dimensions.map((dim) => (
              <tr key={dim.name}>
                <td>
                  <div className={styles.caDimName}>{dim.name}</div>
                  <div className={styles.caDimDesc}>{dim.desc}</div>
                </td>
                <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>{dim.weight}</td>
                <td>
                  <div className={styles.caScoreBarCell}>
                    <div className={styles.caScoreBarTrack}>
                      <div
                        className={`${styles.caScoreBarFill} ${dim.color === 'green' ? styles.caBarGreen : styles.caBarOrange}`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                    <div
                      className={styles.caScoreVal}
                      style={{ color: dim.color === 'green' ? 'var(--green)' : 'var(--orange)' }}
                    >
                      {dim.score}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`${styles.caGrade} ${styles[dim.gradeClass]}`}>{dim.grade}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Findings */}
      <div className={styles.card} style={{ marginBottom: '20px' }}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Top Findings</div>
        </div>
        <div className={styles.caFindingsGrid}>
          <div>
            <div className={styles.caFindingsColTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', color: 'var(--green)' }} aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Strengths
            </div>
            {d.strengths.map((text, i) => (
              <div key={i} className={`${styles.caFindingItem} ${styles.caFindingStrength}`}>
                <svg className={`${styles.caFindingIcon} ${styles.caIconGreen}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                <div className={styles.caFindingText}>{text}</div>
              </div>
            ))}
          </div>
          <div>
            <div className={styles.caFindingsColTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', color: 'var(--orange)' }} aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              Improvements Needed
            </div>
            {d.improvements.map((text, i) => (
              <div key={i} className={`${styles.caFindingItem} ${styles.caFindingImprovement}`}>
                <svg className={`${styles.caFindingIcon} ${styles.caIconOrange}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <div className={styles.caFindingText}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Industry Comparison */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Industry Comparison</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Your scores vs. HVAC sector median (Austin, TX market)
            </div>
          </div>
        </div>
        {d.comparisons.map((row) => (
          <div key={row.label} className={styles.caComparisonRow}>
            <div className={styles.caComparisonLabel}>{row.label}</div>
            <div className={styles.caComparisonBars}>
              <div className={styles.caComparisonBarWrap}>
                <div className={styles.caComparisonBarLabel}>You</div>
                <div className={styles.caComparisonBarTrack}>
                  <div
                    className={styles.caComparisonBarFill}
                    style={{
                      width: `${row.yours}%`,
                      background: row.yoursColor === 'accent' ? 'var(--accent)' : 'var(--orange)',
                    }}
                  />
                </div>
                <div className={styles.caComparisonScore} style={{ color: row.yoursColor === 'accent' ? 'var(--accent)' : 'var(--orange)' }}>
                  {row.yours}
                </div>
              </div>
              <div className={styles.caComparisonBarWrap}>
                <div className={styles.caComparisonBarLabel}>Industry</div>
                <div className={styles.caComparisonBarTrack}>
                  <div className={styles.caComparisonBarFillIndustry} style={{ width: `${row.industry}%` }} />
                </div>
                <div className={styles.caComparisonScore} style={{ color: 'var(--text-tertiary)' }}>{row.industry}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Action CTA */}
        <div className={styles.caActionCta}>
          <div>
            <div className={styles.caActionCtaTitle}>Improve your score by 8–12 points</div>
            <div className={styles.caActionCtaDesc}>3 high-impact actions identified in your personalized plan</div>
          </div>
          <Link href="/dashboard/action-center" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
            View Action Plan
          </Link>
        </div>
      </div>
    </div>
  )
}
