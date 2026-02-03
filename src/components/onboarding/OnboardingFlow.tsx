'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { BasicInfoStep } from '@/components/company/steps/BasicInfoStep'
import { RevenueStep } from '@/components/company/steps/RevenueStep'
import type { CompanyFormData } from '@/components/company/CompanySetupWizard'
import { IndustryPreviewStep } from './steps/IndustryPreviewStep'
import { RiskAssessmentStep } from './steps/RiskAssessmentStep'
import { ValuationRevealStep } from './steps/ValuationRevealStep'
import { BusinessDescriptionStep } from './steps/BusinessDescriptionStep'
import { ClarifyingQuestionsStep } from './steps/ClarifyingQuestionsStep'
import type { ClarifyingQuestion, BusinessProfile } from '@/lib/ai/types'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Onboarding step definitions
const STEPS = [
  { id: 1, key: 'company', title: 'Your Business' },
  { id: 2, key: 'description', title: 'About Your Business' },
  { id: 3, key: 'clarifying', title: 'Quick Questions' },
  { id: 4, key: 'revenue', title: 'Revenue' },
  { id: 5, key: 'preview', title: 'Industry Preview' },
  { id: 6, key: 'assessment', title: 'Risk Discovery' },
  { id: 7, key: 'reveal', title: 'Your Valuation' },
]

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
  revenueModel: 'SUBSCRIPTION_SAAS',
  grossMarginProxy: 'EXCELLENT',
  laborIntensity: 'LOW',
  assetIntensity: 'ASSET_LIGHT',
  ownerInvolvement: 'MINIMAL',
  adjustments: [],
}

// Calculate revenue size category from actual revenue
function getRevenueSizeCategory(revenue: number): string {
  if (revenue < 500000) return 'UNDER_500K'
  if (revenue < 1000000) return 'FROM_500K_TO_1M'
  if (revenue < 3000000) return 'FROM_1M_TO_3M'
  if (revenue < 10000000) return 'FROM_3M_TO_10M'
  if (revenue < 25000000) return 'FROM_10M_TO_25M'
  return 'OVER_25M'
}

interface OnboardingFlowProps {
  userName?: string
}

