'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { PRICING_PLANS } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { AnimatedSection, AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import styles from '@/components/public/public-pricing.module.css'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.faqItem}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.faqButton}
      >
        <span className={styles.faqQuestion}>{question}</span>
        <ChevronDownIcon className={`${styles.faqChevron}${isOpen ? ` ${styles.faqChevronOpen}` : ''}`} />
      </button>
      {isOpen && (
        <div className={styles.faqAnswer}>
          {answer}
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const hasTrackedPageView = useRef(false)

  useEffect(() => {
    if (hasTrackedPageView.current) return
    hasTrackedPageView.current = true

    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    let entrySource = 'direct'
    if (referrer.includes('/dashboard')) {
      entrySource = 'dashboard'
    } else if (referrer.includes('/signup') || referrer.includes('/login')) {
      entrySource = 'auth_flow'
    } else if (referrer.includes('exitosx.com') || referrer.includes('localhost')) {
      entrySource = 'internal'
    } else if (referrer) {
      entrySource = 'external'
    }

    analytics.track('pricing_page_viewed', {
      entrySource,
      isLoggedIn: false,
    })
  }, [])

  const handleBillingToggle = () => {
    const newCycle = billingCycle === 'monthly' ? 'annual' : 'monthly'

    analytics.track('pricing_billing_toggle', {
      selectedCycle: newCycle,
      previousCycle: billingCycle,
    })

    setBillingCycle(newCycle)
  }

  const handlePlanCtaClick = (plan: typeof PRICING_PLANS[0]) => {
    const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice

    analytics.track('pricing_plan_cta_clicked', {
      planId: plan.id,
      planName: plan.name,
      price,
      billingCycle,
      ctaText: plan.cta,
    })
  }

  const isAnnual = billingCycle === 'annual'

  return (
    <div className={styles.page}>
      {/* Minimal Header */}
      <motion.header
        className={styles.header}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/logo.webp"
                alt="Exit OSx"
                width={32}
                height={32}
                className={styles.logoImg}
              />
              <Image
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className={styles.wordmarkImg}
              />
            </Link>
            <div className={styles.headerActions}>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/assess">
                <Button size="sm">Get Your Score</Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Hero Header */}
          <div className={styles.heroHeader}>
            <motion.p
              className={styles.eyebrow}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Simple pricing. No surprises.
            </motion.p>
            <motion.h1
              className={styles.heroTitle}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              The Cost of Not Knowing Is Higher
            </motion.h1>
            <motion.p
              className={styles.heroSubtitle}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Most founders lose 20-40% of their exit value to preventable risks.
              <br className="hidden md:block" />
              Pick the plan that matches your exit timeline.
            </motion.p>
          </div>

          {/* Do The Math — ABOVE pricing cards for value anchoring */}
          <AnimatedSection className={styles.mathSection}>
            <div className={styles.mathCard}>
              <h2 className={styles.mathTitle}>
                Do The Math
              </h2>
              <p className={styles.mathBody}>
                If your business is worth <span className={styles.mathEmphasis}>$5M</span> and you&apos;re leaving
                <span className={styles.mathEmphasis}> 20% on the table</span> due to preventable risks...
              </p>
              <p className={styles.mathLoss}>
                That&apos;s $1,000,000 lost.
              </p>
              <p className={styles.mathCost}>
                Exit OSx Growth costs <span className={styles.mathEmphasis}>$1,788/year</span>.
                That&apos;s <span className={styles.mathEmphasis}>0.18%</span> of what you could be losing.
              </p>
              <p className={styles.mathFootnote}>
                Most founders we assess are leaving 1.5&ndash;2.5x more value on the table than they think.
              </p>
            </div>
          </AnimatedSection>

          {/* Billing Toggle */}
          <motion.div
            className={styles.billingToggle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className={`${styles.billingLabel} ${billingCycle === 'monthly' ? styles.billingLabelActive : styles.billingLabelInactive}`}>
              Monthly
            </span>
            <button
              onClick={handleBillingToggle}
              className={`${styles.toggleTrack} ${isAnnual ? styles.toggleTrackActive : styles.toggleTrackInactive}`}
            >
              <span
                className={`${styles.toggleThumb} ${isAnnual ? styles.toggleThumbActive : styles.toggleThumbInactive}`}
              />
            </button>
            <span className={`${styles.billingLabel} ${isAnnual ? styles.billingLabelActive : styles.billingLabelInactive}`}>
              Annual
              <span className={styles.saveBadge}>
                Save 20%
              </span>
            </span>
          </motion.div>

          {/* Pricing Cards */}
          <AnimatedStagger className={styles.plansGrid}>
            {PRICING_PLANS.map((plan) => {
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
              const isHighlighted = plan.highlighted

              const planDescriptions: Record<string, string> = {
                'foundation': 'See where you stand. Free forever.',
                'growth': 'Find the leaks. Fix the value.',
                'deal-room': 'Done-with-you exit preparation.',
              }

              return (
                <AnimatedItem key={plan.id}>
                  <div className={`${styles.planCard}${isHighlighted ? ` ${styles.planCardHighlighted}` : ''}`}>
                    {isHighlighted && (
                      <div className={styles.popularBadge}>
                        <span className={styles.popularBadgeInner}>
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className={styles.planHeader}>
                      <h3 className={styles.planName}>{plan.name}</h3>
                      <p className={styles.planDescription}>{planDescriptions[plan.id] || plan.description}</p>
                    </div>

                    <div className={styles.planPricing}>
                      <div className={styles.priceRow}>
                        <span className={styles.priceAmount}>
                          ${price}
                        </span>
                        {price > 0 && (
                          <span className={styles.pricePer}>/month</span>
                        )}
                      </div>
                      {price > 0 && billingCycle === 'annual' && (
                        <p className={styles.priceAnnualNote}>
                          Billed annually at ${(price * 12).toLocaleString()}/year
                        </p>
                      )}
                      {price === 0 && (
                        <p className={styles.priceFreeNote}>
                          Free forever. No credit card.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/assess?plan=${plan.id}`}
                      className={styles.planCtaLink}
                      onClick={() => handlePlanCtaClick(plan)}
                    >
                      <Button
                        className="w-full h-12 text-base"
                        variant={isHighlighted ? 'default' : 'outline'}
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>

                    <div className={styles.featureList}>
                      <p className={styles.featureListLabel}>What&apos;s included:</p>
                      <ul className={styles.featureItems}>
                        {plan.features.map((feature) => (
                          <li key={feature.name} className={styles.featureItem}>
                            {feature.included ? (
                              <CheckIcon className={`${styles.featureIcon} ${styles.featureIconCheck}`} />
                            ) : (
                              <XIcon className={`${styles.featureIcon} ${styles.featureIconX}`} />
                            )}
                            <span className={feature.included ? styles.featureName : styles.featureNameExcluded}>
                              {feature.name}
                              {feature.limit && feature.included && (
                                <span className={styles.featureLimit}> ({feature.limit})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AnimatedItem>
              )
            })}
          </AnimatedStagger>

          {/* Trust Indicators */}
          <AnimatedSection className={styles.trustRow}>
            <div className={styles.trustItem}>
              <CheckIcon className={styles.trustIcon} />
              <span>7-day free trial on paid plans</span>
            </div>
            <div className={styles.trustItem}>
              <CheckIcon className={styles.trustIcon} />
              <span>No credit card required during trial</span>
            </div>
            <div className={`${styles.trustItem} ${styles.trustItemPrimary}`}>
              <CheckIcon className={styles.trustIcon} />
              <span>Cancel anytime. No penalties.</span>
            </div>
            <div className={styles.trustItem}>
              <CheckIcon className={styles.trustIcon} />
              <span>Upgrade or downgrade freely</span>
            </div>
          </AnimatedSection>

          {/* 90-Day Outcome Guarantee */}
          <AnimatedSection className={styles.guaranteeSection}>
            <div className={styles.guaranteeCard}>
              <ShieldIcon className={styles.guaranteeIcon} />
              <h3 className={styles.guaranteeTitle}>
                90-Day Outcome Guarantee
              </h3>
              <p className={styles.guaranteeBody}>
                If your Buyer Readiness Index doesn&apos;t improve within 90 days of following your
                action plan, we&apos;ll refund your last 3 months. No questions asked.
              </p>
              <p className={styles.guaranteeFootnote}>
                We can make this guarantee because the system works. Complete the actions, and your score goes up.
              </p>
            </div>
          </AnimatedSection>

          {/* Feature Comparison */}
          <AnimatedSection className={styles.comparisonSection}>
            <h2 className={styles.sectionTitle}>
              Compare Plans
            </h2>
            <div className={styles.tableWrapper}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Foundation</th>
                    <th className={styles.thHighlighted}>Growth</th>
                    <th>Deal Room</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_PLANS[0].features.map((feature, idx) => (
                    <tr key={feature.name} className={idx % 2 === 0 ? styles.comparisonRowEven : styles.comparisonRowOdd}>
                      <td>{feature.name}</td>
                      {PRICING_PLANS.map((plan, planIdx) => {
                        const planFeature = plan.features.find(f => f.name === feature.name)
                        return (
                          <td
                            key={plan.id}
                            className={planIdx === 1 ? styles.tdHighlighted : undefined}
                          >
                            {planFeature?.included ? (
                              planFeature.limit ? (
                                <span className={styles.tableLimit}>{planFeature.limit}</span>
                              ) : (
                                <CheckIcon className={styles.tableCheck} />
                              )
                            ) : (
                              <XIcon className={styles.tableX} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>

          {/* Which Plan Is Right For You */}
          <AnimatedSection className={styles.planMatchSection}>
            <h2 className={styles.sectionTitle}>
              Which Plan Is Right For You?
            </h2>
            <div className={styles.planMatchGrid}>
              <div className={styles.planMatchCard}>
                <h3 className={styles.planMatchName}>Foundation</h3>
                <p className={styles.planMatchSubtitle}>You should start here if:</p>
                <ul className={styles.planMatchList}>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    You want to see what buyers would see
                  </li>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    You&apos;re curious about your risk profile
                  </li>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    You want a baseline before committing
                  </li>
                </ul>
              </div>

              <div className={`${styles.planMatchCard} ${styles.planMatchCardHighlighted}`}>
                <h3 className={styles.planMatchName}>Growth</h3>
                <p className={styles.planMatchSubtitle}>You need this if:</p>
                <ul className={styles.planMatchList}>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    You know there are risks but not which ones matter most
                  </li>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    You want a step-by-step plan to increase value
                  </li>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    Exit is 2&ndash;5 years away and you want to be ready
                  </li>
                </ul>
              </div>

              <div className={styles.planMatchCard}>
                <h3 className={styles.planMatchName}>Deal Room</h3>
                <p className={styles.planMatchSubtitle}>Built for founders who:</p>
                <ul className={styles.planMatchList}>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    Are actively talking to buyers or advisors
                  </li>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    Need a buyer-ready data room and deal tracking
                  </li>
                  <li className={styles.planMatchItem}>
                    <span className={styles.planMatchBullet}>•</span>
                    Want to run a professional exit process within 24 months
                  </li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* FAQ Section */}
          <AnimatedSection className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>
              Questions? Answers.
            </h2>
            <div className={styles.faqList}>
              <FAQItem
                question="How long does the assessment take?"
                answer="About 10 minutes. You'll answer questions about your business across six risk categories. You get your Buyer Readiness Index and a buyer-perspective diagnostic immediately."
              />
              <FAQItem
                question="Is my data secure?"
                answer="Yes. All data is encrypted in transit and at rest. We never share your information with buyers, brokers, or third parties. Your data is yours."
              />
              <FAQItem
                question="Can I invite my CFO or advisor?"
                answer="Yes. Growth plans include up to 3 team seats. Deal Room includes unlimited seats. Team members can collaborate on tasks, upload evidence, and track progress—without seeing your personal financial data."
              />
              <FAQItem
                question="How is my valuation calculated?"
                answer="We apply industry-specific multiples to your adjusted EBITDA, then factor in risk weightings based on customer concentration, revenue quality, owner dependence, and 40+ other variables that buyers actually care about. This isn't theory—it's how deals get priced."
              />
              <FAQItem
                question="What if I already have an advisor?"
                answer="Great. Exit OSx shows you what to prioritize before you start paying success fees. Your advisor will thank you for doing the prep work."
              />
              <FAQItem
                question="Can I switch plans?"
                answer="Yes. Upgrade anytime and get immediate access. Downgrade at your next billing cycle. No penalties, no games."
              />
              <FAQItem
                question="How is this different from a valuation?"
                answer="A valuation tells you a number. Exit OSx tells you why the number is what it is—and exactly what to do to change it. We show you the specific risks that would reduce your price in diligence and give you a prioritized plan to fix them."
              />
            </div>
          </AnimatedSection>

          {/* Final CTA */}
          <AnimatedSection className={styles.finalCta}>
            <h2 className={styles.finalCtaTitle}>
              Every Quarter You Wait Is Unmanaged Risk
            </h2>
            <p className={styles.finalCtaSubtitle}>
              Start with Foundation. It&apos;s free. See your score in 10 minutes.
              <br />
              Then decide if you want to fix what&apos;s costing you.
            </p>
            <Link href="/assess">
              <Button variant="secondary" size="lg" className="text-base px-8 h-14">
                Get Your Buyer Readiness Index
              </Button>
            </Link>
            <p className={styles.finalCtaFootnote}>
              No credit card required &middot; Cancel anytime
            </p>
          </AnimatedSection>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <div className={styles.footerBrand}>
                <Image
                  src="/logo.webp"
                  alt="Exit OSx"
                  width={24}
                  height={24}
                  className={styles.footerLogoImg}
                />
                <Image
                  src="/wordmark.svg"
                  alt="Exit OSx"
                  width={80}
                  height={22}
                  className={styles.footerWordmarkImg}
                />
              </div>
              <p className={styles.footerTagline}>
                Stop guessing. Start building value.
              </p>
            </div>

            <div>
              <h4 className={styles.footerHeading}>Product</h4>
              <ul className={styles.footerLinks}>
                <li><Link href="/" className={styles.footerLink}>Home</Link></li>
                <li><Link href="/pricing" className={styles.footerLink}>Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className={styles.footerHeading}>Legal</h4>
              <ul className={styles.footerLinks}>
                <li><Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link></li>
                <li><Link href="/terms" className={styles.footerLink}>Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className={styles.footerHeading}>Get Started</h4>
              <ul className={styles.footerLinks}>
                <li><Link href="/assess" className={styles.footerLink}>Get Your Free Score</Link></li>
                <li><Link href="/login" className={styles.footerLink}>Sign In</Link></li>
                <li><a href="mailto:support@exitosx.com" className={styles.footerLink}>Contact</a></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopyright}>
              &copy; {new Date().getFullYear()} Exit OSx. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
