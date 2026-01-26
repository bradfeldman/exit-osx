'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PRICING_PLANS } from '@/lib/pricing'
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-foreground">
                Pricing
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-display"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Invest in Your Exit Success
            </motion.h1>
            <motion.p
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Choose the plan that matches your exit timeline. Whether you&apos;re just exploring or actively preparing, we&apos;ve got you covered.
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
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
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
          <AnimatedStagger className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
            {PRICING_PLANS.map((plan, index) => {
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
              const isHighlighted = plan.highlighted

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
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
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
                          Free forever, no credit card needed
                        </p>
                      )}
                    </div>

                    <Link href={`/signup?plan=${plan.id}`} className="mb-8">
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

          {/* Trust Indicators */}
          <AnimatedSection className="flex flex-wrap items-center justify-center gap-8 mb-20 py-8 border-y border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span>14-day free trial on paid plans</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span>No credit card required to start</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span>Cancel anytime, no penalties</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span>Upgrade or downgrade freely</span>
            </div>
          </AnimatedSection>

          {/* Feature Comparison Section */}
          <AnimatedSection className="mb-20">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-display">
              Compare What&apos;s Included
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

          {/* FAQ Section */}
          <AnimatedSection className="max-w-3xl mx-auto mb-20">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-display">
              Frequently Asked Questions
            </h2>
            <div className="border-t border-border">
              <FAQItem
                question="How is my valuation calculated?"
                answer="Your valuation is calculated using industry-standard multiples applied to your adjusted EBITDA, combined with our proprietary Buyer Readiness Score adjustments. We factor in your industry, growth rate, customer concentration, recurring revenue, and other key metrics that buyers evaluate during due diligence. Exit-Ready subscribers also get access to DCF (Discounted Cash Flow) analysis for a more comprehensive valuation approach."
              />
              <FAQItem
                question="What's included in the free Foundation plan?"
                answer="The Foundation plan includes your Initial Assessment, a Basic Valuation Estimate, and an overview of your Buyer Readiness Score. It's designed to help you understand where you stand and explore what's possible with Exit OSx before committing to a paid plan. You can use the Foundation plan indefinitely at no cost."
              />
              <FAQItem
                question="Can I switch plans later?"
                answer="Yes, you can upgrade or downgrade your plan at any time. When you upgrade, you'll get immediate access to additional features. When you downgrade, the change takes effect at your next billing cycle. There are no penalties or long-term contracts."
              />
              <FAQItem
                question="What is the Data Room feature?"
                answer="The Data Room is a secure, organized repository for all the documents buyers will request during due diligence. It includes pre-built folder structures for financials, legal documents, customer contracts, and more. You can control access permissions and track who views or downloads each document. Having your Data Room ready can significantly speed up your exit process and demonstrate professionalism to potential buyers."
              />
              <FAQItem
                question="How does the Deal Tracker work?"
                answer="The Deal Tracker helps you manage relationships with potential buyers throughout the sale process. You can track buyer engagement, manage deal stages, store communication history, and monitor which documents each buyer has accessed. It's designed to help you stay organized when managing multiple interested parties."
              />
              <FAQItem
                question="What financial integrations do you support?"
                answer="We currently integrate with QuickBooks Online to automatically import your financial data. This allows us to populate your P&L, Balance Sheet, and calculate key metrics without manual data entry. More integrations are on our roadmap based on customer demand."
              />
            </div>
          </AnimatedSection>

          {/* Value Props */}
          <AnimatedStagger className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20">
            <AnimatedItem>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Risk-Free Trial</h3>
                <p className="text-sm text-muted-foreground">
                  Try any paid plan free for 14 days. See your full valuation and readiness score before you commit.
                </p>
              </div>
            </AnimatedItem>

            <AnimatedItem>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Flexible Commitment</h3>
                <p className="text-sm text-muted-foreground">
                  No long-term contracts. Upgrade, downgrade, or cancel whenever your needs change.
                </p>
              </div>
            </AnimatedItem>

            <AnimatedItem>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Expert Support</h3>
                <p className="text-sm text-muted-foreground">
                  Get help from exit planning specialists who understand what it takes to maximize your outcome.
                </p>
              </div>
            </AnimatedItem>
          </AnimatedStagger>

          {/* Contact CTA */}
          <AnimatedSection className="text-center py-12 px-8 rounded-2xl bg-muted/50 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 font-display">
              Questions? We&apos;re Here to Help
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Not sure which plan is right for you? Our team can help you understand your options and find the best fit for your exit timeline.
            </p>
            <a href="mailto:support@exitosx.com">
              <Button variant="outline" size="lg" className="btn-hover">
                Contact Sales
              </Button>
            </a>
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
                The complete platform for business owners preparing for a successful exit.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
                <li><a href="mailto:support@exitosx.com" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Get Started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="text-muted-foreground hover:text-foreground">Create Account</Link></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-foreground">Sign In</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Exit OSx. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              A Pasadena Private product
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
