'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { AnimatedSection, AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
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
                <Button size="sm">Get Your Free Exit Score</Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      <main>
        {/* HERO SECTION */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {/* Specific Social Proof */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                347 assessments completed. Average value gap discovered: $3.5M.
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight font-display"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                Two $5M Businesses. Same Revenue.
                <br />
                <span className="text-primary">One Sells for 2x More.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
              >
                Buyers don&apos;t pay for what you built. They pay for what transfers without you.
              </motion.p>

              <motion.p
                className="text-lg text-foreground max-w-2xl mx-auto mb-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
              >
                See your risks in 10 minutes. Fix the ones that cost you the most.
              </motion.p>

              {/* Single CTA */}
              <motion.div
                className="flex flex-col items-center justify-center gap-3 mb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
              >
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="text-base px-10 h-14 text-lg btn-hover w-full sm:w-auto">
                    Get Your Free Exit Score
                  </Button>
                </Link>
              </motion.div>

              {/* Friction reducer - directly under button */}
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

        {/* THE MATH SECTION */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 font-display">
                Buyers Use This Formula
              </h2>

              <div className="bg-card border border-border rounded-2xl p-8 md:p-12 mb-8 shadow-lg">
                <div className="space-y-4 font-mono text-lg md:text-xl">
                  <p className="text-foreground">
                    <span className="text-primary font-bold">Enterprise Value</span> = Cash Flow &times; Multiple
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-bold">Multiple</span> = Growth &minus; Risk + Transferability
                  </p>
                </div>
              </div>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                You don&apos;t control the market. You <span className="text-foreground font-medium">do</span> control risk.
                Most founders we assess are <span className="text-foreground font-medium">1.5&ndash;2.5x lower</span> than they could be.
                That gap is your opportunity.
              </p>

              <Link href="/signup">
                <Button variant="outline" size="lg" className="btn-hover">
                  Find Your Gap
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* PROBLEM SECTION - Tightened */}
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
                  <ul className="space-y-4 text-lg text-foreground">
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">1.</span>
                      You grow revenue and assume value follows
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">2.</span>
                      You wait too long to think about exit readiness
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">3.</span>
                      A buyer shows up and discounts everything
                    </li>
                  </ul>
                </div>
              </AnimatedSection>

              <AnimatedSection>
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8">
                  <p className="text-lg text-foreground mb-4 font-medium">And suddenly:</p>
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
              <p className="text-xl text-foreground font-semibold mb-4">
                This is the moment Exit OSx is built to prevent.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                It takes 10 minutes to find out if it&apos;s coming for you.
              </p>
              <Link href="/signup">
                <Button size="lg" className="btn-hover">
                  Check Your Risk
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* OBJECTION CALLOUTS - Pulled higher on page */}
        <section className="py-12 bg-muted/30 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedStagger className="grid md:grid-cols-2 gap-6">
              <AnimatedItem>
                <div className="bg-card border border-border rounded-xl p-6">
                  <p className="text-lg font-semibold text-foreground mb-2">Think it&apos;s too early?</p>
                  <p className="text-muted-foreground">The best exits are engineered 2&ndash;3 years before the deal. The worst are negotiated in the moment.</p>
                </div>
              </AnimatedItem>
              <AnimatedItem>
                <div className="bg-card border border-border rounded-xl p-6">
                  <p className="text-lg font-semibold text-foreground mb-2">&quot;I&apos;ll deal with this later.&quot;</p>
                  <p className="text-muted-foreground">Every quarter you wait is a quarter of unmanaged risk compounding against your exit price.</p>
                </div>
              </AnimatedItem>
            </AnimatedStagger>
          </div>
        </section>

        {/* SOLUTION SECTION - Outcome-named features */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                See What Buyers See. Fix What Costs You the Most.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Stop guessing. Start building value on purpose.
              </p>
            </AnimatedSection>

            <AnimatedStagger className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Your Hidden Discount Report',
                  outcome: 'See the exact dollar amount buyers will subtract from your price \u2014 and which fixes eliminate the biggest discounts first.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  title: 'Multiple Impact Simulator',
                  outcome: 'See how fixing each risk raises your multiple. Watch your valuation climb as you check items off the list.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  ),
                },
                {
                  title: "Buyer's Diligence Playbook",
                  outcome: 'Know every question, concern, and objection a buyer will raise \u2014 before they raise it. Zero surprises in negotiations.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  ),
                },
                {
                  title: 'Exit Timing Optimizer',
                  outcome: 'Compare the financial outcome of selling now, in 12 months, or in 3 years. See what each month of preparation is worth.',
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

            <AnimatedSection className="text-center mt-10">
              <Link href="/signup">
                <Button size="lg" className="btn-hover">
                  Get Your Free Exit Score
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 bg-muted/30">
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
                  desc: 'See exactly where buyers will discount your business \u2014 in dollars.',
                },
                {
                  num: 3,
                  title: 'Execute',
                  desc: 'Follow a prioritized action plan. Fix the highest-ROI issues first.',
                },
                {
                  num: 4,
                  title: 'Track',
                  desc: 'Watch your Exit Readiness Score climb. See your projected valuation increase in real-time.',
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
                  Get Your Free Exit Score
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* WHO THIS IS FOR - Situation-based */}
        <section className="py-20">
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
                      <span className="text-green-600 mt-1">&bull;</span>
                      You&apos;re 2&ndash;5 years from a potential exit and want to maximize your outcome
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">&bull;</span>
                      You suspect your business has risks that would reduce your price in diligence
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">&bull;</span>
                      You want an exit readiness opinion that isn&apos;t tied to advisory fees
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 mt-1">&bull;</span>
                      You&apos;ve been told your business is worth $X but aren&apos;t sure it would hold up in a real deal
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
                      <span className="text-muted-foreground mt-1">&bull;</span>
                      You&apos;re looking for a quick flip
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">&bull;</span>
                      You&apos;re not willing to fix what&apos;s broken
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">&bull;</span>
                      You want to &quot;see how it goes&quot; without a plan
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-muted-foreground mt-1">&bull;</span>
                      You think revenue alone determines value
                    </li>
                  </ul>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* AUTHORITY SECTION - Brad's real credentials */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection>
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-display">
                  Built by a Dealmaker, Not a Developer
                </h2>
                <p className="text-muted-foreground">The person behind Exit OSx has sat on both sides of the table.</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-3">Brad Feldman</h3>
                    <p className="text-sm text-primary font-medium mb-4">
                      Managing Director, Pasadena Private Advisors
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Investment banker, CPA (Price Waterhouse), and Duke MBA specializing in exit planning
                      for businesses doing $1M&ndash;$25M+ in revenue. Brad has spent his career advising founders on
                      how buyers evaluate risk and value &mdash; and how financial clarity, operational readiness, and
                      owner preparedness directly influence transaction outcomes.
                    </p>
                    <p className="text-muted-foreground mb-6">
                      His experience spans professional services, healthcare, manufacturing, industrials,
                      and technology-enabled businesses. He holds FINRA Series 63, 65, and 79 licenses.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6">
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        CPA (Price Waterhouse)
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        MBA, Duke University
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        FINRA Licensed (63, 65, 79)
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        Adjunct Professor, Cal State LA
                      </span>
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Author of:</p>
                      <a
                        href="https://www.amazon.com/Capture-Business-Owners-Unlock-Purpose/dp/B0FG7FBGYW"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                      >
                        Captured: How Founders Unlock Value, Exit with Purpose, and Step into What&apos;s Next &rarr;
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* REMAINING QUESTIONS - Operational FAQ */}
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
                  q: '"I already have an advisor."',
                  a: 'Great. Exit OSx shows you what to prioritize before paying success fees. Your advisor will thank you for doing the prep work.',
                },
                {
                  q: '"How is this different from a valuation?"',
                  a: 'A valuation tells you what you\'re worth today. Exit OSx tells you what\'s reducing that number \u2014 and how to fix it.',
                },
                {
                  q: '"How long does the assessment take?"',
                  a: '10 minutes. You\'ll get your Exit Readiness Score, a valuation estimate, and a breakdown of where buyers will focus immediately.',
                },
                {
                  q: '"Is my data secure?"',
                  a: 'Yes. Your data is encrypted at rest and in transit. We never share your information with third parties. You can delete your account and all data at any time.',
                },
                {
                  q: '"Can I invite my CFO or advisor?"',
                  a: 'Yes. Growth plans include up to 3 team members. Exit-Ready includes unlimited team access so your whole advisory team can collaborate.',
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

        {/* FINAL CTA */}
        <section className="py-20 bg-primary">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 font-display">
                Your Exit Starts Long Before the Deal
              </h2>
              <p className="text-xl text-primary-foreground/80 mb-2">
                The best exits aren&apos;t negotiated. They&apos;re engineered.
              </p>
              <p className="text-base text-primary-foreground/60 mb-10 max-w-2xl mx-auto">
                Every quarter you wait is a quarter of unmanaged risk compounding against your exit price.
              </p>
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-base px-10 h-14 text-lg btn-hover">
                  Get Your Free Exit Score
                </Button>
              </Link>
              <p className="text-sm text-primary-foreground/60 mt-4">
                Free to start. No credit card. Results in 10 minutes.
              </p>
            </AnimatedSection>
          </div>
        </section>
      </main>

      {/* Footer */}
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
                &copy; {new Date().getFullYear()} Exit OSx. All rights reserved.
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
