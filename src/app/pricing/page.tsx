'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { PRICING_PLANS } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { AnimatedSection, AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'

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

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronDownIcon className={cn(
          'w-5 h-5 text-muted-foreground transition-transform shrink-0',
          isOpen && 'rotate-180'
        )} />
      </button>
      {isOpen && (
        <div className="pb-5 text-muted-foreground leading-relaxed">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header - No nav distractions */}
      <motion.header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.webp"
                alt="Exit OSx"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <Image
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className="h-6 w-auto"
              />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Your Score</Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header - Hormozi style: outcome focused */}
          <div className="text-center mb-12">
            <motion.p
              className="text-sm font-medium text-primary mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Simple pricing. No surprises.
            </motion.p>
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-display"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              The Cost of Not Knowing Is Higher
            </motion.h1>
            <motion.p
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Most founders lose 20-40% of their exit value to preventable risks.
              <br className="hidden md:block" />
              Pick the plan that matches your exit timeline.
            </motion.p>
          </div>

          {/* Billing Toggle */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className={cn(
              'text-sm font-medium transition-colors',
              billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Monthly
            </span>
            <button
              onClick={handleBillingToggle}
              className={cn(
                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                billingCycle === 'annual' ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className={cn(
              'text-sm font-medium transition-colors',
              billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Annual
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Save 20%
              </span>
            </span>
          </motion.div>

          {/* Pricing Cards */}
          <AnimatedStagger className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {PRICING_PLANS.map((plan) => {
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
              const isHighlighted = plan.highlighted

              // Custom descriptions for Hormozi-style outcomes
              const planDescriptions: Record<string, string> = {
                'foundation': 'See where you stand. Free forever.',
                'growth': 'Find the leaks. Fix the value.',
                'exit-ready': 'Full buyer-ready preparation.',
              }

              return (
                <AnimatedItem key={plan.id}>
                  <div
                    className={cn(
                      'relative rounded-2xl border p-8 flex flex-col h-full card-hover',
                      isHighlighted
                        ? 'border-primary bg-primary/5 shadow-xl md:scale-105 z-10'
                        : 'border-border bg-card'
                    )}
                  >
                    {isHighlighted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{planDescriptions[plan.id] || plan.description}</p>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-foreground">
                          ${price}
                        </span>
                        {price > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                      </div>
                      {price > 0 && billingCycle === 'annual' && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Billed annually at ${(price * 12).toLocaleString()}/year
                        </p>
                      )}
                      {price === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Free forever. No credit card.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/signup?plan=${plan.id}`}
                      className="mb-8"
                      onClick={() => handlePlanCtaClick(plan)}
                    >
                      <Button
                        className={cn(
                          'w-full h-12 text-base btn-hover',
                          isHighlighted
                            ? 'bg-primary hover:bg-primary/90'
                            : ''
                        )}
                        variant={isHighlighted ? 'default' : 'outline'}
                        size="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-4">What&apos;s included:</p>
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature.name} className="flex items-start gap-3">
                            {feature.included ? (
                              <CheckIcon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                            ) : (
                              <XIcon className="h-5 w-5 text-muted-foreground/30 shrink-0 mt-0.5" />
                            )}
                            <span className={cn(
                              'text-sm',
                              feature.included ? 'text-foreground' : 'text-muted-foreground/50'
                            )}>
                              {feature.name}
                              {feature.limit && feature.included && (
                                <span className="text-muted-foreground"> ({feature.limit})</span>
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

          {/* Trust Indicators - Hormozi: Remove friction */}
          <AnimatedSection className="flex flex-wrap items-center justify-center gap-8 mb-20 py-8 border-y border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="h-5 w-5 text-green-600" />
              <span>14-day free trial on paid plans</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="h-5 w-5 text-green-600" />
              <span>No credit card to start</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="h-5 w-5 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckIcon className="h-5 w-5 text-green-600" />
              <span>Upgrade or downgrade freely</span>
            </div>
          </AnimatedSection>

          {/* The Math Section - Hormozi style */}
          <AnimatedSection className="max-w-3xl mx-auto mb-20 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-display">
              Do The Math
            </h2>
            <div className="bg-card border border-border rounded-2xl p-8">
              <p className="text-lg text-muted-foreground mb-6">
                If your business is worth <span className="text-foreground font-semibold">$5M</span> and you&apos;re leaving
                <span className="text-foreground font-semibold"> 20% on the table</span> due to preventable risks...
              </p>
              <p className="text-3xl font-bold text-destructive mb-6">
                That&apos;s $1,000,000 lost.
              </p>
              <p className="text-muted-foreground">
                Exit OSx Growth costs <span className="text-foreground font-medium">$1,788/year</span>.
                <br />
                That&apos;s <span className="text-foreground font-medium">0.18%</span> of what you could be losing.
              </p>
            </div>
          </AnimatedSection>

          {/* Feature Comparison */}
          <AnimatedSection className="mb-20">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-display">
              Compare Plans
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold text-foreground">Foundation</th>
                    <th className="text-center py-4 px-4 font-semibold text-primary bg-primary/5">Growth</th>
                    <th className="text-center py-4 px-4 font-semibold text-foreground">Exit-Ready</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_PLANS[0].features.map((feature, idx) => (
                    <tr key={feature.name} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="py-3 px-4 text-sm text-foreground">{feature.name}</td>
                      {PRICING_PLANS.map((plan, planIdx) => {
                        const planFeature = plan.features.find(f => f.name === feature.name)
                        return (
                          <td
                            key={plan.id}
                            className={cn(
                              "text-center py-3 px-4",
                              planIdx === 1 && "bg-primary/5"
                            )}
                          >
                            {planFeature?.included ? (
                              planFeature.limit ? (
                                <span className="text-sm text-foreground">{planFeature.limit}</span>
                              ) : (
                                <CheckIcon className="h-5 w-5 text-green-600 mx-auto" />
                              )
                            ) : (
                              <XIcon className="h-5 w-5 text-muted-foreground/30 mx-auto" />
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

          {/* FAQ Section - Hormozi: Direct answers */}
          <AnimatedSection className="max-w-3xl mx-auto mb-20">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-display">
              Questions? Answers.
            </h2>
            <div className="border-t border-border">
              <FAQItem
                question="How is my valuation calculated?"
                answer="We apply industry-specific multiples to your adjusted EBITDA, then factor in risk weightings based on customer concentration, revenue quality, owner dependence, and 40+ other variables that buyers actually care about. This isn't theory—it's how deals get priced."
              />
              <FAQItem
                question="What if I'm not ready to sell?"
                answer="That's exactly when you should start. The best exits are engineered 2-3 years before the deal. Foundation is free forever—use it to see where you stand. When you're ready to fix issues, upgrade."
              />
              <FAQItem
                question="Can I switch plans?"
                answer="Yes. Upgrade anytime and get immediate access. Downgrade at your next billing cycle. No penalties, no games."
              />
              <FAQItem
                question="What's the Data Room?"
                answer="A secure, organized repository for every document buyers will request during due diligence. Pre-built folder structures, access controls, and activity tracking. Having this ready signals professionalism and speeds up your deal."
              />
              <FAQItem
                question="How does the Deal Tracker work?"
                answer="Manage multiple buyer relationships in one place. Track engagement, deal stages, document access, and communication history. Essential when you're juggling 3-5 interested parties."
              />
              <FAQItem
                question="What if I already have an advisor?"
                answer="Great. Exit OSx shows you what to prioritize before you start paying success fees. Your advisor will thank you for doing the prep work."
              />
            </div>
          </AnimatedSection>

          {/* Who It's For Section */}
          <AnimatedSection className="max-w-4xl mx-auto mb-20">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-display">
              Which Plan Is Right For You?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">Foundation</h3>
                <p className="text-sm text-muted-foreground mb-4">Best for founders who:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Are curious about their business value
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Want to explore before committing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Exit is 5+ years away
                  </li>
                </ul>
              </div>

              <div className="bg-primary/5 border border-primary rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">Growth</h3>
                <p className="text-sm text-muted-foreground mb-4">Best for founders who:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Want to actively increase value
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Need to identify and fix risks
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Exit is 2-5 years away
                  </li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">Exit-Ready</h3>
                <p className="text-sm text-muted-foreground mb-4">Best for founders who:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Are actively preparing for exit
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Need deal management tools
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Exit is within 24 months
                  </li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* Final CTA */}
          <AnimatedSection className="text-center py-12 px-8 rounded-2xl bg-primary">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4 font-display">
              Every Day You Wait Is Value You Lose
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Start with Foundation. It&apos;s free. See your score in 10 minutes.
              <br />
              Then decide if you want to fix what&apos;s broken.
            </p>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="text-base px-8 h-14 btn-hover">
                Get Your Exit Readiness Score
              </Button>
            </Link>
            <p className="text-sm text-primary-foreground/60 mt-4">
              No credit card required
            </p>
          </AnimatedSection>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo.webp"
                  alt="Exit OSx"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                />
                <Image
                  src="/wordmark.svg"
                  alt="Exit OSx"
                  width={80}
                  height={22}
                  className="h-5 w-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Stop guessing. Start building value.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link></li>
                <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Get Started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="text-muted-foreground hover:text-foreground">Create Account</Link></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-foreground">Sign In</Link></li>
                <li><a href="mailto:support@exitosx.com" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Exit OSx. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
