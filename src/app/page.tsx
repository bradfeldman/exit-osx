import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
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
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Trusted by business owners preparing for exit
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Build a Business
                <br />
                <span className="text-primary">Buyers Want to Own</span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Exit OSx gives you the roadmap, tools, and insights to maximize your company&apos;s value and be exit-ready on your timeline. Stop guessing what buyers want.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link href="/signup">
                  <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                    Start Free Assessment
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                    View Pricing
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">80%</div>
                <p className="text-sm text-muted-foreground">of businesses fail to sell</p>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">2-5x</div>
                <p className="text-sm text-muted-foreground">valuation range for same EBITDA</p>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">3+ yrs</div>
                <p className="text-sm text-muted-foreground">ideal exit preparation time</p>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">6</div>
                <p className="text-sm text-muted-foreground">dimensions buyers evaluate</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need to Exit on Your Terms
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From initial assessment to deal tracking, Exit OSx provides the complete toolkit for maximizing your exit outcome.
              </p>
            </div>

            {/* Primary Features */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <DollarIcon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Real-Time Valuation</h3>
                <p className="text-muted-foreground mb-4">
                  See your business value update in real-time as you improve key metrics. Industry-specific multiples and DCF analysis included.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Multiple-based valuation
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    DCF analysis
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Add-back calculations
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-6">
                  <BadgeCheckIcon className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Buyer Readiness Score</h3>
                <p className="text-muted-foreground mb-4">
                  Understand how buyers will evaluate your business across 6 critical dimensions. Close the gaps that matter most.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Financial health analysis
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Operations assessment
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Growth trajectory scoring
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-6">
                  <BoltIcon className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Value-Building Playbook</h3>
                <p className="text-muted-foreground mb-4">
                  Get a prioritized roadmap of high-impact actions with dollar-value attribution. Know exactly what to fix first.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Impact-ranked tasks
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Value attribution
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    Progress tracking
                  </li>
                </ul>
              </div>
            </div>

            {/* Secondary Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <FolderIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Secure Data Room</h4>
                <p className="text-sm text-muted-foreground">
                  Organized repository for due diligence documents with access controls and activity tracking.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <ChartIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Financial Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  P&L, Balance Sheet, and Cash Flow analysis with QuickBooks integration.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <UsersIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Deal Tracker</h4>
                <p className="text-sm text-muted-foreground">
                  Manage buyer relationships, track deal stages, and monitor engagement.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <ShieldIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Risk Assessment</h4>
                <p className="text-sm text-muted-foreground">
                  Identify and address risks that could derail your deal or reduce valuation.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <CalculatorIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Retirement Calculator</h4>
                <p className="text-sm text-muted-foreground">
                  Model your post-exit financial future and understand your target sale price.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <DocumentIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Personal Financial Statements</h4>
                <p className="text-sm text-muted-foreground">
                  Track your personal assets, liabilities, and net worth alongside business value.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <BankIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Business Loans</h4>
                <p className="text-sm text-muted-foreground">
                  Access our partner network for growth capital, acquisition financing, and more.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border">
                <TeamIcon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-semibold text-foreground mb-2">Team Collaboration</h4>
                <p className="text-sm text-muted-foreground">
                  Invite your team, advisors, and stakeholders to collaborate on exit preparation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How Exit OSx Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Go from uncertainty to exit-ready in four straightforward steps.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Complete Your Assessment</h3>
                <p className="text-muted-foreground">
                  Answer questions about your business, financials, and operations. Takes about 15 minutes.
                </p>
                <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-border -z-10" />
              </div>

              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Get Your Valuation</h3>
                <p className="text-muted-foreground">
                  See your estimated business value and Buyer Readiness Score with detailed breakdowns.
                </p>
                <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-border -z-10" />
              </div>

              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Follow Your Playbook</h3>
                <p className="text-muted-foreground">
                  Execute prioritized actions to increase value and improve buyer attractiveness.
                </p>
                <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-border -z-10" />
              </div>

              <div>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                  4
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Exit on Your Terms</h3>
                <p className="text-muted-foreground">
                  Enter negotiations prepared with a data room, documented value, and clear positioning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Built for Business Owners Like You
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you&apos;re planning to exit in 1 year or 10, Exit OSx helps you build value now.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-2xl border border-border bg-card">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <ClockIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Planning Ahead</h3>
                <p className="text-muted-foreground">
                  3-10 years from exit? Start building value now. Small improvements compound over time into significant valuation increases.
                </p>
              </div>

              <div className="text-center p-8 rounded-2xl border border-border bg-card">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                  <TargetIcon className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Actively Preparing</h3>
                <p className="text-muted-foreground">
                  1-3 years from exit? Focus on the highest-impact improvements and get your data room ready for due diligence.
                </p>
              </div>

              <div className="text-center p-8 rounded-2xl border border-border bg-card">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <RocketIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Going to Market</h3>
                <p className="text-muted-foreground">
                  Ready now? Track buyer engagement, manage deal flow, and present a polished, professional package.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-28 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to See What Your Business Is Worth?
            </h2>
            <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
              Get your valuation estimate and Buyer Readiness Score in minutes. No credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                Start Your Free Assessment
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
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

// Icons
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function BadgeCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  )
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function BankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
    </svg>
  )
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  )
}
