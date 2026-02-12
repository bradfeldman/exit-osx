'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { BasicInfoStep } from '@/components/company/steps/BasicInfoStep'
import { RevenueStep } from '@/components/company/steps/RevenueStep'
import type { CompanyFormData } from '@/components/company/CompanySetupWizard'
import { IndustryPreviewStep } from './steps/IndustryPreviewStep'
import { QuickScanStep, type QuickScanResults } from './steps/QuickScanStep'
import { RiskResultsStep } from './steps/RiskResultsStep'
import { DeepDiveStep } from './steps/DeepDiveStep'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateValuationFromPercentages } from '@/lib/valuation/calculate-valuation'

// Onboarding step definitions - Streamlined Dan/Alex flow
const STEPS = [
  { id: 1, key: 'company', title: 'Your Business' },        // Company name + description + industry
  { id: 2, key: 'revenue', title: 'Revenue' },              // Annual revenue input
  { id: 3, key: 'preview', title: 'Value Range' },          // Valuation preview (creates company)
  { id: 4, key: 'quickscan', title: 'Buyer Scan' },         // 8 binary buyer-neutral questions
  { id: 5, key: 'results', title: 'Risk Results' },         // Show value gap + breakdown
  { id: 6, key: 'deepdive', title: 'Deep Dive' },             // Optional 6-category deep assessment
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

  // Business description state (used for industry matching + risk-focused AI questions)
  const [businessDescription, setBusinessDescription] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return sessionStorage.getItem('onboarding_businessDescription') || ''
  })

  // Risk assessment results for new steps
  const [riskResults, setRiskResults] = useState<{
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
    currentValue: number
    potentialValue: number
    valueGap: number
  } | null>(null)
  const [_riskQuestionAnswers, _setRiskQuestionAnswers] = useState<Record<string, string>>({})
  const [_generatedTasks, _setGeneratedTasks] = useState<Array<{
    id: string
    title: string
    description: string
    category: string
    estimatedValue: number
  }>>([])
  const [_assessmentId, _setAssessmentId] = useState<string | null>(null)

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
    // Additional fields for correct valuation calculation
    adjustedEbitda: number
    multipleLow: number
    multipleHigh: number
  } | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = sessionStorage.getItem('onboarding_previewData')
    return stored ? JSON.parse(stored) : null
  })

  const [quickScanComplete, setQuickScanComplete] = useState(false)

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

  // Clear stale sessionStorage when landing on step 1 (fresh start)
  useEffect(() => {
    if (currentStep === 1 && !createdCompanyId) {
      // User is on step 1 without a company - clear any stale onboarding data
      sessionStorage.removeItem('onboarding_companyId')
      sessionStorage.removeItem('onboarding_previewData')
      sessionStorage.removeItem('onboarding_formData')
      sessionStorage.removeItem('onboarding_businessDescription')
    }
  }, [currentStep, createdCompanyId])

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

  // Validate step access - redirect to step 1 if trying to access step 4+ without companyId
  useEffect(() => {
    if (currentStep >= 4 && !createdCompanyId) {
      router.replace('/onboarding')
    }
  }, [currentStep, createdCompanyId, router])

  // Recovery: re-fetch valuation data if step 3 is reached without previewData
  useEffect(() => {
    if (currentStep === 3 && !industryPreviewData && createdCompanyId) {
      const fetchPreviewData = async () => {
        try {
          const valuationResponse = await fetch(`/api/companies/${createdCompanyId}/initial-valuation`)
          if (valuationResponse.ok) {
            const valuationData = await valuationResponse.json()
            setIndustryPreviewData({
              valuationLow: valuationData.valuationLow,
              valuationHigh: valuationData.valuationHigh,
              potentialGap: 0,
              industryName: valuationData.industryName,
              adjustedEbitda: valuationData.adjustedEbitda,
              multipleLow: valuationData.multipleLow,
              multipleHigh: valuationData.multipleHigh,
            })
          }
        } catch (err) {
          console.error('[ONBOARDING] Failed to recover preview data:', err)
        }
      }
      fetchPreviewData()
    }
  }, [currentStep, industryPreviewData, createdCompanyId])

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

      // Create the company with business description (profile generated later from risk diagnosis)
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

      // Fetch initial valuation from industry multiples table
      // Uses lightweight endpoint that doesn't require complex permission checks
      let previewData: typeof industryPreviewData = null
      try {
        const valuationResponse = await fetch(`/api/companies/${company.id}/initial-valuation`)
        if (valuationResponse.ok) {
          const valuationData = await valuationResponse.json()

          previewData = {
            valuationLow: valuationData.valuationLow,
            valuationHigh: valuationData.valuationHigh,
            potentialGap: 0, // No gap calculation at this stage
            industryName: valuationData.industryName,
            adjustedEbitda: valuationData.adjustedEbitda,
            multipleLow: valuationData.multipleLow,
            multipleHigh: valuationData.multipleHigh,
          }
          setIndustryPreviewData(previewData)
        } else {
          const errorData = await valuationResponse.json().catch(() => ({}))
          console.error('[ONBOARDING] Initial valuation API failed:', valuationResponse.status, errorData)
        }
      } catch (err) {
        console.error('[ONBOARDING] Initial valuation fetch error:', err)
      }

      // This should not happen if API is working, but provide fallback for resilience
      if (!previewData) {
        console.error('[ONBOARDING] Failed to get valuation data - using emergency fallback')
        const estimatedEbitda = formData.annualRevenue * 0.10
        previewData = {
          valuationLow: Math.round(estimatedEbitda * 3.5),
          valuationHigh: Math.round(estimatedEbitda * 5.5),
          potentialGap: 0,
          industryName: formData.icbSubSector.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          adjustedEbitda: estimatedEbitda,
          multipleLow: 3.5,
          multipleHigh: 5.5,
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
    if (currentStep === 2) {
      // Create company before moving to step 3 (value preview)
      const result = await createCompany()
      if (result) {
        goToStep(3)
      }
    } else if (currentStep < STEPS.length) {
      goToStep(currentStep + 1)
    }
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

  const handleQuickScanComplete = async (scanResults: QuickScanResults) => {
    // Calculate category scores based on quick scan risks (as decimals 0-1)
    const categoryScoresObj: Record<string, number> = {
      FINANCIAL: 0.70,
      TRANSFERABILITY: 0.70,
      OPERATIONAL: 0.70,
      MARKET: 0.70,
      LEGAL_TAX: 0.70,
      PERSONAL: 0.70,
    }

    // Reduce scores for identified risks (reduce by 0.25, min 0.30)
    scanResults.risksIdentified.forEach(risk => {
      if (categoryScoresObj[risk.category] !== undefined) {
        categoryScoresObj[risk.category] = Math.max(0.30, categoryScoresObj[risk.category] - 0.25)
      }
    })

    // Calculate BRI from weighted category scores (MUST match improve-snapshot-for-task.ts)
    // This ensures consistency between onboarding and task completion recalculations
    let briScore = 0
    for (const [category, score] of Object.entries(categoryScoresObj)) {
      const weight = DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
      briScore += score * weight
    }

    // Use the canonical non-linear valuation formula
    // Core Score is 1.0 for onboarding (all optimal defaults)
    const coreScore = 1.0
    const adjustedEbitda = industryPreviewData?.adjustedEbitda || formData.annualRevenue * 0.10
    const multipleLow = industryPreviewData?.multipleLow || 3.0
    const multipleHigh = industryPreviewData?.multipleHigh || 6.0

    // Calculate valuation using the shared utility (non-linear formula)
    // briScore is now a decimal 0-1, so multiply by 100 for the percentage version
    const valuation = calculateValuationFromPercentages({
      adjustedEbitda,
      industryMultipleLow: multipleLow,
      industryMultipleHigh: multipleHigh,
      coreScore,
      briScorePercent: briScore * 100,
    })

    const currentValue = Math.round(valuation.currentValue)
    const potentialValue = Math.round(valuation.potentialValue)
    const valueGap = Math.round(valuation.valueGap)

    // Calculate value gap attribution by category (categoryScoresObj is already 0-1 decimals)
    const valueGapByCategory: Record<string, number> = {}
    const totalWeightedGap = Object.entries(categoryScoresObj).reduce((sum, [category, score]) => {
      const weight = DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
      return sum + weight * (1 - score)
    }, 0)

    Object.entries(categoryScoresObj).forEach(([category, score]) => {
      const weight = DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
      const roomForImprovement = 1 - score
      valueGapByCategory[category] = totalWeightedGap > 0
        ? Math.round((weight * roomForImprovement / totalWeightedGap) * valueGap)
        : 0
    })

    // Convert category scores to percentages for display (0-100 scale)
    const categoryScoresPercent: Record<string, number> = {}
    for (const [category, score] of Object.entries(categoryScoresObj)) {
      categoryScoresPercent[category] = Math.round(score * 100)
    }

    const riskResultsData = {
      briScore: Math.round(briScore * 100), // Convert to percentage for display
      categoryScores: categoryScoresPercent,
      valueGapByCategory,
      currentValue,
      potentialValue,
      valueGap,
    }

    setRiskResults(riskResultsData)

    // Create snapshot IMMEDIATELY so it exists when tasks are generated in DeepDiveStep
    // This is critical for accurate task value calculations
    if (createdCompanyId) {
      try {
        await fetch(`/api/companies/${createdCompanyId}/onboarding-snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // PROD-063: Only send raw inputs — server recalculates all valuation values
          body: JSON.stringify({
            briScore: riskResultsData.briScore,
            categoryScores: riskResultsData.categoryScores,
          }),
        })
        console.log('[ONBOARDING] Snapshot created after quick scan for task value calculation')
      } catch (err) {
        console.error('[ONBOARDING] Failed to create snapshot after quick scan:', err)
      }
    }

    setQuickScanComplete(true)
    goToStep(5) // Go to Risk Results step
  }

  const handleComplete = async () => {
    console.log('[ONBOARDING] handleComplete called, createdCompanyId:', createdCompanyId, 'riskResults:', !!riskResults)

    // Note: Snapshot was already created in handleQuickScanComplete for task value calculation
    // Tasks are generated in DeepDiveStep before this is called
    // We just need to send the completion email here
    if (createdCompanyId && riskResults) {
      console.log('[ONBOARDING] Completing onboarding with values:', {
        briScore: riskResults.briScore,
        currentValue: riskResults.currentValue,
        potentialValue: riskResults.potentialValue,
        valueGap: riskResults.valueGap,
      })
      // Build topRisks from categoryScores (find lowest scoring categories)
      const CATEGORY_LABELS: Record<string, string> = {
        FINANCIAL: 'Financial Health',
        TRANSFERABILITY: 'Transferability',
        OPERATIONAL: 'Operations',
        MARKET: 'Market Position',
        LEGAL_TAX: 'Legal & Tax',
        PERSONAL: 'Personal Readiness',
      }

      const topRisks = Object.entries(riskResults.categoryScores)
        .filter(([cat]) => cat !== 'PERSONAL')
        .map(([cat, score]) => ({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          score: score as number,
        }))
        .sort((a, b) => a.score - b.score)

      // Send the onboarding complete email (non-blocking)
      fetch('/api/email/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: createdCompanyId,
          currentValue: riskResults.currentValue,
          potentialValue: riskResults.potentialValue,
          valueGap: riskResults.valueGap,
          briScore: riskResults.briScore,
          categoryScores: riskResults.categoryScores,
          topRisks,
        }),
      }).catch(err => {
        console.error('Failed to send onboarding email:', err)
      })
    } else {
      console.warn('[ONBOARDING] Skipping email - missing data:', {
        hasCompanyId: !!createdCompanyId,
        hasRiskResults: !!riskResults,
      })
    }

    // Clear onboarding state
    localStorage.removeItem('onboardingSkipped')
    sessionStorage.removeItem('onboarding_companyId')
    sessionStorage.removeItem('onboarding_previewData')
    sessionStorage.removeItem('onboarding_formData')
    sessionStorage.removeItem('onboarding_businessDescription')

    // Navigate to dashboard — PlatformTour auto-triggers there and ends with "See Your First Move" → Actions
    router.push('/dashboard')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Company name + industry + business description (min 20 chars)
        return formData.name &&
               formData.icbIndustry &&
               formData.icbSuperSector &&
               formData.icbSector &&
               formData.icbSubSector &&
               businessDescription.length >= 20
      case 2:
        return formData.annualRevenue > 0
      case 3:
        return true // Can always proceed from value preview
      case 4:
        return quickScanComplete // Quick scan completed
      case 5:
        return !!riskResults // Need risk results to proceed
      case 6:
        return true // Deep dive is always skippable
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
      case 3:
        return industryPreviewData ? (
          <IndustryPreviewStep
            companyName={formData.name}
            industryName={industryPreviewData.industryName}
            valuationLow={industryPreviewData.valuationLow}
            valuationHigh={industryPreviewData.valuationHigh}
            potentialGap={industryPreviewData.potentialGap}
            onContinue={() => goToStep(4)}
            onSkip={handleSkip}
          />
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )
      case 4:
        return createdCompanyId ? (
          <QuickScanStep
            companyId={createdCompanyId}
            companyName={formData.name}
            onComplete={handleQuickScanComplete}
            onSkip={handleSkip}
          />
        ) : null
      case 5:
        return riskResults ? (
          <RiskResultsStep
            companyName={formData.name}
            riskResults={riskResults}
            onContinue={() => goToStep(6)}
          />
        ) : null
      case 6:
        return createdCompanyId && riskResults ? (
          <DeepDiveStep
            companyId={createdCompanyId}
            riskResults={riskResults}
            onFinish={() => handleComplete()}
          />
        ) : null
      default:
        return null
    }
  }

  // Steps 3-7 handle their own navigation (preview, assessment, results, questions, tasks)
  const showNavigation = currentStep === 1 || currentStep === 2

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

          {/* Progress indicator for steps 1-3 (before assessment) */}
          {currentStep <= 3 && (
            <div className="flex items-center gap-2">
              {STEPS.slice(0, 3).map((step) => (
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
              {(currentStep <= 2) ? (
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
