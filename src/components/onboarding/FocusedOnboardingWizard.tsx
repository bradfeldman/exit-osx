'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { BasicInfoStep } from '@/components/company/steps/BasicInfoStep'
import { RevenueStep } from '@/components/company/steps/RevenueStep'
import { useCompany } from '@/contexts/CompanyContext'
import { analytics } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import styles from '@/components/onboarding/onboarding.module.css'

interface Adjustment {
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
}

export interface CompanyFormData {
  name: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  annualRevenue: number
  annualEbitda: number
  revenueSizeCategory: string
  ownerCompensation: number
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
  adjustments: Adjustment[]
}

const initialFormData: CompanyFormData = {
  name: '',
  icbIndustry: '',
  icbSuperSector: '',
  icbSector: '',
  icbSubSector: '',
  annualRevenue: 0,
  annualEbitda: 0,
  revenueSizeCategory: '',
  ownerCompensation: 0,
  revenueModel: '',
  grossMarginProxy: '',
  laborIntensity: '',
  assetIntensity: '',
  ownerInvolvement: '',
  adjustments: [],
}

// Simplified 2-step onboarding (Business Profile removed - defaults to industry averages)
const steps = [
  { id: 1, title: 'Your Business', description: 'Name & industry' },
  { id: 2, title: 'Revenue', description: 'Annual revenue' },
]

function getRevenueSizeCategory(revenue: number): string {
  if (revenue < 500000) return 'UNDER_500K'
  if (revenue < 1000000) return 'FROM_500K_TO_1M'
  if (revenue < 3000000) return 'FROM_1M_TO_3M'
  if (revenue < 10000000) return 'FROM_3M_TO_10M'
  if (revenue < 25000000) return 'FROM_10M_TO_25M'
  return 'OVER_25M'
}

interface FocusedOnboardingWizardProps {
  userName?: string
}

