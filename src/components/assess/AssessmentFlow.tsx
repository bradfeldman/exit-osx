'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { BusinessBasicsStep, type BusinessBasicsData } from './BusinessBasicsStep'
import { BusinessProfileStep, type BusinessProfileData } from './BusinessProfileStep'
import { BuyerScanStep, type BuyerScanData } from './BuyerScanStep'
import { ReviewStep } from './ReviewStep'
import { ResultsReveal, type AssessmentResults } from './ResultsReveal'

export type AssessStep = 'basics' | 'profile' | 'scan' | 'review' | 'results'

const STEP_ORDER: AssessStep[] = ['basics', 'profile', 'scan', 'review', 'results']

const STEP_LABELS: Record<AssessStep, string> = {
  basics: 'Basics',
  profile: 'Profile',
  scan: 'Buyer Scan',
  review: 'Review',
  results: 'Results',
}

export function AssessmentFlow() {
  const [step, setStep] = useState<AssessStep>('basics')
  const [basics, setBasics] = useState<BusinessBasicsData | null>(null)
  const [profile, setProfile] = useState<BusinessProfileData | null>(null)
  const [scan, setScan] = useState<BuyerScanData | null>(null)
  const [results, setResults] = useState<AssessmentResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEP_ORDER.indexOf(step)

  const handleBasicsComplete = useCallback((data: BusinessBasicsData) => {
    setBasics(data)
    setStep('profile')
  }, [])

  const handleProfileComplete = useCallback((data: BusinessProfileData) => {
    setProfile(data)
    setStep('scan')
  }, [])

  const handleScanComplete = useCallback((data: BuyerScanData) => {
    setScan(data)
    setStep('review')
  }, [])

  const handleEditStep = useCallback((target: AssessStep) => {
    setStep(target)
  }, [])

  const handleReviewConfirm = useCallback(async () => {
    if (!basics || !profile || !scan) return
    setIsCalculating(true)
    setError(null)

    try {
      // Classify the business
      const classifyRes = await fetch('/api/assess/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: basics.businessDescription }),
      })

      let classification = null
      if (classifyRes.ok) {
        classification = await classifyRes.json()
      }

      // Calculate BRI + valuation
      const calcRes = await fetch('/api/assess/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annualRevenue: basics.annualRevenue,
          coreFactors: profile,
          buyerScan: scan,
          classification,
        }),
      })

      if (!calcRes.ok) {
        const err = await calcRes.json()
        throw new Error(err.error || 'Calculation failed')
      }

      const calcData = await calcRes.json()
      setResults(calcData)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsCalculating(false)
    }
  }, [basics, profile, scan])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="https://exitosx.com" className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Exit OSx" width={32} height={32} className="h-8 w-8" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wordmark.svg" alt="Exit OSx" width={100} height={28} className="h-6 w-auto" />
          </a>
          {step !== 'results' && (
            <span className="text-sm text-muted-foreground">
              {stepIndex + 1} of {STEP_ORDER.length}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {step !== 'results' && (
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((stepIndex + 1) / STEP_ORDER.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </header>

      {/* Step label pills */}
      {step !== 'results' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEP_ORDER.filter(s => s !== 'results').map((s, i) => (
              <div
                key={s}
                className={`
                  text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap
                  ${i < stepIndex ? 'bg-primary/10 text-primary' : ''}
                  ${i === stepIndex ? 'bg-primary text-primary-foreground' : ''}
                  ${i > stepIndex ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {STEP_LABELS[s]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 'basics' && (
            <motion.div key="basics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BusinessBasicsStep initialData={basics} onComplete={handleBasicsComplete} />
            </motion.div>
          )}
          {step === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BusinessProfileStep initialData={profile} onComplete={handleProfileComplete} onBack={() => setStep('basics')} />
            </motion.div>
          )}
          {step === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BuyerScanStep initialData={scan} onComplete={handleScanComplete} onBack={() => setStep('profile')} />
            </motion.div>
          )}
          {step === 'review' && basics && profile && scan && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ReviewStep
                basics={basics}
                profile={profile}
                scan={scan}
                onConfirm={handleReviewConfirm}
                onEdit={handleEditStep}
                isCalculating={isCalculating}
                onBack={() => setStep('scan')}
              />
            </motion.div>
          )}
          {step === 'results' && results && basics && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <ResultsReveal results={results} email={basics.email} basics={basics} profile={profile!} scan={scan!} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Your data is private and never shared. No credit card required.
          </p>
        </div>
      </footer>
    </div>
  )
}
