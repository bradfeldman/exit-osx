'use client'

import Link from 'next/link'
import styles from '@/components/instant-valuation/instant-valuation.module.css'

// TODO: wire to API — fetch first valuation data for new users

const VALUATION_DATA = {
  low: '$5.8M',
  high: '$8.4M',
  midpoint: '$7.1M',
  revenue: '$2.4M',
  multiple: '2.9x',
  enterprise: '$7.1M',
  ownerProceeds: '$6.4M',
  taxEstimate: '$1.6M',
  netProceeds: '$4.8M',
}

const UPLIFT_ITEMS = [
  {
    icon: 'chart',
    color: 'upliftIconBlue',
    text: 'Improve revenue consistency — businesses with 3+ years of growing revenue trade at 0.5–1.0x higher multiples.',
    href: '/dashboard/playbook/financial-cleanup',
    linkLabel: 'Start Financial Cleanup Playbook',
  },
  {
    icon: 'shield',
    color: 'upliftIconGreen',
    text: 'Reduce owner dependency — document key processes and build a management team to increase enterprise value by 15–25%.',
    href: '/dashboard/playbook/reduce-owner-dependency',
    linkLabel: 'Start Reduce Owner Dependency Playbook',
  },
  {
    icon: 'users',
    color: 'upliftIconOrange',
    text: 'Diversify your customer base — if one customer represents >20% of revenue, buyers will apply a concentration risk discount.',
    href: '/dashboard/playbook/customer-diversification',
    linkLabel: 'View Customer Diversification Playbook',
  },
]

const CONFETTI_DOTS = [
  { w: 6, h: 6, color: '#34C759', top: '15%', left: '8%', delay: '0s', dur: '7s' },
  { w: 8, h: 8, color: '#0071E3', top: '70%', left: '12%', delay: '1.2s', dur: '6s' },
  { w: 5, h: 5, color: '#FF9500', top: '30%', left: '22%', delay: '0.4s', dur: '8s', square: true },
  { w: 10, h: 10, color: '#AF52DE', top: '80%', left: '35%', delay: '2s', dur: '6.5s' },
  { w: 6, h: 6, color: '#34C759', top: '10%', left: '50%', delay: '0.8s', dur: '7.5s' },
  { w: 4, h: 4, color: '#5AC8FA', top: '55%', left: '60%', delay: '1.6s', dur: '6s', square: true },
  { w: 8, h: 8, color: '#FF9500', top: '25%', left: '72%', delay: '0.2s', dur: '8.5s' },
  { w: 5, h: 5, color: '#34C759', top: '65%', left: '82%', delay: '3s', dur: '7s' },
  { w: 7, h: 7, color: '#0071E3', top: '40%', left: '90%', delay: '1s', dur: '6.5s', square: true },
  { w: 9, h: 9, color: '#AF52DE', top: '85%', left: '95%', delay: '2.4s', dur: '7.5s' },
]

