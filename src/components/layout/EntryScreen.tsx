'use client'

import Link from 'next/link'

export function EntryScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" fill="none" aria-label="Exit OS">
          <rect width="32" height="32" rx="8" fill="#0071E3" />
          <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-2xl font-bold text-white tracking-tight">Exit OS</span>
      </div>

      {/* Main Content */}
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          See how buyers value your business
        </h1>

        <p className="text-lg text-slate-300">
          Get your personalized business valuation in minutes. Understand your exit options and maximize your company&apos;s worth.
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-primary/25"
          >
            Start Here
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* Value Props */}
        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <ClockIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-1">Quick Assessment</h3>
            <p className="text-sm text-slate-400">Get your initial valuation in under 10 minutes</p>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <ChartIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-1">Buyer&apos;s Perspective</h3>
            <p className="text-sm text-slate-400">See exactly how buyers evaluate your business</p>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <TargetIcon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-1">Action Plan</h3>
            <p className="text-sm text-slate-400">Get a roadmap to increase your exit value</p>
          </div>
        </div>
      </div>

    </div>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}