export function FocusedOnboardingWizard({ userName: _userName }: FocusedOnboardingWizardProps) {
  const router = useRouter()
  const supabase = createClient()
  const { refreshCompanies, setSelectedCompanyId } = useCompany()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [businessDescription, setBusinessDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [newCompanyId, setNewCompanyId] = useState<string | null>(null)
  const [estimatedValuation, setEstimatedValuation] = useState<number | null>(null)
  const [industryPath, setIndustryPath] = useState<string>('')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Analytics refs
  const wizardStartTime = useRef(Date.now())
  const stepStartTime = useRef(Date.now())
  const stepsVisited = useRef<Set<number>>(new Set([1]))
  const hasTrackedStart = useRef(false)

  const stepNames: Array<'basic_info' | 'revenue'> = ['basic_info', 'revenue']

  // Load company name from localStorage (set during signup)
  useEffect(() => {
    const pendingCompanyName = localStorage.getItem('pendingCompanyName')
    if (pendingCompanyName) {
      setFormData(prev => ({ ...prev, name: pendingCompanyName }))
      localStorage.removeItem('pendingCompanyName') // Clean up
    }
  }, [])

  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      analytics.track('setup_wizard_started', {
        entrySource: 'focused_onboarding',
      })
      analytics.startTimer('setup_wizard')
    }
  }, [])

  useEffect(() => {
    const stepName = stepNames[currentStep - 1]
    stepStartTime.current = Date.now()
    analytics.track('setup_step_viewed', {
      stepNumber: currentStep,
      stepName,
    })
  }, [currentStep])

  useEffect(() => {
    return () => {
      if (!showCelebration && hasTrackedStart.current) {
        const totalTimeSpent = Date.now() - wizardStartTime.current
        analytics.track('setup_abandoned', {
          lastStepCompleted: Math.max(...Array.from(stepsVisited.current)) - 1,
          totalTimeSpent,
        })
      }
    }
  }, [showCelebration])

  const trackStepCompleted = useCallback((stepNumber: number) => {
    const stepName = stepNames[stepNumber - 1]
    const duration = Date.now() - stepStartTime.current
    stepsVisited.current.add(stepNumber)

    analytics.track('setup_step_time', {
      stepNumber,
      stepName,
      duration,
    })

    let inputsProvided: Record<string, unknown> = {}
    switch (stepNumber) {
      case 1:
        inputsProvided = {
          hasName: !!formData.name,
          hasIndustry: !!formData.icbSubSector,
        }
        break
      case 2:
        inputsProvided = {
          revenueRange: getRevenueSizeCategory(formData.annualRevenue),
          hasRevenue: formData.annualRevenue > 0,
        }
        break
      case 3:
        inputsProvided = {
          revenueModel: formData.revenueModel,
          laborIntensity: formData.laborIntensity,
          assetIntensity: formData.assetIntensity,
          ownerInvolvement: formData.ownerInvolvement,
        }
        break
    }

    analytics.track('setup_step_completed', {
      stepNumber,
      stepName,
      inputsProvided,
    })
  }, [formData])

  const updateFormData = (updates: Partial<CompanyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleNext = () => {
    trackStepCompleted(currentStep)
    setCurrentStep(prev => Math.min(prev + 1, steps.length))
  }

  const handleBack = () => {
    analytics.track('setup_step_back', {
      fromStep: currentStep,
      toStep: Math.max(currentStep - 1, 1),
    })
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Fire confetti
  useEffect(() => {
    if (!showCelebration || typeof window === 'undefined') return

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#B87333', '#D4A574', '#FFD700', '#FFFFFF'],
      startVelocity: 45,
      gravity: 0.8,
      scalar: 1.2,
      zIndex: 9999,
    })

    const sideTimer = setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.7 },
        colors: ['#B87333', '#FFD700', '#FFFFFF'],
        startVelocity: 35,
        zIndex: 9999,
      })
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.7 },
        colors: ['#B87333', '#FFD700', '#FFFFFF'],
        startVelocity: 35,
        zIndex: 9999,
      })
    }, 200)

    return () => clearTimeout(sideTimer)
  }, [showCelebration])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const syncResponse = await fetch('/api/user/sync', { method: 'POST' })
      if (!syncResponse.ok) throw new Error('Failed to sync user')

      const revenueSizeCategory = getRevenueSizeCategory(formData.annualRevenue)

      const companyResponse = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          icbIndustry: formData.icbIndustry,
          icbSuperSector: formData.icbSuperSector,
          icbSector: formData.icbSector,
          icbSubSector: formData.icbSubSector,
          annualRevenue: formData.annualRevenue,
          annualEbitda: 0,
          ownerCompensation: 0,
        })
      })

      if (!companyResponse.ok) {
        const data = await companyResponse.json()
        throw new Error(data.error || 'Failed to create company')
      }

      const { company } = await companyResponse.json()

      // Default core factors to highest values (Core Score = 1.0)
      // Risk Assessment will later adjust based on actual business risks
      const coreFactorsPayload: Record<string, string> = {
        revenueSizeCategory,
        revenueModel: 'SUBSCRIPTION_SAAS',      // Default to best (will be refined by Risk Assessment)
        laborIntensity: 'LOW',                   // Default to best
        assetIntensity: 'ASSET_LIGHT',           // Default to best
        ownerInvolvement: 'MINIMAL',             // Default to best
        grossMarginProxy: 'EXCELLENT',           // Default to best
      }

      const coreFactorsResponse = await fetch(`/api/companies/${company.id}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coreFactorsPayload)
      })

      if (!coreFactorsResponse.ok) {
        const errorData = await coreFactorsResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save business profile')
      }

      trackStepCompleted(currentStep)

      const totalTime = Date.now() - wizardStartTime.current
      analytics.track('setup_completed', {
        totalTime,
        stepsRevisited: stepsVisited.current.size > steps.length ? stepsVisited.current.size - steps.length : 0,
      })

      // Fetch the dashboard data to get estimated valuation
      try {
        const dashboardResponse = await fetch(`/api/companies/${company.id}/dashboard`)
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          // Get estimated value from tier1 or tier2
          const estimatedValue = dashboardData.tier1?.currentValue || dashboardData.tier2?.estimatedValue || null
          setEstimatedValuation(estimatedValue)
          setIndustryPath(dashboardData.tier2?.industry || '')
        }
      } catch {
        // Valuation fetch failed - celebration will show without number
        console.error('Failed to fetch valuation for celebration')
      }

      setNewCompanyId(company.id)
      setShowCelebration(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      analytics.track('error_displayed', {
        errorType: 'setup_wizard_submit',
        errorMessage: err instanceof Error ? err.message : 'An error occurred',
        errorContext: `step_${currentStep}`,
      })
      setIsSubmitting(false)
    }
  }

  const handleContinueToDashboard = async () => {
    if (newCompanyId) {
      setSelectedCompanyId(newCompanyId)
    }
    await refreshCompanies()
    router.push('/dashboard')
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            formData={formData}
            updateFormData={updateFormData}
            businessDescription={businessDescription}
            onBusinessDescriptionChange={setBusinessDescription}
          />
        )
      case 2:
        return <RevenueStep formData={formData} updateFormData={updateFormData} />
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.icbIndustry && formData.icbSuperSector && formData.icbSector && formData.icbSubSector
      case 2:
        return formData.annualRevenue > 0
      default:
        return false
    }
  }

  // Step-specific value reminders
  const getStepValueReminder = () => {
    switch (currentStep) {
      case 1:
        return "Your industry determines your baseline valuation multiple"
      case 2:
        return "Revenue size directly impacts your company's market value"
      case 3:
        return "These factors determine your Core Score multiplier"
      default:
        return ""
    }
  }

  // Format valuation for display
  const formatValuation = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toLocaleString()}`
  }

  // Celebration screen - THE BIG REVEAL (Dan Martell + Alex Hormozi style)
  if (showCelebration) {
    return (
      <div className={styles.obCelebration}>
        {/* Dark gradient background for drama */}
        <div className={styles.obCelebrationBg} aria-hidden="true" />

        {/* Subtle gold accent glow */}
        <div className={styles.obCelebrationGlow} aria-hidden="true" />

        <div className={styles.obCelebrationBody}>
          <motion.div
            className={styles.obCelebrationContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Small label */}
            <motion.p
              className={styles.obCelebrationLabel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Based on {industryPath || 'your industry'} averages
            </motion.p>

            {/* The headline */}
            <motion.h2
              className={styles.obCelebrationSubheading}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Businesses like yours sell for approximately
            </motion.h2>

            {/* THE BIG NUMBER */}
            {estimatedValuation ? (
              <motion.div
                className={styles.obCelebrationNumber}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.8, type: "spring", stiffness: 100 }}
              >
                <span className={styles.obCelebrationValueText}>
                  {formatValuation(estimatedValuation)}
                </span>
              </motion.div>
            ) : (
              <motion.div
                className={styles.obCelebrationNumber}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <span className={styles.obCelebrationPlaceholder}>
                  Calculating...
                </span>
              </motion.div>
            )}

            {/* Value anchor line */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              But your number could be{' '}
              <span className={styles.obCelebrationHighlight}>20-40% higher</span>{' '}
              with the right preparation.
            </motion.p>

            {/* Curiosity hook */}
            <motion.div
              className={styles.obCelebrationHook}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <p className={styles.obCelebrationHookText}>
                <span className={styles.obCelebrationCompanyName}>{formData.name}</span>{' '}
                has hidden value that buyers will discount — unless you fix it first.
              </p>
              <p className={styles.obCelebrationHookAccent}>
                Your Exit Readiness Score reveals exactly where.
              </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.8, duration: 0.5, type: "spring" }}
            >
              <Button
                size="lg"
                onClick={handleContinueToDashboard}
                className="text-lg px-10 py-7 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all font-semibold bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-500"
              >
                <span>See Where Buyers Will Discount You</span>
                <motion.svg
                  className="ml-3 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 2.5 }}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </motion.svg>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Main wizard
  return (
    <div className={styles.obWizard}>
      {/* Subtle gradient background */}
      <div className={styles.obWizardBg} aria-hidden="true" />

      <div className={styles.obWizardBody}>
        {/* Unified Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.obStepIndicator}
        >
          <div className={styles.obStepIndicatorInner} role="list" aria-label="Onboarding steps">
            {steps.map((step, idx) => (
              <div key={step.id} className={styles.obStepItem} role="listitem">
                <div className={styles.obStepItemInner}>
                  <div
                    className={
                      currentStep > step.id
                        ? `${styles.obStepBubble} ${styles.obStepBubbleComplete}`
                        : currentStep === step.id
                          ? `${styles.obStepBubble} ${styles.obStepBubbleActive}`
                          : styles.obStepBubble
                    }
                    aria-current={currentStep === step.id ? 'step' : undefined}
                  >
                    {currentStep > step.id ? (
                      <svg
                        className={styles.obStepBubbleIcon}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={
                      currentStep === step.id
                        ? `${styles.obStepLabel} ${styles.obStepLabelActive}`
                        : styles.obStepLabel
                    }
                  >
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={
                      currentStep > step.id
                        ? `${styles.obStepConnector} ${styles.obStepConnectorComplete}`
                        : styles.obStepConnector
                    }
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Value Anchor Banner - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.obAnchorBanner}
        >
          <div className={styles.obAnchorBannerInner}>
            <p className={styles.obAnchorBannerLabel}>
              <span className={styles.obAnchorBannerEmphasis}>Why this matters: </span>
              <span className={styles.obAnchorBannerText}>{getStepValueReminder()}</span>
            </p>
          </div>
        </motion.div>

        {/* Main Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.obWizardCard}
        >
          <div className={styles.obWizardCardBody}>
            {error && (
              <div className={styles.obCardError} role="alert">
                <svg
                  className={styles.obCardErrorIcon}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className={styles.obStepContent}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <nav className={styles.obWizardNav} aria-label="Step navigation">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`gap-2${currentStep === 1 ? ` ${styles.obNavHidden}` : ''}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 px-6"
            >
              Continue
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="gap-2 px-6"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  See My Valuation
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </Button>
          )}
        </nav>

        {/* Trust Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={styles.obTrustFooter}
        >
          <div className={styles.obTrustItem}>
            <svg className={styles.obTrustIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Enterprise-grade security</span>
          </div>
          <div className={styles.obTrustItem}>
            <svg className={styles.obTrustIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Step {currentStep} of {steps.length}</span>
          </div>
          <button
            onClick={handleSignOut}
            className={styles.obSignOutButton}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log out</span>
          </button>
        </motion.footer>
      </div>
    </div>
  )
}
