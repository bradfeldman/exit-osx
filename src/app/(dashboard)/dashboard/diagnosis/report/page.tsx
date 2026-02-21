'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from '@/components/assessments/assessments.module.css'

// TODO: wire to API — GET /api/companies/[id]/diagnosis/report
const STATIC_REPORT = {
  companyName: 'Reynolds HVAC Services — Austin, TX',
  generatedDate: 'February 10, 2026',
  confidence: 87,
  missingData: ['Employee survey', 'Customer NPS'],
  sections: [
    {
      id: 'sec-diagnosis',
      num: '1',
      title: 'Executive Diagnosis',
      subtitle: 'AI-generated synthesis of overall business health and exit readiness',
    },
    {
      id: 'sec-model',
      num: '2',
      title: 'Business Model Assessment',
      subtitle: 'Revenue quality, pricing power, and customer economics',
    },
    {
      id: 'sec-competitive',
      num: '3',
      title: 'Competitive Position',
      subtitle: 'Market standing, differentiation, and threat landscape',
    },
    {
      id: 'sec-buyers',
      num: '4',
      title: 'Buyer Attractiveness',
      subtitle: 'Fit assessment across four buyer archetypes',
    },
    {
      id: 'sec-risks',
      num: '5',
      title: 'Risk Profile',
      subtitle: 'Quantified risk scoring across six categories',
    },
    {
      id: 'sec-actions',
      num: '6',
      title: 'Pre-Sale Action Plan',
      subtitle: 'Prioritized steps to maximize exit value',
    },
  ],
}

