'use client'

import Link from 'next/link'
import styles from '@/components/retirement/retirement.module.css'

// TODO: wire to API — /api/companies/[id]/retirement/tax-planning

const TAX_BREAKDOWN = [
  {
    label: 'Federal Long-Term Capital Gains',
    sub: 'Applied to $6.6M in recognized gain above basis',
    rate: '20%',
    fillWidth: '73%',
    fillColor: '#FFEBEA',
    amount: '$1,320,000',
    amountStyle: {},
  },
  {
    label: 'State Income Tax — Texas',
    sub: 'Texas has no state income tax on capital gains',
    rate: '0%',
    fillWidth: '0%',
    fillColor: '#EAFBEF',
    amount: '$0',
    amountStyle: { color: '#34C759' },
  },
  {
    label: 'Net Investment Income Tax (NIIT)',
    sub: '3.8% on gains above AGI threshold ($200K single)',
    rate: '3.8%',
    fillWidth: '14%',
    fillColor: '#FF9500',
    amount: '$250,000',
    amountStyle: { color: '#FF9500' },
  },
  {
    label: 'Depreciation Recapture',
    sub: 'Section 1250 recapture on real/business property',
    rate: '25%',
    fillWidth: '13%',
    fillColor: '#FF9500',
    amount: '$230,000',
    amountStyle: { color: '#FF9500' },
  },
]

const STRATEGIES = [
  {
    iconBg: '#EBF5FF',
    iconStroke: 'var(--accent)',
    iconPath: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></>,
    status: 'Eligible',
    statusClass: styles.statusEligible,
    name: 'Installment Sale',
    desc: 'Spread the recognition of sale gains over 3–5 years using a seller-financed note structure. Keeps you in lower tax brackets each year, reducing overall effective rate.',
    savingsText: 'Potential savings: ~$180,000',
    savingsSub: 'Depends on deal structure and buyer creditworthiness',
    savingsClass: '',
    complexity: ['#FF9500', '#FF9500', 'var(--border)'],
    complexityLabel: 'Complexity: Medium',
  },
  {
    iconBg: '#FFF6E8',
    iconStroke: '#FF9500',
    iconPath: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    status: 'Requires Review',
    statusClass: styles.statusReview,
    name: 'Qualified Small Business Stock (QSBS)',
    desc: 'Section 1202 exclusion may eliminate up to 100% of federal capital gains tax on qualifying stock held more than 5 years. C-Corp structure and original issuance required.',
    savingsText: 'Potential savings: Up to $10M exclusion',
    savingsSub: 'Check eligibility — S-Corp may need restructuring first',
    savingsClass: styles.strategySavingsReview,
    complexity: ['#FF3B30', '#FF3B30', '#FF3B30'],
    complexityLabel: 'Complexity: High',
  },
  {
    iconBg: '#EAFBEF',
    iconStroke: '#34C759',
    iconPath: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    status: 'Eligible',
    statusClass: styles.statusEligible,
    name: 'Opportunity Zone Investment',
    desc: 'Defer recognized capital gains by reinvesting into a Qualified Opportunity Fund within 180 days of sale. Gains deferred until 2026 (or fund exit), with potential partial step-up in basis.',
    savingsText: 'Potential savings: ~$120,000',
    savingsSub: 'Net present value benefit on deferred taxes',
    savingsClass: '',
    complexity: ['#FF9500', '#FF9500', 'var(--border)'],
    complexityLabel: 'Complexity: Medium',
  },
  {
    iconBg: '#F5EDFB',
    iconStroke: '#AF52DE',
    iconPath: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
    status: 'Eligible',
    statusClass: styles.statusEligible,
    name: 'Charitable Remainder Trust (CRT)',
    desc: 'Transfer pre-sale business interests into a CRT. The trust sells the business tax-free, paying you income for life. You receive a partial charitable deduction and reduce your estate.',
    savingsText: 'Potential savings: ~$95,000 + charitable deduction',
    savingsSub: 'Irrevocable — requires commitment before sale closes',
    savingsClass: '',
    complexity: ['#FF3B30', '#FF3B30', '#FF3B30'],
    complexityLabel: 'Complexity: High',
  },
]

const TIMELINE_ITEMS = [
  { color: '#FF3B30', time: 'Now — Immediately', action: 'Engage a qualified M&A tax attorney', detail: 'Before signing any LOI or engaging buyers formally. The deal structure is set early and is very hard to change later.' },
  { color: '#FF9500', time: '6 Months Before Close', action: 'Assess QSBS eligibility & entity restructuring options', detail: 'If converting from S-Corp to C-Corp for QSBS, the 5-year holding period clock must be re-started. Plan accordingly.' },
  { color: '#FF9500', time: '3–6 Months Before Close', action: 'Establish Charitable Remainder Trust if pursuing', detail: 'CRT must be funded with business interests before the sale is considered a done deal. Must occur before signing a binding purchase agreement.' },
  { color: 'var(--accent)', time: '2–3 Months Before Close', action: 'Negotiate installment sale terms in the purchase agreement', detail: 'Structure the seller note with appropriate interest rate (AFR minimum), payment schedule, and security provisions.' },
  { color: 'var(--accent)', time: 'At Signing', action: 'Confirm asset vs. stock sale structure and price allocation', detail: 'Section 1060 asset allocation affects your tax basis on each asset class. Negotiate purchase price allocation with buyer to minimize recapture.' },
  { color: '#34C759', time: 'Within 180 Days of Close', action: 'Invest qualifying gains in Opportunity Zone Fund', detail: 'The 180-day window starts at the date of sale. Identify a qualified OZ fund in advance so you can act quickly after closing.' },
]

