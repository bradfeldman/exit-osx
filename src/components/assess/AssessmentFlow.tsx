'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { ArrowLeft, Lock } from 'lucide-react'
import { BusinessBasicsStep, type BusinessBasicsData } from './BusinessBasicsStep'
import { BusinessProfileStep, type BusinessProfileData } from './BusinessProfileStep'
import { BuyerScanStep, type BuyerScanData } from './BuyerScanStep'
import { ReviewStep } from './ReviewStep'
import { ResultsReveal, type AssessmentResults } from './ResultsReveal'
import { CalculatingScreen } from './CalculatingScreen'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssessStep = 'basics' | 'profile' | 'scan' | 'review' | 'calculating' | 'results'

const STEP_ORDER: AssessStep[] = ['basics', 'profile', 'scan', 'review', 'results']
const STEP_NUMBERS: Record<string, AssessStep> = {
  '1': 'basics',
  '2': 'profile',
  '3': 'scan',
  '4': 'review',
}

// Progress bar percentages per step (from UX spec)
const STEP_PROGRESS: Record<AssessStep, number> = {
  basics: 20,
  profile: 40,
  scan: 40, // 40–75% — BuyerScanStep manages internal progress
  review: 90,
  calculating: 95,
  results: 100,
}

// ---------------------------------------------------------------------------
// Revenue Band → Dollar Midpoint
// ---------------------------------------------------------------------------

const REVENUE_BAND_MIDPOINTS: Record<string, number> = {
  UNDER_1M: 500_000,
  '1M_3M': 2_000_000,
  '3M_5M': 4_000_000,
  '5M_10M': 7_500_000,
  '10M_25M': 17_500_000,
  '25M_50M': 37_500_000,
  '50M_PLUS': 75_000_000,
}

function bandToRevenue(band: string): number {
  return REVENUE_BAND_MIDPOINTS[band] || 2_000_000
}

// ---------------------------------------------------------------------------
// Session Storage
// ---------------------------------------------------------------------------

const SESSION_KEY = 'exitosx-assessment-v2'
const SESSION_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface SessionState {
  step: number
  businessName: string
  description: string
  revenueBand: string | null
  icbClassification: {
    primaryIndustry: { name: string; icbSubSector: string; icbSector: string; icbSuperSector: string; icbIndustry: string }
    source: 'ai' | 'keyword' | 'default'
  } | null
  coreFactors: Partial<BusinessProfileData>
  buyerScan: Record<string, string | boolean>
  email: string | null
  timestamp: number
}

function loadSession(): SessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SessionState
    if (Date.now() - data.timestamp > SESSION_TTL) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function saveSession(state: Partial<SessionState>) {
  if (typeof window === 'undefined') return
  const existing = loadSession()
  const defaults: SessionState = {
    step: 1,
    businessName: '',
    description: '',
    revenueBand: null,
    icbClassification: null,
    coreFactors: {},
    buyerScan: {},
    email: null,
    timestamp: Date.now(),
  }
  const merged: SessionState = { ...defaults, ...existing, ...state, timestamp: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged))
}

function clearSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AssessmentFlowProps {
  initialStep?: AssessStep
}