export default function AIDiagnosisReportPage() {
  const [activeSection, setActiveSection] = useState('sec-diagnosis')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.3, rootMargin: '-100px 0px -60% 0px' }
    )
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div>
      {/* Page Progress Rail */}
      <nav className={styles.pageProgress} aria-label="Report sections">
        {STATIC_REPORT.sections.map((sec, i) => (
          <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              className={`${styles.pageProgressDot} ${activeSection === sec.id ? 'active' : ''}`}
              data-label={sec.title}
              onClick={() => {
                const el = sectionRefs.current[sec.id]
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              aria-label={`Jump to section: ${sec.title}`}
            />
            {i < STATIC_REPORT.sections.length - 1 && <div className={styles.pageProgressLine} />}
          </div>
        ))}
      </nav>

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
        <span>AI Company Diagnosis</span>
      </nav>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ marginBottom: 0 }}>AI Company Diagnosis Report</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--purple-light)', color: 'var(--purple)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
              AI-Generated
            </span>
          </div>
          <p>{STATIC_REPORT.companyName} &middot; Generated {STATIC_REPORT.generatedDate}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download PDF
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Report Wrapper */}
      <div className={styles.reportWrapper}>

        {/* Meta bar */}
        <div className={styles.reportMetaBar}>
          <div className={styles.reportMetaLeft}>
            Based on data as of <strong>{STATIC_REPORT.generatedDate}</strong> &middot; Analysis reflects all completed assessments and connected financial data
          </div>
          <div className={styles.reportPageIndicator}>Pages 1&ndash;4 of 12</div>
        </div>

        {/* Document */}
        <div className={styles.reportDoc}>

          {/* Document Header */}
          <div className={styles.reportDocHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '20px' }}>
              <div className={styles.reportCompanyBadge} style={{ marginBottom: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
                {STATIC_REPORT.companyName}
              </div>
              <div className={styles.aiBadge} style={{ marginBottom: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                AI-Generated
              </div>
            </div>
            <div className={styles.reportDocTitle}>
              <span className={styles.sparkleIcon}>&#10024;</span>
              AI COMPANY DIAGNOSIS
            </div>
            <div className={styles.reportDocSubtitle}>
              Deep business analysis across 6 dimensions &middot; Powered by Exit OS AI &middot; {STATIC_REPORT.generatedDate}
            </div>

            <div className={styles.confidenceBarWrap}>
              <div>
                <div className={styles.confidenceLabel}>AI Confidence Level</div>
                <div className={styles.confidenceValue}>{STATIC_REPORT.confidence}%</div>
                <div className={styles.confidenceDesc}>Based on data completeness score</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.confidenceTrack}>
                  <div className={styles.confidenceFill} style={{ width: `${STATIC_REPORT.confidence}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Missing data</div>
                {STATIC_REPORT.missingData.map((item) => (
                  <div key={item} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{item}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className={styles.reportBody}>

            {/* Section 1: Executive Diagnosis */}
            <div
              className={styles.reportSection}
              id="sec-diagnosis"
              ref={(el) => { sectionRefs.current['sec-diagnosis'] = el }}
            >
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>1</div>
                <div>
                  <div className={styles.reportSectionTitle}>Executive Diagnosis</div>
                  <div className={styles.reportSectionSubtitle}>AI-generated synthesis of overall business health and exit readiness</div>
                </div>
              </div>
              <p className={styles.reportText}>
                Reynolds HVAC Services is a <strong>fundamentally sound, profitable business</strong> with strong growth momentum and a loyal customer base built over 23 years in the Austin market. At $12.8M in revenue and $2.05M in EBITDA, the company sits in a sweet spot for acquisition interest from both regional HVAC platform consolidators and private equity firms pursuing service sector roll-ups. The financial profile is clean: low leverage, expanding margins, and a meaningful recurring revenue component in service contracts.
              </p>
              <p className={styles.reportText}>
                The most significant constraint on exit value is <strong>owner dependence</strong>. The owner is deeply embedded in daily operations, customer relationships, and strategic decision-making. This is the central risk buyers will price — and the central opportunity: each month spent systematically reducing owner dependence increases transferable value. The company&apos;s BRI score of 71/100 reflects genuine operational strength, but the transferability sub-score of 42/100 signals real work remaining.
              </p>
              <div className={`${styles.insightBox} ${styles.insightBoxPurple}`}>
                <strong>AI Diagnosis Summary:</strong> Reynolds HVAC is exit-ready in its financial fundamentals, but operationally dependent on its founder. A 12–18 month focused preparation period targeting owner extraction, process documentation, and recurring revenue growth could increase enterprise value by an estimated <strong>$800K–$1.4M</strong>.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 2: Business Model */}
            <div
              className={styles.reportSection}
              id="sec-model"
              ref={(el) => { sectionRefs.current['sec-model'] = el }}
            >
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>2</div>
                <div>
                  <div className={styles.reportSectionTitle}>Business Model Assessment</div>
                  <div className={styles.reportSectionSubtitle}>Revenue quality, pricing power, and customer economics</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  {[
                    { color: 'green', label: 'Recurring Revenue', desc: '20% of revenue ($2.56M) is under service contracts. Growing from 14% in 2023 — a positive trend. Recurring contracts carry a 2–3x valuation premium over project revenue.', score: 'Strong', scoreClass: 'factorScoreGood' },
                    { color: 'blue', label: 'Customer Lifetime Value', desc: 'Estimated average customer relationship of 6.2 years for residential, 4.8 years for commercial. High repeat service rates indicate strong satisfaction.', score: 'Moderate', scoreClass: 'factorScoreOk' },
                    { color: 'orange', label: 'Switching Costs', desc: 'Service contract customers face modest switching costs. Commercial clients have moderate lock-in via multi-year maintenance agreements.', score: 'Moderate', scoreClass: 'factorScoreOk' },
                    { color: 'green', label: 'Pricing Power', desc: 'Gross margins expanded 100 bps to 45.0% despite labor cost inflation, indicating ability to pass costs through. No evidence of price-driven customer losses.', score: 'Strong', scoreClass: 'factorScoreGood' },
                  ].map((item) => (
                    <div key={item.label} className={styles.factorRow} style={{ paddingTop: item.label === 'Recurring Revenue' ? 0 : undefined }}>
                      <div className={`${styles.factorIcon} ${styles[`factorIcon${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`]}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                      </div>
                      <div className={styles.factorContent}>
                        <div className={styles.factorTitle}>{item.label}</div>
                        <div className={styles.factorDesc}>{item.desc}</div>
                      </div>
                      <div className={`${styles.factorScore} ${styles[item.scoreClass]}`}>{item.score}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.gradeCard} style={{ flexDirection: 'column', textAlign: 'center', gap: '6px', minWidth: '100px' }}>
                  <div className={styles.gradeLabel}>Overall Rating</div>
                  <div className={styles.gradeLetter}>B+</div>
                  <div className={styles.gradeMeaning} style={{ fontSize: '12px' }}>Above Average</div>
                </div>
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 3: Competitive Position */}
            <div
              className={styles.reportSection}
              id="sec-competitive"
              ref={(el) => { sectionRefs.current['sec-competitive'] = el }}
            >
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>3</div>
                <div>
                  <div className={styles.reportSectionTitle}>Competitive Position</div>
                  <div className={styles.reportSectionSubtitle}>Market standing, differentiation, and threat landscape</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  {[
                    { color: 'blue', label: 'Estimated Market Share (Austin MSA)', desc: 'Estimated 2.1% share of the $610M Austin HVAC services market. Top 8 players hold ~35% of market. Reynolds occupies a strong mid-market position.', score: '2.1%', scoreClass: 'factorScoreOk' },
                    { color: 'green', label: 'Key Differentiators', desc: '23-year brand reputation, Google rating 4.8/5 (412 reviews), licensed Trane and Carrier dealer, 24/7 emergency response, no weekend surcharge policy.', score: 'Solid', scoreClass: 'factorScoreGood' },
                    { color: 'orange', label: 'Primary Threats', desc: 'National franchises expanding Austin footprint. PE-backed HVAC roll-ups offering above-market wages for technicians. Labor cost pressure is most acute near-term risk.', score: 'Manageable', scoreClass: 'factorScoreOk' },
                  ].map((item) => (
                    <div key={item.label} className={styles.factorRow} style={{ paddingTop: item.label === 'Estimated Market Share (Austin MSA)' ? 0 : undefined }}>
                      <div className={`${styles.factorIcon} ${styles[`factorIcon${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`]}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>
                      </div>
                      <div className={styles.factorContent}>
                        <div className={styles.factorTitle}>{item.label}</div>
                        <div className={styles.factorDesc}>{item.desc}</div>
                      </div>
                      <div className={`${styles.factorScore} ${styles[item.scoreClass]}`}>{item.score}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.gradeCard} style={{ flexDirection: 'column', textAlign: 'center', gap: '6px', minWidth: '100px' }}>
                  <div className={styles.gradeLabel}>Overall Rating</div>
                  <div className={styles.gradeLetter}>B</div>
                  <div className={styles.gradeMeaning} style={{ fontSize: '12px' }}>Competitive</div>
                </div>
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 4: Buyer Attractiveness */}
            <div
              className={styles.reportSection}
              id="sec-buyers"
              ref={(el) => { sectionRefs.current['sec-buyers'] = el }}
            >
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>4</div>
                <div>
                  <div className={styles.reportSectionTitle}>Buyer Attractiveness</div>
                  <div className={styles.reportSectionSubtitle}>Fit assessment across four buyer archetypes</div>
                </div>
              </div>
              <div className={styles.buyerMatrix}>
                {[
                  { type: 'Strategic Acquirer', fit: 'High', fitClass: 'high', desc: 'Larger HVAC operators or facility services firms seeking market share in Austin. Highest multiple potential at 5.5–7x EBITDA.', reason: 'Strong fit due to geographic presence, recurring revenue base, and customer relationships.' },
                  { type: 'Private Equity Roll-up', fit: 'High', fitClass: 'high', desc: 'PE-backed HVAC platforms building regional scale. Typical multiple 4.5–6x. Operator-focused; may require management overlay.', reason: 'Attractive for strong EBITDA margins and growth trajectory, but owner dependence must be resolved.' },
                  { type: 'Individual Buyer (SBA)', fit: 'Medium', fitClass: 'medium', desc: 'Owner-operators financed via SBA. Typically lower multiples (3–4x) but simpler transaction. Longer close timelines.', reason: 'Good fit if transition plan is in place, but owner-reliance limits buyer pool quality.' },
                  { type: 'Financial Sponsor', fit: 'Low', fitClass: 'low', desc: 'Pure financial buyers seeking platform assets. Less interest without a clear management team and recurring revenue above 40%.', reason: 'Current recurring revenue (20%) and owner dependence reduce attractiveness for standalone financial buyers.' },
                ].map((buyer) => (
                  <div key={buyer.type} className={`${styles.buyerTypeCard} ${styles[buyer.fitClass]}`}>
                    <div className={styles.buyerTypeHeader}>
                      <div className={styles.buyerTypeName}>{buyer.type}</div>
                      <span className={`${styles.fitBadge} ${styles[`fit-${buyer.fitClass}`] || styles[`fitBadge${buyer.fitClass.charAt(0).toUpperCase() + buyer.fitClass.slice(1)}`]}`}>{buyer.fit}</span>
                    </div>
                    <div className={styles.buyerTypeDesc}>{buyer.desc}</div>
                    <div className={styles.buyerTypeReason}><strong>Why: </strong>{buyer.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 5: Risk Profile */}
            <div
              className={styles.reportSection}
              id="sec-risks"
              ref={(el) => { sectionRefs.current['sec-risks'] = el }}
            >
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>5</div>
                <div>
                  <div className={styles.reportSectionTitle}>Risk Profile</div>
                  <div className={styles.reportSectionSubtitle}>Quantified risk scoring across six categories</div>
                </div>
              </div>
              <div className={styles.riskRadar}>
                {[
                  { label: 'Owner Dependence', score: 58, scoreClass: 'high', fill: 'red', width: 58 },
                  { label: 'Customer Concentration', score: 44, scoreClass: 'mid', fill: 'orange', width: 44 },
                  { label: 'Operational Systems', score: 38, scoreClass: 'mid', fill: 'orange', width: 38 },
                  { label: 'Financial Risk', score: 18, scoreClass: 'low', fill: 'green', width: 18 },
                  { label: 'Legal & Compliance', score: 12, scoreClass: 'low', fill: 'green', width: 12 },
                  { label: 'Market Risk', score: 22, scoreClass: 'low', fill: 'green', width: 22 },
                ].map((item) => (
                  <div key={item.label} className={styles.riskBarItem}>
                    <div className={styles.riskBarHeader}>
                      <span className={styles.riskBarLabel}>{item.label}</span>
                      <span className={`${styles.riskBarScore} ${styles[item.scoreClass]}`}>{item.score}/100</span>
                    </div>
                    <div className={styles.riskBarTrack}>
                      <div className={`${styles.riskBarFill} ${styles[item.fill]}`} style={{ width: `${item.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`${styles.insightBox} ${styles.insightBoxOrange}`} style={{ marginTop: '16px' }}>
                <strong>Combined risk discount:</strong> Current risk profile reduces estimated enterprise value by approximately <strong>$620K–$840K</strong> from theoretical maximum. Addressing owner dependence and customer concentration would recover the majority of this discount.
              </div>
            </div>

            <hr className={styles.reportDivider} />

            {/* Section 6: Pre-Sale Actions */}
            <div
              className={styles.reportSection}
              id="sec-actions"
              ref={(el) => { sectionRefs.current['sec-actions'] = el }}
            >
              <div className={styles.reportSectionHeader}>
                <div className={styles.reportSectionNum}>6</div>
                <div>
                  <div className={styles.reportSectionTitle}>Pre-Sale Action Plan</div>
                  <div className={styles.reportSectionSubtitle}>Prioritized steps to maximize exit value</div>
                </div>
              </div>
              {[
                { priority: 'P1', priorityClass: 'p1', title: 'Reduce Owner Dependence', desc: 'Delegate top 5 customer relationships to a senior technician or GM. Document all operational decisions currently made by the owner. Target 60+ on owner dependence score.', impact: 'Estimated value impact: +$400K–$600K' },
                { priority: 'P1', priorityClass: 'p1', title: 'Grow Recurring Revenue to 30%+', desc: 'Add 80–120 net new service maintenance contracts over the next 12 months. Price competitively but protect margins. Focus on commercial accounts.', impact: 'Estimated value impact: +$200K–$400K' },
                { priority: 'P2', priorityClass: 'p2', title: 'Document Field SOPs (80%+ coverage)', desc: 'Assign CFO to lead documentation initiative. Use video-based SOPs for faster capture. Cover installation, service, dispatch, and quality control workflows.', impact: 'Estimated value impact: +$150K–$250K' },
                { priority: 'P2', priorityClass: 'p2', title: 'Diversify Customer Concentration', desc: 'Set goal to reduce top-3 customer concentration from 34% to under 25% by signing 3–5 new commercial accounts over 18 months.', impact: 'Estimated value impact: +$100K–$180K' },
                { priority: 'P3', priorityClass: 'p3', title: 'Complete Legal Housekeeping', desc: 'Add IP assignment clauses to 3 remaining vendor contracts. Renew all service agreements with multi-year terms where possible. Prepare data room.', impact: 'Estimated value impact: +$30K–$50K' },
              ].map((action) => (
                <div key={action.title} className={styles.actionItem}>
                  <span className={`${styles.actionPriority} ${styles[action.priorityClass]}`}>{action.priority}</span>
                  <div className={styles.actionContent}>
                    <div className={styles.actionTitle}>{action.title}</div>
                    <div className={styles.actionDesc}>{action.desc}</div>
                    <div className={styles.actionImpact}>{action.impact}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>{/* /report-body */}

          {/* Report Footer */}
          <div className={styles.reportDocFooter}>
            <div className={styles.reportFooterLeft}>
              Exit OSx AI Diagnosis &middot; Confidential &middot; Generated {STATIC_REPORT.generatedDate}<br />
              This report is AI-generated and should be reviewed by a qualified M&amp;A advisor before making financial decisions.
            </div>
            <div className={styles.reportFooterRight}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">Download PDF</button>
              <Link href="/dashboard/action-center" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
                View Action Plan
              </Link>
            </div>
          </div>

        </div>{/* /report-doc */}
      </div>{/* /report-wrapper */}
    </div>
  )
}