export default function TaxPlanningPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/retirement">Retirement</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Tax Planning</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeaderRow}>
        <div>
          <h1>Pre-Exit Tax Strategy</h1>
          <p>Maximize what you keep after the sale — Reynolds HVAC Services · $8.2M transaction</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            Find a Tax Advisor
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Discuss with AI Coach
          </button>
        </div>
      </div>

      {/* Tax Hero */}
      <div className={styles.taxHero}>
        <div className={styles.taxHeroLabel}>Tax Impact Summary — Based on $8.2M sale price</div>
        <div className={styles.taxHeroFlow}>
          <div className={styles.taxHeroBox}>
            <div className={styles.taxHeroBoxLabel}>Gross Proceeds</div>
            <div className={styles.taxHeroBoxValue}>$8,200,000</div>
            <div className={styles.taxHeroBoxSub}>Enterprise value at sale</div>
          </div>
          <div className={styles.taxHeroArrow}>→</div>
          <div className={`${styles.taxHeroBox} ${styles.taxHeroBoxNegative}`}>
            <div className={styles.taxHeroBoxLabel}>Total Est. Taxes</div>
            <div className={styles.taxHeroBoxValue}>($1,800,000)</div>
            <div className={styles.taxHeroBoxSub}>All federal &amp; state taxes</div>
          </div>
          <div className={styles.taxHeroArrow}>→</div>
          <div className={`${styles.taxHeroBox} ${styles.taxHeroBoxPositive}`}>
            <div className={styles.taxHeroBoxLabel}>Net After Tax</div>
            <div className={styles.taxHeroBoxValue}>$6,400,000</div>
            <div className={styles.taxHeroBoxSub}>In your pocket at closing</div>
          </div>
        </div>
        <div className={styles.taxHeroRateCallout}>
          <div className={styles.taxHeroRateBadge}>22% effective rate</div>
          <div className={styles.taxHeroRateText}>
            <span className={styles.taxHeroRateSavings}>Optimized from a 28% baseline</span> through active planning strategies.
            Without these strategies, you would owe approximately <strong>$540,000 more</strong> in taxes — reducing your take-home to $5.86M.
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className={styles.aiInsightDark}>
        <div className={styles.aiInsightDarkIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightDarkTitle}>Exit OS AI — Tax Strategy Analysis</div>
          <div className={styles.aiInsightDarkText}>
            At a <strong>22% effective rate, you&apos;re keeping $6.4M of the $8.2M sale price</strong> — that&apos;s $540K more than a seller who didn&apos;t plan ahead. The biggest remaining opportunity is the <strong>Qualified Opportunity Zone investment</strong>: if you invest your recognized gain within 180 days of closing, you can defer capital gains taxes and potentially eliminate gains on the QOZ investment itself if held 10 years. Your <strong>S-Corp structure is favorable</strong> for an asset sale, but requires careful allocation between personal goodwill, equipment, and covenant-not-to-compete — each is taxed differently. Before accepting any LOI, confirm whether the buyer wants an asset or stock purchase, as this decision alone could shift your net proceeds by $200K–$400K.
          </div>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Tax Breakdown</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Estimated taxes by category based on current structure</div>
          </div>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>Adjust Inputs</button>
        </div>
        {TAX_BREAKDOWN.map((row) => (
          <div key={row.label} className={styles.breakdownRow}>
            <div className={styles.breakdownLabel}>
              {row.label}
              <small className={styles.breakdownLabelSmall}>{row.sub}</small>
            </div>
            <div className={styles.breakdownRate}>{row.rate}</div>
            <div className={styles.breakdownBar}>
              <div className={styles.breakdownFill} style={{ width: row.fillWidth, background: row.fillColor }} />
            </div>
            <div className={styles.breakdownAmount} style={row.amountStyle}>{row.amount}</div>
          </div>
        ))}
        <div className={`${styles.breakdownRow} ${styles.breakdownRowTotal}`}>
          <div className={styles.breakdownLabel} style={{ fontWeight: 700, fontSize: 15 }}>Total Estimated Tax Liability</div>
          <div className={styles.breakdownRate} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>22% eff.</div>
          <div className={styles.breakdownBar} />
          <div className={`${styles.breakdownAmount} ${styles.breakdownAmountTotal}`}>$1,800,000</div>
        </div>
      </div>

      {/* Optimization Strategies */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>Tax Optimization Strategies</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Strategies that may reduce your total tax burden before or at closing.</div>
      </div>

      <div className={styles.strategiesGrid}>
        {STRATEGIES.map((s) => (
          <div key={s.name} className={styles.strategyCard}>
            <div className={styles.strategyHeader}>
              <div className={styles.strategyIcon} style={{ background: s.iconBg }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={s.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {s.iconPath}
                </svg>
              </div>
              <span className={`${styles.strategyStatus} ${s.statusClass}`}>{s.status}</span>
            </div>
            <div className={styles.strategyName}>{s.name}</div>
            <div className={styles.strategyDesc}>{s.desc}</div>
            <div className={`${styles.strategySavings} ${s.savingsClass}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {s.savingsClass === styles.strategySavingsReview
                  ? <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                  : <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>
                }
              </svg>
              <div>
                <div className={styles.strategySavingsText}>{s.savingsText}</div>
                <div className={styles.strategySavingsSub}>{s.savingsSub}</div>
              </div>
            </div>
            <div className={styles.strategyComplexity}>
              {s.complexity.map((c, i) => (
                <div key={i} className={styles.complexityDot} style={{ background: c }} />
              ))}
              {s.complexityLabel}
            </div>
          </div>
        ))}
      </div>

      {/* Entity Structure */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Entity Structure Considerations</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Your current S-Corp structure creates different outcomes depending on deal type</div>
        </div>
        <div className={styles.entityFlow}>
          <div className={styles.entityBox}>
            <div className={styles.entityLabel}>Current Structure</div>
            <div className={styles.entityValue}>S-Corporation</div>
          </div>
          <div className={styles.entityArrow}>→</div>
          <div className={`${styles.entityBox} ${styles.entityBoxAccent}`}>
            <div className={styles.entityLabel}>Sale Type Decision</div>
            <div className={`${styles.entityValue} ${styles.entityValueAccent}`}>Asset Sale vs. Stock Sale</div>
          </div>
        </div>
        <div className={styles.comparisonRowGrid}>
          <div className={styles.comparisonCol}>
            <div className={styles.comparisonColTitle}>Asset Sale (Buyer Preferred)</div>
            {[
              { label: 'Tax treatment', value: 'Ordinary + LTCG rates', cls: '' },
              { label: 'Depreciation recapture', value: 'Yes — taxable', cls: styles.comparisonItemBad },
              { label: 'Buyer benefit', value: 'Step-up in basis', cls: styles.comparisonItemGood },
              { label: 'Typical seller discount', value: '−5% to −10%', cls: styles.comparisonItemBad },
              { label: 'Complexity', value: 'Medium', cls: '' },
            ].map((row) => (
              <div key={row.label} className={styles.comparisonItem}>
                <span className={styles.comparisonItemLabel}>{row.label}</span>
                <span className={`${styles.comparisonItemValue} ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className={styles.comparisonCol}>
            <div className={styles.comparisonColTitle}>Stock Sale (Seller Preferred)</div>
            {[
              { label: 'Tax treatment', value: 'Pure LTCG rates', cls: styles.comparisonItemGood },
              { label: 'Depreciation recapture', value: 'Generally avoided', cls: styles.comparisonItemGood },
              { label: 'Buyer benefit', value: 'No step-up in basis', cls: styles.comparisonItemBad },
              { label: 'Seller tax savings', value: '+$100K–$230K', cls: styles.comparisonItemGood },
              { label: 'Complexity', value: 'Lower', cls: '' },
            ].map((row) => (
              <div key={row.label} className={styles.comparisonItem}>
                <span className={styles.comparisonItemLabel}>{row.label}</span>
                <span className={`${styles.comparisonItemValue} ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#FFF6E8', border: '1px solid #FFD699', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#8C5200' }}>
          <strong>Note:</strong> ServiceMaster PE&apos;s current LOI ($7.8M) specifies an asset sale structure. Negotiating for a stock sale or requesting a price adjustment to compensate for the tax differential is worth exploring before executing the LOI.
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Pre-Sale Tax Planning Timeline</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Actions to take before closing — time is critical for several strategies</div>
        </div>
        <div className={styles.taxTimeline}>
          {TIMELINE_ITEMS.map((item) => (
            <div key={item.action} className={styles.taxTimelineItem}>
              <div className={styles.taxTimelineDot}>
                <div className={styles.taxTimelineDotInner} style={{ background: item.color }} />
              </div>
              <div className={styles.taxTimelineTime} style={{ color: item.color }}>{item.time}</div>
              <div className={styles.taxTimelineAction}>{item.action}</div>
              <div className={styles.taxTimelineDetail}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className={styles.disclaimerText}>
          <strong>Educational purposes only.</strong> This analysis is provided as general guidance based on commonly available tax strategies and publicly known information about your business profile. It does not constitute tax, legal, or financial advice. Tax laws change frequently and your specific situation may differ materially. Always consult a qualified CPA, tax attorney, or M&amp;A advisor before making any decisions related to your exit transaction.
        </div>
      </div>

      {/* Action Row */}
      <div className={styles.actionRow}>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Discuss with AI Coach
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          Find a Tax Advisor
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Tax Summary PDF
        </button>
      </div>
    </div>
  )
}
