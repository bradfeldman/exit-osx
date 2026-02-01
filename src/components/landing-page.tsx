'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { AnimatedSection, AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header - No nav distractions (Dan Martell principle) */}
      <motion.header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            </div>
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

      <main>
        {/* HERO SECTION - Hormozi style: Math + Urgency */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {/* Trust Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Built from real deals. Used by founders preparing for $5M–$100M exits.
              </motion.div>

              {/* Headline - Hormozi: Lead with the math/pain */}
              <motion.h1
                className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight font-display"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                Two $5M Businesses.
                <br />
                <span className="text-primary">One Sells for 2x More.</span>
              </motion.h1>

              {/* Subheadline - The why */}
              <motion.p
                className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
              >
                Buyers don&apos;t price effort. They price risk-adjusted cash flow.
              </motion.p>

              <motion.p
                className="text-lg text-foreground max-w-2xl mx-auto mb-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
              >
                Exit OSx shows you exactly where buyers will discount your business—and what to fix before it costs you millions.
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
              >
                <Link href="/signup">
                  <Button size="lg" className="text-base px-8 h-14 text-lg btn-hover">
                    Get Your Exit Readiness Score
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="text-base px-8 h-14 btn-hover">
                    See How Buyers See You
                  </Button>
                </Link>
              </motion.div>

              {/* Friction reducer */}
              <motion.p
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                Free to start. No credit card required. Results in 10 minutes.
              </motion.p>
            </div>
          </div>
        </section>

        {/* THE MATH SECTION - Hormozi loves this */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 font-display">
                Buyers Use This Formula
              </h2>

              <div className="bg-card border border-border rounded-2xl p-8 md:p-12 mb-8">
                <div className="space-y-4 font-mono text-lg md:text-xl">
                  <p className="text-foreground">
                    <span className="text-primary font-bold">Enterprise Value</span> = Cash Flow × Multiple
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-bold">Multiple</span> = Growth − Risk + Transferability
                  </p>
                </div>
              </div>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                You don&apos;t control the market. You <span className="text-foreground font-medium">do</span> control risk.
                <br />
                Exit OSx shows you which risks destroy multiples—and which fixes increase them fastest.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* PROBLEM SECTION - Dan Martell loves this */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                Most Founders Guess Their Way to an Exit
              </h2>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <div className="space-y-6">
                  <p className="text-lg text-muted-foreground">
                    Here&apos;s what usually happens:
                  </p>
                  <ul className="space-y-3 text-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground">•</span>
                      You grow revenue
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground">•</span>
                      You assume value is taking care of itself
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground">•</span>
                      You wait too long to think about exit readiness
                    </li>
                  </ul>
                  <p className="text-lg text-foreground font-medium pt-4">
                    Then a buyer shows up.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection>
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8">
                  <p className="text-lg text-foreground mb-4">And suddenly:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-foreground">Your revenue isn&apos;t &quot;quality&quot;</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-foreground">Your risk isn&apos;t priced in your favor</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-foreground">Your leverage disappears fast</span>
                    </li>
                  </ul>
                  <p className="text-lg text-foreground font-semibold mt-6 pt-4 border-t border-destructive/20">
                    Every unmanaged risk becomes a price cut.
                  </p>
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection className="text-center mt-12">
              <p className="text-xl text-primary font-semibold">
                Exit OSx exists to prevent that moment.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* SOLUTION SECTION */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                Exit OSx Is Your Operating System for Exit Readiness
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Stop guessing. Start building value on purpose.
              </p>
            </AnimatedSection>

            <AnimatedStagger className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Risk-Weighted Valuation',
                  outcome: 'See how much each risk costs you in dollars.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  title: 'Multiple Compression View',
                  outcome: 'Watch your multiple drop as risks stack.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  ),
                },
                {
                  title: 'Buyer Objection Forecast',
                  outcome: 'Know every objection before it\'s raised.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  ),
                },
                {
                  title: 'Exit Scenario Modeling',
                  outcome: 'Compare selling now vs later vs never.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                    </svg>
                  ),
                },
              ].map((feature) => (
                <AnimatedItem key={feature.title}>
                  <div className="bg-card p-6 rounded-2xl border border-border h-full">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.outcome}</p>
                  </div>
                </AnimatedItem>
              ))}
            </AnimatedStagger>
          </div>
        </section>

        {/* HOW IT WORKS - Simple, mechanical */}
        <section id="how-it-works" className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground">
                From assessment to action in four steps.
              </p>
            </AnimatedSection>

            <AnimatedStagger className="grid md:grid-cols-4 gap-8">
              {[
                {
                  num: 1,
                  title: 'Assess',
                  desc: 'Answer focused questions about your business. Takes 10 minutes.',
                },
                {
                  num: 2,
                  title: 'Diagnose',
                  desc: 'See exactly where buyers will discount your business—and why.',
                },
                {
                  num: 3,
                  title: 'Execute',
                  desc: 'Follow a prioritized action plan. Fix the highest-ROI issues first.',
                },
                {
                  num: 4,
                  title: 'Repeat',
                  desc: 'As your business grows, so does your valuation strategy.',
                },
              ].map((step) => (
                <AnimatedItem key={step.num}>
                  <div className="text-center">
                    <div className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                      {step.num}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </AnimatedItem>
              ))}
            </AnimatedStagger>

            <AnimatedSection className="text-center mt-12">
              <Link href="/signup">
                <Button size="lg" className="text-base px-8 btn-hover">
                  Get Your Exit Readiness Score
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* WHO THIS IS FOR - Dan Martell qualifier */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                Built for Founders Who Want Options
              </h2>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-8">
              <AnimatedSection>
                <div className="bg-card border border-border rounded-2xl p-8 h-full">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Exit OSx is for you if:
                  </h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">•</span>
                      You run a business doing $1M–$50M+ in revenue
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">•</span>
                      You want optionality—not pressure—to sell
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">•</span>
                      You care about leverage, not just growth
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">•</span>
                      You want control over your exit, not a rushed process
                    </li>
                  </ul>
                </div>
              </AnimatedSection>

              <AnimatedSection>
                <div className="bg-card border border-border rounded-2xl p-8 h-full">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    This is NOT for you if:
                  </h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">•</span>
                      You&apos;re looking for a quick flip
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">•</span>
                      You&apos;re not willing to fix what&apos;s broken
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">•</span>
                      You want to &quot;see how it goes&quot;
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">•</span>
                      You think revenue alone determines value
                    </li>
                  </ul>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* OBJECTION HANDLING - Hormozi style */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                Common Questions
              </h2>
            </AnimatedSection>

            <AnimatedStagger className="space-y-6">
              {[
                {
                  q: '"I\'m not ready to sell yet."',
                  a: 'Perfect. That\'s when this matters most. The best exits are engineered 2-3 years before the deal.',
                },
                {
                  q: '"I already have an advisor."',
                  a: 'Great. Exit OSx shows you what to prioritize before paying success fees. Your advisor will thank you.',
                },
                {
                  q: '"I\'ll deal with this later."',
                  a: 'That\'s why most founders get discounted. Buyers don\'t wait for you to get ready.',
                },
                {
                  q: '"How is this different from a valuation?"',
                  a: 'A valuation tells you what you\'re worth today. Exit OSx tells you what\'s reducing that number—and how to fix it.',
                },
              ].map((item) => (
                <AnimatedItem key={item.q}>
                  <div className="bg-card border border-border rounded-xl p-6">
                    <p className="text-lg font-medium text-foreground mb-2">{item.q}</p>
                    <p className="text-muted-foreground">{item.a}</p>
                  </div>
                </AnimatedItem>
              ))}
            </AnimatedStagger>
          </div>
        </section>

        {/* AUTHORITY SECTION */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 font-display">
                This Isn&apos;t Exit Theory. It&apos;s Exit Reality.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                Exit OSx is built from real deals, real diligence, and real founder outcomes.
                Not consulting frameworks. Buyer playbooks.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Designed from real buyer diligence checklists
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Based on hundreds of founder exits
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Built by operators and dealmakers
                </span>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* FINAL CTA - Strong close */}
        <section className="py-20 bg-primary">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 font-display">
                Your Exit Starts Long Before the Deal
              </h2>
              <p className="text-xl text-primary-foreground/80 mb-4">
                The best exits aren&apos;t negotiated. They&apos;re engineered.
              </p>
              <p className="text-lg text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
                Get your Exit Readiness Score and start building a company buyers compete to own.
              </p>
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-base px-8 h-14 text-lg btn-hover">
                  Get Your Exit Readiness Score
                </Button>
              </Link>
              <p className="text-sm text-primary-foreground/60 mt-4">
                Free to start. No credit card. Results in 10 minutes.
              </p>
            </AnimatedSection>
          </div>
        </section>
      </main>

      {/* Footer - Minimal */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.webp"
                alt="Exit OSx"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Exit OSx. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