export function OnboardingFlow({ userName }: OnboardingFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshCompanies, setSelectedCompanyId } = useCompany()

  // Get step from URL, default to 1
  const urlStep = searchParams.get('step')
  const currentStep = urlStep ? parseInt(urlStep, 10) : 1

  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Business profile state for AI-powered diagnosis
  const [businessDescription, setBusinessDescription] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return sessionStorage.getItem('onboarding_businessDescription') || ''
  })
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({})
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([])
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)

  // Store companyId in state + sessionStorage for tab refresh resilience
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('onboarding_companyId')
  })

  const [industryPreviewData, setIndustryPreviewData] = useState<{
    valuationLow: number
    valuationHigh: number
    potentialGap: number
    industryName: string
  } | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('onboarding_previewData')
    return stored ? JSON.parse(stored) : null
  })

  const [assessmentComplete, setAssessmentComplete] = useState(false)
  const [revealData, setRevealData] = useState<{
    briScore: number
    currentValue: number
    potentialValue: number
    valueGap: number
    categoryGapBreakdown: Array<{
      category: string
      label: string
      score: number
      gapAmount: number
      gapPercent: number
    }>
  } | null>(null)

  // Persist companyId to sessionStorage when it changes
  useEffect(() => {
    if (createdCompanyId) {
      sessionStorage.setItem('onboarding_companyId', createdCompanyId)
    }
  }, [createdCompanyId])

  // Persist previewData to sessionStorage when it changes
  useEffect(() => {
    if (industryPreviewData) {
      sessionStorage.setItem('onboarding_previewData', JSON.stringify(industryPreviewData))
    }
  }, [industryPreviewData])

  // Persist businessDescription to sessionStorage when it changes
  useEffect(() => {
    if (businessDescription) {
      sessionStorage.setItem('onboarding_businessDescription', businessDescription)
    }
  }, [businessDescription])

  // Check for pending company name from signup (localStorage)
  useEffect(() => {
    const pendingCompanyName = localStorage.getItem('pendingCompanyName')
    if (pendingCompanyName) {
      setFormData(prev => ({ ...prev, name: pendingCompanyName }))
      localStorage.removeItem('pendingCompanyName')
    }
  }, [])

  // Restore form data from sessionStorage on mount
  useEffect(() => {
    const storedFormData = sessionStorage.getItem('onboarding_formData')
    if (storedFormData) {
      try {
        const parsed = JSON.parse(storedFormData)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save form data to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('onboarding_formData', JSON.stringify(formData))
  }, [formData])

  // Validate step access - redirect to step 1 if trying to access step 5+ without companyId
  useEffect(() => {
    if (currentStep >= 5 && !createdCompanyId) {
      router.replace('/onboarding')
    }
  }, [currentStep, createdCompanyId, router])

  const updateFormData = (updates: Partial<CompanyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Navigate to a specific step using URL
  const goToStep = useCallback((step: number) => {
    if (step === 1) {
      router.replace('/onboarding')
    } else {
      router.replace(`/onboarding?step=${step}`)
    }
  }, [router])

  // Create company after step 2
  const createCompany = async (): Promise<{
    companyId: string
    previewData: typeof industryPreviewData
  } | null> => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Try to sync the user (non-fatal if it fails)
      try {
        const syncResponse = await fetch('/api/user/sync', { method: 'POST' })
        if (!syncResponse.ok) {
          console.warn('User sync failed, continuing with company creation')
        }
      } catch (syncErr) {
        console.warn('User sync error:', syncErr)
      }

      const revenueSizeCategory = getRevenueSizeCategory(formData.annualRevenue)

      // Create the company with business profile data
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
          businessDescription: businessDescription || null,
          businessProfile: businessProfile || null,
          profileQuestionsAnswered: clarifyingAnswers && Object.keys(clarifyingAnswers).length > 0
            ? { answers: clarifyingAnswers, questions: clarifyingQuestions }
            : null,
        })
      })

      if (!companyResponse.ok) {
        const data = await companyResponse.json()
        throw new Error(data.error || 'Failed to create company')
      }

      const { company } = await companyResponse.json()
      setCreatedCompanyId(company.id)

      // Save core factors with defaults (Core Score = 1.0)
      const coreFactorsPayload = {
        revenueSizeCategory,
        revenueModel: 'SUBSCRIPTION_SAAS',
        laborIntensity: 'LOW',
        assetIntensity: 'ASSET_LIGHT',
        ownerInvolvement: 'MINIMAL',
        grossMarginProxy: 'EXCELLENT',
      }

      await fetch(`/api/companies/${company.id}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coreFactorsPayload)
      })

      // Fetch industry preview data
      let previewData: typeof industryPreviewData = null
      const dashboardResponse = await fetch(`/api/companies/${company.id}/dashboard`)
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        const tier1 = dashboardData.tier1 || {}

        // Calculate valuation range based on industry multiples
        const multipleLow = tier1.industryMultipleLow || 3.0
        const multipleHigh = tier1.industryMultipleHigh || 6.0
        const estimatedEbitda = tier1.adjustedEbitda || (formData.annualRevenue * 0.1) // 10% margin estimate

        const valuationLow = estimatedEbitda * multipleLow
        const valuationHigh = estimatedEbitda * multipleHigh
        const potentialGap = Math.round(valuationHigh * 0.35) // ~35% gap potential

        previewData = {
          valuationLow: Math.round(valuationLow),
          valuationHigh: Math.round(valuationHigh),
          potentialGap,
          industryName: formData.icbSubSector.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        }
        setIndustryPreviewData(previewData)
      }

      // Set company as selected
      setSelectedCompanyId(company.id)
      await refreshCompanies()

      return { companyId: company.id, previewData }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle next step
  const handleNext = async () => {
    if (currentStep === 4) {
      // Create company before moving to step 5 (preview)
      const result = await createCompany()
      if (result) {
        goToStep(5)
      }
    } else if (currentStep < STEPS.length) {
      goToStep(currentStep + 1)
    }
  }

  // Handle clarifying questions completion - generate profile
  const handleClarifyingComplete = async (
    answers: Record<string, string>,
    questions: ClarifyingQuestion[]
  ) => {
    setClarifyingAnswers(answers)
    setClarifyingQuestions(questions)

    // Generate business profile if we have answers
    if (Object.keys(answers).length > 0) {
      try {
        const response = await fetch('/api/profile/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessDescription,
            industry: formData.icbSubSector,
            revenueRange: getRevenueSizeCategory(formData.annualRevenue || 500000),
            clarifyingAnswers: answers,
            clarifyingQuestions: questions,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setBusinessProfile(data.profile)
        }
      } catch (err) {
        console.error('Failed to generate profile:', err)
      }
    }

    goToStep(4) // Move to revenue step
  }

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    // Skip to dashboard with incomplete state
    localStorage.setItem('onboardingSkipped', 'true')
    // Clear session storage
    sessionStorage.removeItem('onboarding_companyId')
    sessionStorage.removeItem('onboarding_previewData')
    sessionStorage.removeItem('onboarding_formData')
    sessionStorage.removeItem('onboarding_businessDescription')
    router.push('/dashboard')
  }

  const handleAssessmentComplete = async (data: {
    briScore: number
    currentValue: number
    potentialValue: number
    valueGap: number
    categoryScores: Array<{ category: string; score: number }>
    tasksCreated: number
    topTask: { id: string; title: string; description: string; category: string; estimatedValue: number } | null
  }) => {
    const CATEGORY_LABELS: Record<string, string> = {
      FINANCIAL: 'Financial Health',
      TRANSFERABILITY: 'Transferability',
      OPERATIONAL: 'Operations',
      MARKET: 'Market Position',
      LEGAL_TAX: 'Legal & Tax',
      PERSONAL: 'Personal Readiness',
    }

    // Calculate value gap attribution by category
    // Formula: weight × (100 - score) / 100 for each category
    // Then normalize to actual value gap
    const categoryGapContributions = data.categoryScores.map(cs => {
      const weight = DEFAULT_BRI_WEIGHTS[cs.category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
      const roomForImprovement = (100 - cs.score) / 100
      return {
        category: cs.category,
        label: CATEGORY_LABELS[cs.category] || cs.category,
        score: cs.score,
        weightedGap: weight * roomForImprovement,
      }
    })

    // Sum of all weighted gaps
    const totalWeightedGap = categoryGapContributions.reduce((sum, c) => sum + c.weightedGap, 0)

    // Calculate each category's share of the actual value gap
    const categoryGapBreakdown = categoryGapContributions.map(c => ({
      category: c.category,
      label: c.label,
      score: c.score,
      gapAmount: totalWeightedGap > 0
        ? Math.round((c.weightedGap / totalWeightedGap) * data.valueGap)
        : 0,
      gapPercent: totalWeightedGap > 0
        ? Math.round((c.weightedGap / totalWeightedGap) * 100)
        : 0,
    }))
    // Sort by gap amount descending (biggest impact first)
    .sort((a, b) => b.gapAmount - a.gapAmount)

    setRevealData({
      briScore: data.briScore,
      currentValue: data.currentValue,
      potentialValue: data.potentialValue,
      valueGap: data.valueGap,
      categoryGapBreakdown,
    })
    setAssessmentComplete(true)
    goToStep(5)
  }

  const handleComplete = async () => {
    // Send the onboarding complete email (non-blocking)
    if (createdCompanyId && revealData) {
      fetch('/api/email/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: createdCompanyId,
          currentValue: revealData.currentValue,
          potentialValue: revealData.potentialValue,
          valueGap: revealData.valueGap,
          briScore: revealData.briScore,
          categoryGapBreakdown: revealData.categoryGapBreakdown,
        }),
      }).catch(err => {
        console.error('Failed to send onboarding email:', err)
      })
    }

    // Clear onboarding state
    localStorage.removeItem('onboardingSkipped')
    sessionStorage.removeItem('onboarding_companyId')
    sessionStorage.removeItem('onboarding_previewData')
    sessionStorage.removeItem('onboarding_formData')
    sessionStorage.removeItem('onboarding_businessDescription')

    // Go to action plan to start the improvement journey
    router.push('/dashboard/action-plan')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.icbIndustry && formData.icbSuperSector && formData.icbSector && formData.icbSubSector
      case 2:
        return businessDescription.length >= 20 // Minimum 20 chars for description
      case 3:
        return true // Clarifying questions handle their own validation
      case 4:
        return formData.annualRevenue > 0
      case 5:
        return true // Can always proceed from preview
      case 6:
        return assessmentComplete
      case 7:
        return true
      default:
        return false
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep formData={formData} updateFormData={updateFormData} />
      case 2:
        return (
          <BusinessDescriptionStep
            companyName={formData.name}
            businessDescription={businessDescription}
            onDescriptionChange={setBusinessDescription}
          />
        )
      case 3:
        return (
          <ClarifyingQuestionsStep
            companyName={formData.name}
            businessDescription={businessDescription}
            industry={formData.icbSubSector}
            revenueRange={getRevenueSizeCategory(formData.annualRevenue || 500000)}
            onComplete={handleClarifyingComplete}
            onSkip={() => goToStep(4)}
          />
        )
      case 4:
        return <RevenueStep formData={formData} updateFormData={updateFormData} />
      case 5:
        return industryPreviewData ? (
          <IndustryPreviewStep
            companyName={formData.name}
            industryName={industryPreviewData.industryName}
            valuationLow={industryPreviewData.valuationLow}
            valuationHigh={industryPreviewData.valuationHigh}
            potentialGap={industryPreviewData.potentialGap}
            onContinue={() => goToStep(6)}
            onSkip={handleSkip}
          />
        ) : null
      case 6:
        return createdCompanyId ? (
          <RiskAssessmentStep
            companyId={createdCompanyId}
            companyName={formData.name}
            onComplete={handleAssessmentComplete}
            onSkip={handleSkip}
          />
        ) : null
      case 7:
        return revealData ? (
          <ValuationRevealStep
            companyName={formData.name}
            briScore={revealData.briScore}
            currentValue={revealData.currentValue}
            potentialValue={revealData.potentialValue}
            valueGap={revealData.valueGap}
            categoryGapBreakdown={revealData.categoryGapBreakdown}
            onComplete={handleComplete}
          />
        ) : null
      default:
        return null
    }
  }

  // Steps 3 (clarifying) and 5-7 handle their own navigation
  const showNavigation = currentStep === 1 || currentStep === 2 || currentStep === 4

  return (
    <div className="min-h-screen overflow-y-auto">
      {/* Minimal header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-display text-foreground">
              Exit<span className="text-primary">OS</span><span className="text-muted-foreground text-lg">x</span>
            </span>
          </div>

          {/* Progress indicator for steps 1-4 */}
          {currentStep <= 4 && (
            <div className="flex items-center gap-2">
              {STEPS.slice(0, 4).map((step) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step.id === currentStep
                      ? 'w-6 bg-primary'
                      : step.id < currentStep
                        ? 'bg-primary'
                        : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-8 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Welcome message for step 1 */}
          {currentStep === 1 && userName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl font-bold text-foreground font-display">
                Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-2">
                Let&apos;s discover what your business could be worth.
              </p>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {(currentStep <= 4) ? (
                <div className="bg-card rounded-2xl border border-border shadow-xl p-6 sm:p-8">
                  {renderStep()}
                </div>
              ) : (
                renderStep()
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation for steps 1-2 */}
          {showNavigation && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
                className={currentStep === 1 ? 'invisible' : ''}
              >
                Back
              </Button>

              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="px-8"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Creating...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          )}

          {/* Security footer */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <span>Enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
