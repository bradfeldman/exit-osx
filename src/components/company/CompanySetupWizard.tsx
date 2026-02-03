'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './StepIndicator'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { RevenueStep } from './steps/RevenueStep'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'
import { analytics } from '@/lib/analytics'

interface Adjustment {
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
}

export interface CompanyFormData {
  // Step 1: Basic Info
  name: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  // Step 2: Revenue/Financials
  annualRevenue: number
  annualEbitda: number
  revenueSizeCategory: string
  ownerCompensation: number
  // Step 3: Business Profile (Core Factors)
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
  // Step 4: Adjustments (optional)
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

// Simplified 2-step flow (Business Profile removed - defaults to industry averages)
const steps = [
  { id: 1, title: 'Company Info', description: 'Name & industry' },
  { id: 2, title: 'Revenue', description: 'Annual revenue' },
]

// Calculate revenue size category from actual revenue
function getRevenueSizeCategory(revenue: number): string {
  if (revenue < 500000) return 'UNDER_500K'
  if (revenue < 1000000) return 'FROM_500K_TO_1M'
  if (revenue < 3000000) return 'FROM_1M_TO_3M'
  if (revenue < 10000000) return 'FROM_3M_TO_10M'
  if (revenue < 25000000) return 'FROM_10M_TO_25M'
  return 'OVER_25M'
}

export function CompanySetupWizard() {
  const router = useRouter()
  const { refreshCompanies, setSelectedCompanyId } = useCompany()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [businessDescription, setBusinessDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [newCompanyId, setNewCompanyId] = useState<string | null>(null)

  // Analytics: Tracking refs
  const wizardStartTime = useRef(Date.now())
  const stepStartTime = useRef(Date.now())
  const stepsVisited = useRef<Set<number>>(new Set([1]))
  const hasTrackedStart = useRef(false)

  // Analytics: Step names for tracking (matches SetupStepViewedParams type)
  const stepNames: Array<'basic_info' | 'revenue'> = ['basic_info', 'revenue']

  // Analytics: Track wizard started on mount
  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      analytics.track('setup_wizard_started', {
        entrySource: document.referrer || 'direct',
      })
      analytics.startTimer('setup_wizard')
    }
  }, [])

  // Analytics: Track step views
  useEffect(() => {
    const stepName = stepNames[currentStep - 1]
    stepStartTime.current = Date.now()

    analytics.track('setup_step_viewed', {
      stepNumber: currentStep,
      stepName,
    })
  }, [currentStep])

  // Analytics: Track abandonment on unmount
  useEffect(() => {
    return () => {
      // Only track abandonment if wizard wasn't completed
      if (!showCelebration && hasTrackedStart.current) {
        const totalTimeSpent = Date.now() - wizardStartTime.current
        analytics.track('setup_abandoned', {
          lastStepCompleted: Math.max(...Array.from(stepsVisited.current)) - 1,
          totalTimeSpent,
        })
      }
    }
  }, [showCelebration])

  // Analytics: Track step completion helper
  const trackStepCompleted = useCallback((stepNumber: number) => {
    const stepName = stepNames[stepNumber - 1]
    const duration = Date.now() - stepStartTime.current
    stepsVisited.current.add(stepNumber)

    analytics.track('setup_step_time', {
      stepNumber,
      stepName,
      duration,
    })

    // Get relevant inputs for this step
    let inputsProvided: Record<string, unknown> = {}
    switch (stepNumber) {
      case 1:
        inputsProvided = {
          hasName: !!formData.name,
          hasIndustry: !!formData.icbSubSector,
          industryPath: formData.icbIndustry ? `${formData.icbIndustry} > ${formData.icbSuperSector} > ${formData.icbSector}` : null,
        }
        break
      case 2:
        inputsProvided = {
          revenueRange: getRevenueSizeCategory(formData.annualRevenue),
          hasRevenue: formData.annualRevenue > 0,
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
    // Track step completion before moving to next
    trackStepCompleted(currentStep)
    setCurrentStep(prev => Math.min(prev + 1, steps.length))
  }

  const handleBack = () => {
    // Track step back navigation
    const fromStep = currentStep
    const toStep = Math.max(currentStep - 1, 1)

    analytics.track('setup_step_back', {
      fromStep,
      toStep,
    })

    setCurrentStep(toStep)
  }

  // Fire confetti when celebration shows - SPECTACULAR version
  useEffect(() => {
    if (!showCelebration || typeof window === 'undefined') return

    // Initial massive burst from center
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

    // Delayed side bursts
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

    // Continuous gentle rain for 4 seconds
    const duration = 4000
    const end = Date.now() + duration
    let animationId: number

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#B87333', '#D4A574', '#FFD700'],
        startVelocity: 25,
        zIndex: 9999,
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#B87333', '#D4A574', '#FFD700'],
        startVelocity: 25,
        zIndex: 9999,
      })

      if (Date.now() < end) {
        animationId = requestAnimationFrame(frame)
      }
    }

    frame()

    // Second burst at 1.5 seconds
    const secondTimer = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6, x: 0.5 },
        colors: ['#B87333', '#FFD700'],
        startVelocity: 30,
        zIndex: 9999,
      })
    }, 1500)

    // Cleanup
    return () => {
      clearTimeout(sideTimer)
      clearTimeout(secondTimer)
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [showCelebration])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // First sync the user to ensure they exist in the database
      const syncResponse = await fetch('/api/user/sync', { method: 'POST' })
      if (!syncResponse.ok) {
        throw new Error('Failed to sync user')
      }

      // Calculate revenue size category from actual revenue
      const revenueSizeCategory = getRevenueSizeCategory(formData.annualRevenue)

      // Create the company (with default 0 values for EBITDA and owner comp - they'll add later)
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
      // This gives users a favorable starting point - Risk Assessment will adjust
      const coreFactorsPayload: Record<string, string> = {
        revenueSizeCategory,
        revenueModel: 'SUBSCRIPTION_SAAS',
        laborIntensity: 'LOW',
        assetIntensity: 'ASSET_LIGHT',
        ownerInvolvement: 'MINIMAL',
        grossMarginProxy: 'EXCELLENT',
      }

      const coreFactorsResponse = await fetch(`/api/companies/${company.id}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coreFactorsPayload)
      })

      if (!coreFactorsResponse.ok) {
        const errorData = await coreFactorsResponse.json().catch(() => ({}))
        console.error('Failed to save core factors:', errorData)
        throw new Error(errorData.error || 'Failed to save business profile')
      }

      // Track final step completion
      trackStepCompleted(currentStep)

      // Track wizard completion
      const totalTime = Date.now() - wizardStartTime.current
      const stepsRevisited = stepsVisited.current.size > steps.length
        ? stepsVisited.current.size - steps.length
        : 0

      analytics.track('setup_completed', {
        totalTime,
        stepsRevisited,
      })

      // Save the new company ID and show celebration
      setNewCompanyId(company.id)
      setShowCelebration(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')

      // Track error
      analytics.track('error_displayed', {
        errorType: 'setup_wizard_submit',
        errorMessage: err instanceof Error ? err.message : 'An error occurred',
        errorContext: `step_${currentStep}`,
      })

      setIsSubmitting(false)
    }
  }

  const handleContinueToDashboard = async () => {
    // Set the new company as selected BEFORE refreshing
    // This way refreshCompanies will preserve this selection
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

  // Celebration screen
  if (showCelebration) {
    return (
      <motion.div
        className="relative flex flex-col items-center justify-center min-h-[600px] text-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Floating sparkle particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/60 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}

        {/* Success animation - LARGER */}
        <motion.div
          className="relative mb-10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 15 }}
        >
          {/* Outer glow rings */}
          <motion.div
            className="absolute inset-[-20px] bg-primary/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-[-10px] bg-amber-500/20 rounded-full blur-2xl"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          />

          {/* Main icon circle */}
          <div className="relative w-36 h-36 bg-gradient-to-br from-primary via-primary/90 to-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-primary/30">
            <motion.svg
              className="w-18 h-18 text-white"
              style={{ width: 72, height: 72 }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
              />
            </motion.svg>
          </div>
        </motion.div>

        {/* Content */}
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-foreground mb-3 font-display"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          You&apos;re All Set!
        </motion.h1>

        <motion.p
          className="text-xl text-muted-foreground mb-2 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <span className="font-semibold text-foreground">{formData.name}</span> is ready.
        </motion.p>

        <motion.p
          className="text-base text-muted-foreground max-w-lg mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          We&apos;ve calculated a preview based on industry averages.
        </motion.p>

        <motion.p
          className="text-base text-foreground font-medium max-w-lg mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          Want to see what buyers would actually pay for <span className="text-primary">your</span> business?
        </motion.p>

        {/* CTA - Larger and more prominent */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1, duration: 0.5, type: "spring" }}
        >
          <Button
            size="lg"
            onClick={handleContinueToDashboard}
            className="text-lg px-10 py-7 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 transition-all font-semibold"
          >
            <span>See Your Preview</span>
            <motion.svg
              className="ml-3 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </motion.svg>
          </Button>
        </motion.div>

        {/* Subtle hint */}
        <motion.p
          className="text-xs text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          Based on your revenue and industry data
        </motion.p>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-card rounded-2xl border border-border shadow-xl shadow-black/5 p-6 sm:p-8 overflow-hidden"
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-amber-500/[0.02] pointer-events-none" />
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="relative min-h-[400px]">
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
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1}
          className={cn(
            'gap-2',
            currentStep === 1 && 'invisible'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                Complete Setup
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