const UpliftIcon = ({ type }: { type: string }) => {
  if (type === 'chart') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
  if (type === 'shield') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

export default function InstantValuationPage() {
  // TODO: wire to API — fetch real valuation data from /api/companies/[id]/valuation

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard" className={styles.breadcrumb}>Home</Link>
        <span className={styles.breadcrumbSep} aria-hidden="true">/</span>
        <span className={styles.breadcrumbCurrent}>Your First Valuation</span>
      </nav>

      {/* Dark gradient hero */}
      <section className={styles.valuationHero} aria-label="Valuation estimate">
        {/* Confetti dots */}
        <div className={styles.confettiLayer} aria-hidden="true">
          {CONFETTI_DOTS.map((dot, i) => (
            <div
              key={i}
              className={styles.confettiDot}
              style={{
                width: dot.w,
                height: dot.h,
                background: dot.color,
                top: dot.top,
                left: dot.left,
                animationDelay: dot.delay,
                animationDuration: dot.dur,
                borderRadius: dot.square ? 2 : '50%',
                transform: dot.square ? 'rotate(30deg)' : undefined,
              }}
            />
          ))}
        </div>

        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>Estimated Enterprise Value</p>
          <p className={styles.heroHeading}>Based on your financials and industry data</p>
          <div className={styles.heroValue} aria-label={`${VALUATION_DATA.low} to ${VALUATION_DATA.high}`}>
            {VALUATION_DATA.low}–{VALUATION_DATA.high}
          </div>
          <p className={styles.heroSub}>
            This is a preliminary estimate based on the revenue multiples method. Connect your financials and complete your assessment to get a full 3-method valuation.
          </p>
          <div className={styles.heroBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Preliminary estimate — connect financials to refine
          </div>
        </div>
      </section>

      {/* How we calculated this */}
      <section className={styles.card} aria-label="Calculation explanation">
        <h2 className={styles.cardTitle}>How We Calculated This</h2>
        <div className={styles.equationBlock} role="math" aria-label={`${VALUATION_DATA.revenue} revenue × ${VALUATION_DATA.multiple} multiple = ${VALUATION_DATA.enterprise} enterprise value`}>
          <div className={styles.eqCell}>
            <div className={styles.eqCellLabel}>Revenue</div>
            <div className={styles.eqCellValue}>{VALUATION_DATA.revenue}</div>
          </div>
          <div className={styles.eqOp} aria-hidden="true">×</div>
          <div className={styles.eqCell}>
            <div className={styles.eqCellLabel}>Revenue Multiple</div>
            <div className={styles.eqCellValue}>{VALUATION_DATA.multiple}</div>
          </div>
          <div className={styles.eqOp} aria-hidden="true">=</div>
          <div className={`${styles.eqCell} ${styles.eqResult}`}>
            <div className={styles.eqCellLabel}>Enterprise Value</div>
            <div className={styles.eqCellValue}>{VALUATION_DATA.enterprise}</div>
          </div>
        </div>
        <p className={styles.calcNote}>
          We applied a <strong>2.9x revenue multiple</strong> — the median for B2B service businesses in your revenue range with steady growth. The range ({VALUATION_DATA.low}–{VALUATION_DATA.high}) reflects typical variance based on profitability, growth rate, and customer concentration.
        </p>
        <p className={styles.calcSource}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Source: 2,400+ comparable transactions in Pratt's Stats and BizComps (2023–2025)
        </p>
      </section>

      {/* What would make this go up */}
      <section className={styles.card} aria-label="Value improvement opportunities">
        <h2 className={styles.cardTitle}>What Would Make This Go Up</h2>
        <div className={styles.upliftList}>
          {UPLIFT_ITEMS.map((item, i) => (
            <div key={i} className={styles.upliftItem}>
              <div className={`${styles.upliftIconWrap} ${styles[item.color as keyof typeof styles]}`} aria-hidden="true">
                <UpliftIcon type={item.icon} />
              </div>
              <div className={styles.upliftBody}>
                <p className={styles.upliftText}>{item.text}</p>
                <Link href={item.href} className={styles.upliftLink}>
                  {item.linkLabel} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Consequence chain */}
      <section className={styles.card} aria-label="If your business sells at midpoint">
        <h2 className={styles.cardTitle}>If Your Business Sells at Midpoint</h2>
        <div className={styles.chainFlow}>
          <div className={styles.chainNode}>
            <div className={styles.chainNodeDot} aria-hidden="true" />
            <div className={styles.chainNodeContent}>
              <div className={styles.chainNodeLabel}>Sale Price</div>
              <div className={styles.chainNodeValue}>{VALUATION_DATA.midpoint}</div>
              <p className={styles.chainNodeDesc}>Enterprise value at the midpoint of your estimated range</p>
            </div>
          </div>

          <div className={styles.chainArrow} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          <div className={styles.chainNode}>
            <div className={styles.chainNodeDot} aria-hidden="true" />
            <div className={styles.chainNodeContent}>
              <div className={styles.chainNodeLabel}>After Debt & Fees</div>
              <div className={styles.chainNodeValue}>{VALUATION_DATA.ownerProceeds}</div>
              <p className={styles.chainNodeDesc}>After estimated closing costs and any outstanding debt</p>
            </div>
          </div>

          <div className={styles.chainArrow} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          <div className={styles.chainNode}>
            <div className={styles.chainNodeDot} aria-hidden="true" />
            <div className={styles.chainNodeContent}>
              <div className={styles.chainNodeLabel}>Estimated Tax</div>
              <div className={styles.chainNodeValue}>−{VALUATION_DATA.taxEstimate}</div>
              <p className={styles.chainNodeDesc}>Federal capital gains + state tax estimate (20–25% effective rate)</p>
            </div>
          </div>

          <div className={styles.chainArrow} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          <div className={styles.chainNode}>
            <div className={styles.chainNodeDot} aria-hidden="true" />
            <div className={styles.chainNodeContent}>
              <div className={styles.chainNodeLabel}>Net Proceeds to You</div>
              <div className={styles.chainNodeValue}>{VALUATION_DATA.netProceeds}</div>
              <p className={styles.chainNodeDesc}>What you keep after all deductions and taxes</p>
            </div>
          </div>

          <div className={styles.chainCta}>
            <span className={styles.chainCtaText}>Want a more accurate picture?</span>
            <Link href="/dashboard/assessments" className={styles.chainCtaLink}>
              Complete your full assessment
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Next steps */}
      <section className={styles.nextStepsSection} aria-label="Next steps">
        <h2 className={styles.nextStepsTitle}>Recommended Next Steps</h2>
        <div className={styles.nextStepsList}>
          {[
            {
              icon: 'link',
              color: styles.nextStepIconPrimary,
              title: 'Connect Your Financials',
              desc: 'Import your P&L and balance sheet for a full 3-method valuation',
              href: '/dashboard/settings/integrations/connect',
            },
            {
              icon: 'check',
              color: styles.nextStepIconSecondary,
              title: 'Take Your Exit Assessment',
              desc: 'Get your BRI score and personalized improvement roadmap',
              href: '/dashboard/assessments',
            },
            {
              icon: 'book',
              color: styles.nextStepIconTertiary,
              title: 'Browse Playbooks',
              desc: 'See all 44 strategies to increase your business value',
              href: '/dashboard/playbook',
            },
          ].map((step) => (
            <Link key={step.href} href={step.href} className={styles.nextStepItem}>
              <div className={`${styles.nextStepIconWrap} ${step.color}`} aria-hidden="true">
                {step.icon === 'link' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                )}
                {step.icon === 'check' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                )}
                {step.icon === 'book' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                  </svg>
                )}
              </div>
              <div className={styles.nextStepBody}>
                <div className={styles.nextStepTitle}>{step.title}</div>
                <div className={styles.nextStepDesc}>{step.desc}</div>
              </div>
              <div className={styles.nextStepArrow} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