export function AssessmentFlow({ initialStep }: AssessmentFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [step, setStep] = useState<AssessStep>('basics')
  const [basics, setBasics] = useState<BusinessBasicsData | null>(null)
  const [profile, setProfile] = useState<BusinessProfileData | null>(null)
  const [scan, setScan] = useState<BuyerScanData | null>(null)
  const [results, setResults] = useState<AssessmentResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [classification, setClassification] = useState<SessionState['icbClassification']>(null)
  const [classificationOverride, setClassificationOverride] = useState<{
    icbIndustry: string; icbSuperSector: string; icbSector: string; icbSubSector: string
  } | null>(null)
  const [returnToReview, setReturnToReview] = useState(false)
  const [scanProgress, setScanProgress] = useState(0) // 0–8 for buyer scan questions
  const initialized = useRef(false)

  // Restore session on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const session = loadSession()

    // If navigating to /assess/results, try to restore
    if (initialStep === 'results') {
      if (session && session.step >= 4) {
        // Restore data from session for results page
        if (session.businessName) {
          setBasics({
            companyName: session.businessName,
            businessDescription: session.description,
            revenueBand: session.revenueBand || '',
          })
        }
        if (Object.keys(session.coreFactors).length > 0) {
          setProfile(session.coreFactors as BusinessProfileData)
        }
        if (Object.keys(session.buyerScan).length > 0) {
          setScan({ answers: session.buyerScan as BuyerScanData['answers'], riskCount: 0, briScore: 0 })
        }
        if (session.icbClassification) {
          setClassification(session.icbClassification)
        }
        // Don't auto-calculate — let them see the review first
        setStep('review')
      } else {
        // No valid session — redirect to start
        router.replace('/assess')
      }
      return
    }

    // Restore from URL ?step= param
    const stepParam = searchParams.get('step')
    const targetStep = stepParam ? STEP_NUMBERS[stepParam] : null

    if (session) {
      // Restore data
      if (session.businessName) {
        setBasics({
          companyName: session.businessName,
          businessDescription: session.description,
          revenueBand: session.revenueBand || '',
        })
      }
      if (Object.keys(session.coreFactors).length > 0) {
        setProfile(session.coreFactors as BusinessProfileData)
      }
      if (Object.keys(session.buyerScan).length > 0) {
        setScan({ answers: session.buyerScan as BuyerScanData['answers'], riskCount: 0, briScore: 0 })
      }
      if (session.icbClassification) {
        setClassification(session.icbClassification)
      }

      // Navigate to requested step or last saved step
      if (targetStep) {
        setStep(targetStep)
      } else {
        const savedStep = Object.entries(STEP_NUMBERS).find(([, v]) => {
          const idx = STEP_ORDER.indexOf(v)
          return idx + 1 === session.step
        })
        if (savedStep) setStep(savedStep[1] as AssessStep)
      }
    } else if (targetStep && targetStep !== 'basics') {
      // No session but trying to access a later step — redirect to start
      router.replace('/assess')
    }
  }, [initialStep, searchParams, router])

  // Sync URL with step changes
  useEffect(() => {
    if (!initialized.current) return
    const stepNum = STEP_ORDER.indexOf(step) + 1
    if (step === 'results' || step === 'calculating') return

    const currentParam = searchParams.get('step')
    const newParam = stepNum > 1 ? String(stepNum) : null

    if (currentParam !== newParam) {
      const url = newParam ? `/assess?step=${newParam}` : '/assess'
      router.replace(url, { scroll: false })
    }
  }, [step, searchParams, router])

  // Persist to session storage on data changes
  useEffect(() => {
    if (!initialized.current) return
    saveSession({
      step: STEP_ORDER.indexOf(step) + 1,
      businessName: basics?.companyName || '',
      description: basics?.businessDescription || '',
      revenueBand: basics?.revenueBand || null,
      icbClassification: classification,
      coreFactors: profile || {},
      buyerScan: (scan?.answers || {}) as Record<string, string | boolean>,
    })
  }, [step, basics, profile, scan, classification])

  // Calculate progress
  const getProgress = (): number => {
    if (step === 'scan') {
      // 40% base + (question_number / 8 * 35%)
      return 40 + (scanProgress / 8) * 35
    }
    return STEP_PROGRESS[step] || 0
  }

  const stepIndex = STEP_ORDER.indexOf(step)
  const showShell = step !== 'results' && step !== 'calculating'

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBasicsComplete = useCallback((data: BusinessBasicsData) => {
    setBasics(data)
    if (returnToReview) {
      setReturnToReview(false)
      setStep('review')
    } else {
      setStep('profile')
    }

    // Classify in the background
    if (data.businessDescription.length >= 20) {
      fetch('/api/assess/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: data.businessDescription, annualRevenue: bandToRevenue(data.revenueBand) }),
      })
        .then(res => res.ok ? res.json() : null)
        .then(result => { if (result) setClassification(result) })
        .catch(() => {})
    }
  }, [returnToReview])

  const handleProfileComplete = useCallback((data: BusinessProfileData) => {
    setProfile(data)
    if (returnToReview) {
      setReturnToReview(false)
      setStep('review')
    } else {
      setStep('scan')
    }
  }, [returnToReview])

  const handleScanComplete = useCallback((data: BuyerScanData) => {
    setScan(data)
    setReturnToReview(false)
    setStep('review')
  }, [])

  const handleEditStep = useCallback((target: AssessStep) => {
    setReturnToReview(true)
    setStep(target)
  }, [])

  const handleReviewConfirm = useCallback(async () => {
    if (!basics || !profile || !scan) return
    setIsCalculating(true)
    setError(null)
    setStep('calculating')

    try {
      let classificationData = classification
      if (!classificationData) {
        const classifyRes = await fetch('/api/assess/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: basics.businessDescription, annualRevenue: bandToRevenue(basics.revenueBand) }),
        })
        if (classifyRes.ok) {
          classificationData = await classifyRes.json()
        }
      }

      if (classificationOverride && classificationData) {
        classificationData = {
          ...classificationData,
          primaryIndustry: {
            ...classificationData.primaryIndustry,
            ...classificationOverride,
          },
        }
      } else if (classificationOverride) {
        classificationData = {
          primaryIndustry: { name: '', ...classificationOverride },
          source: 'ai' as const,
        }
      }

      const calcRes = await fetch('/api/assess/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annualRevenue: bandToRevenue(basics.revenueBand),
          coreFactors: profile,
          buyerScan: scan,
          classification: classificationData,
        }),
      })

      if (!calcRes.ok) {
        const err = await calcRes.json()
        throw new Error(err.error || 'Calculation failed')
      }

      const calcData = await calcRes.json()
      setResults(calcData)

      // Save step to session
      saveSession({ step: 5 })

      setStep('results')
      router.replace('/assess/results', { scroll: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('review')
    } finally {
      setIsCalculating(false)
    }
  }, [basics, profile, scan, classification, classificationOverride, router])

  const handleBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx > 0) {
      setStep(STEP_ORDER[idx - 1])
    }
  }, [step])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Progress bar — 3px at very top */}
      {showShell && (
        <div
          className="fixed top-0 left-0 right-0 h-[3px] z-50"
          style={{ background: 'var(--border)' }}
        >
          <div
            className="h-full transition-all duration-400 ease-out"
            style={{
              width: `${getProgress()}%`,
              background: 'var(--primary)',
            }}
          />
        </div>
      )}

      {/* Top bar — fixed, 56px */}
      {showShell && (
        <header
          className="fixed top-[3px] left-0 right-0 h-14 z-40 flex items-center justify-between px-4 sm:px-6"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <a href="https://exitosx.com" className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Exit OS" width={32} height={32} className="h-8 w-8" />
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Exit OS
            </span>
          </a>
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            Step {Math.min(stepIndex + 1, 5)} of 5
          </span>
        </header>
      )}

      {/* Main content */}
      <main
        className={`flex-1 ${showShell ? 'pt-[59px]' : ''}`}
        style={{ paddingBottom: showShell ? '72px' : '0' }}
      >
        {/* Content card container */}
        <div className={`
          mx-auto w-full
          ${showShell ? 'max-w-[640px] px-5 sm:px-0 py-8' : ''}
          ${step === 'results' || step === 'calculating' ? 'max-w-none' : ''}
        `}>
          {/* Desktop card wrapper */}
          {showShell ? (
            <div
              className="hidden sm:block rounded-2xl p-10"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              {error && (
                <div
                  className="mb-6 p-4 rounded-xl text-sm"
                  style={{
                    background: 'var(--red-light)',
                    border: '1px solid var(--red)',
                    color: 'var(--red)',
                  }}
                >
                  {error}
                </div>
              )}
              <StepContent
                step={step}
                basics={basics}
                profile={profile}
                scan={scan}
                results={results}
                classification={classification}
                classificationOverride={classificationOverride}
                isCalculating={isCalculating}
                returnToReview={returnToReview}
                onBasicsComplete={handleBasicsComplete}
                onProfileComplete={handleProfileComplete}
                onScanComplete={handleScanComplete}
                onReviewConfirm={handleReviewConfirm}
                onEditStep={handleEditStep}
                onBack={handleBack}
                onClassificationChange={setClassificationOverride}
                onScanProgress={setScanProgress}
              />
            </div>
          ) : null}

          {/* Mobile layout — no card, full width */}
          {showShell ? (
            <div className="sm:hidden">
              {error && (
                <div
                  className="mb-6 p-4 rounded-xl text-sm"
                  style={{
                    background: 'var(--red-light)',
                    border: '1px solid var(--red)',
                    color: 'var(--red)',
                  }}
                >
                  {error}
                </div>
              )}
              <StepContent
                step={step}
                basics={basics}
                profile={profile}
                scan={scan}
                results={results}
                classification={classification}
                classificationOverride={classificationOverride}
                isCalculating={isCalculating}
                returnToReview={returnToReview}
                onBasicsComplete={handleBasicsComplete}
                onProfileComplete={handleProfileComplete}
                onScanComplete={handleScanComplete}
                onReviewConfirm={handleReviewConfirm}
                onEditStep={handleEditStep}
                onBack={handleBack}
                onClassificationChange={setClassificationOverride}
                onScanProgress={setScanProgress}
              />
            </div>
          ) : (
            <StepContent
              step={step}
              basics={basics}
              profile={profile}
              scan={scan}
              results={results}
              classification={classification}
              classificationOverride={classificationOverride}
              isCalculating={isCalculating}
              returnToReview={returnToReview}
              onBasicsComplete={handleBasicsComplete}
              onProfileComplete={handleProfileComplete}
              onScanComplete={handleScanComplete}
              onReviewConfirm={handleReviewConfirm}
              onEditStep={handleEditStep}
              onBack={handleBack}
              onClassificationChange={setClassificationOverride}
              onScanProgress={setScanProgress}
            />
          )}
        </div>
      </main>

      {/* Bottom bar — fixed, 72px */}
      {showShell && (
        <footer
          className="fixed bottom-0 left-0 right-0 h-[72px] z-40 flex items-center justify-between px-4 sm:px-6"
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {stepIndex > 0 ? (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : <div />}

          <div
            className="hidden sm:flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Lock className="w-3 h-3" />
            Your data is private
          </div>

          <div /> {/* Spacer — Continue button is inside each step */}
        </footer>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StepContent — renders the active step
// ---------------------------------------------------------------------------

interface StepContentProps {
  step: AssessStep
  basics: BusinessBasicsData | null
  profile: BusinessProfileData | null
  scan: BuyerScanData | null
  results: AssessmentResults | null
  classification: SessionState['icbClassification']
  classificationOverride: { icbIndustry: string; icbSuperSector: string; icbSector: string; icbSubSector: string } | null
  isCalculating: boolean
  returnToReview: boolean
  onBasicsComplete: (data: BusinessBasicsData) => void
  onProfileComplete: (data: BusinessProfileData) => void
  onScanComplete: (data: BuyerScanData) => void
  onReviewConfirm: () => void
  onEditStep: (step: AssessStep) => void
  onBack: () => void
  onClassificationChange: (value: { icbIndustry: string; icbSuperSector: string; icbSector: string; icbSubSector: string }) => void
  onScanProgress: (progress: number) => void
}

function StepContent({
  step, basics, profile, scan, results, classification, classificationOverride,
  isCalculating, onBasicsComplete, onProfileComplete, onScanComplete,
  onReviewConfirm, onEditStep, onBack, onClassificationChange, onScanProgress,
}: StepContentProps) {
  return (
    <AnimatePresence mode="wait">
      {step === 'basics' && (
        <motion.div
          key="basics"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <BusinessBasicsStep initialData={basics} onComplete={onBasicsComplete} />
        </motion.div>
      )}
      {step === 'profile' && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <BusinessProfileStep
            initialData={profile}
            onComplete={onProfileComplete}
            onBack={onBack}
            industryName={classification?.primaryIndustry?.name ?? null}
            classificationSource={classification?.source}
            classificationValue={classificationOverride ?? (classification ? {
              icbIndustry: classification.primaryIndustry.icbIndustry,
              icbSuperSector: classification.primaryIndustry.icbSuperSector,
              icbSector: classification.primaryIndustry.icbSector,
              icbSubSector: classification.primaryIndustry.icbSubSector,
            } : undefined)}
            onClassificationChange={onClassificationChange}
          />
        </motion.div>
      )}
      {step === 'scan' && (
        <motion.div
          key="scan"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <BuyerScanStep
            initialData={scan}
            onComplete={onScanComplete}
            onBack={onBack}
            onProgress={onScanProgress}
          />
        </motion.div>
      )}
      {step === 'review' && basics && profile && scan && (
        <motion.div
          key="review"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ReviewStep
            basics={basics}
            profile={profile}
            scan={scan}
            onConfirm={onReviewConfirm}
            onEdit={onEditStep}
            isCalculating={isCalculating}
            onBack={onBack}
          />
        </motion.div>
      )}
      {step === 'calculating' && (
        <motion.div
          key="calculating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CalculatingScreen companyName={basics?.companyName} />
        </motion.div>
      )}
      {step === 'results' && results && basics && (
        <motion.div
          key="results"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ResultsReveal results={results} basics={basics} profile={profile!} scan={scan!} industryName={classification?.primaryIndustry?.name} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
