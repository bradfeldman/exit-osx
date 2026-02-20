'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { LogOut, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/contexts/CompanyContext'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import { calculateValuationFromPercentages } from '@/lib/valuation/calculate-valuation'
import { CompanyBasicsStep } from './streamlined-steps/CompanyBasicsStep'
import { FinancialQuickScanStep } from './streamlined-steps/FinancialQuickScanStep'
import { RiskAssessmentStep } from './streamlined-steps/RiskAssessmentStep'
import { ReadinessSummaryStep } from './streamlined-steps/ReadinessSummaryStep'

// Streamlined 4-step flow
const STEPS = [
  { id: 1, key: 'basics', title: 'Company Basics', description: 'Tell us about your business' },
  { id: 2, key: 'financials', title: 'Financial Quick Scan', description: 'Revenue and key metrics' },
  { id: 3, key: 'assessment', title: 'Risk Assessment', description: '7 buyer-focused questions' },
  { id: 4, key: 'summary', title: 'Your Exit Readiness', description: 'See your score and next steps' },
]

interface OnboardingState {
  // Step 1: Company Basics
  companyName: string
  businessDescription: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string

  // Step 2: Financial Quick Scan
  annualRevenue: number
  revenueRange: string
  ebitdaEstimate: number
  employeeCount: number
  yearsInBusiness: number

  // Step 3: Risk Assessment
  riskAnswers: Record<string, boolean>

  // Calculated values
  briScore: number
  categoryScores: Record<string, number>
  currentValue: number
  potentialValue: number
  valueGap: number

  // Backend references
  companyId: string | null
  createdTasks: Array<{ id: string; title: string }>
}

const initialState: OnboardingState = {
  companyName: '',
  businessDescription: '',
  icbIndustry: '',
  icbSuperSector: '',
  icbSector: '',
  icbSubSector: '',
  annualRevenue: 0,
  revenueRange: '',
  ebitdaEstimate: 0,
  employeeCount: 0,
  yearsInBusiness: 0,
  riskAnswers: {},
  briScore: 0,
  categoryScores: {},
  currentValue: 0,
  potentialValue: 0,
  valueGap: 0,
  companyId: null,
  createdTasks: [],
}

interface StreamlinedOnboardingFlowProps {
  userName?: string
}

export function StreamlinedOnboardingFlow({ userName }: StreamlinedOnboardingFlowProps) {
  const router = useRouter()
  const { refreshCompanies, setSelectedCompanyId } = useCompany()

  const [currentStep, setCurrentStep] = useState(1)
  const [state, setState] = useState<OnboardingState>(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('streamlined_onboarding_state')
      if (stored) {
        try {
          return { ...initialState, ...JSON.parse(stored) }
        } catch {
          return initialState
        }
      }
    }
    return initialState
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingSteps, setProcessingSteps] = useState<Array<{ label: string; status: 'pending' | 'active' | 'complete' }>>([])
  const [showSlowMessage, setShowSlowMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for pending company name from signup
  useEffect(() => {
    const pendingCompanyName = localStorage.getItem('pendingCompanyName')
    if (pendingCompanyName && !state.companyName) {
      updateState({ companyName: pendingCompanyName })
      localStorage.removeItem('pendingCompanyName')
    }
  }, [])

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('streamlined_onboarding_state', JSON.stringify(state))
  }, [state])

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      sessionStorage.removeItem('streamlined_onboarding_state')
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  // Background processing for Step 1 -> 2 transition
  const processCompanyBasics = useCallback(async () => {
    if (state.companyId) return // Already processed

    setIsProcessing(true)
    setShowSlowMessage(false)
    setError(null)

    // Initialize steps
    const steps = [{ label: 'Analyzing your business', status: 'active' as const }]
    setProcessingSteps(steps)

    // Set timeout for slow message
    const slowTimeout = setTimeout(() => setShowSlowMessage(true), 5000)

    try {
      // Sync user (non-fatal)
      try {
        await fetch('/api/user/sync', { method: 'POST' })
      } catch {
        console.warn('User sync failed, continuing')
      }

      // Industry already classified inline during Step 1
      // No additional AI processing needed here

      // Complete step
      setProcessingSteps([{ label: 'Analyzing your business', status: 'complete' }])
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief delay for UX

    } catch (err) {
      console.error('[ONBOARDING] Processing error:', err)
      setError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      clearTimeout(slowTimeout)
      setIsProcessing(false)
      setProcessingSteps([])
      setShowSlowMessage(false)
    }
  }, [state.companyId])

  // Background processing for Step 2 -> 3 transition
  const processFinancials = useCallback(async () => {
    if (state.companyId) return // Already created

    setIsProcessing(true)
    setShowSlowMessage(false)
    setError(null)

    // Initialize steps
    setProcessingSteps([
      { label: 'Creating your company profile', status: 'active' },
      { label: 'Setting up your financial model', status: 'pending' },
    ])

    // Set timeout for slow message
    const slowTimeout = setTimeout(() => setShowSlowMessage(true), 5000)

    try {
      // Determine revenue size category
      const getRevenueSizeCategory = (revenue: number): string => {
        if (revenue < 500000) return 'UNDER_500K'
        if (revenue < 1000000) return 'FROM_500K_TO_1M'
        if (revenue < 3000000) return 'FROM_1M_TO_3M'
        if (revenue < 10000000) return 'FROM_3M_TO_10M'
        if (revenue < 25000000) return 'FROM_10M_TO_25M'
        return 'OVER_25M'
      }

      const revenueSizeCategory = getRevenueSizeCategory(state.annualRevenue)

      // Create company
      const companyResponse = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.companyName,
          icbIndustry: state.icbIndustry,
          icbSuperSector: state.icbSuperSector,
          icbSector: state.icbSector,
          icbSubSector: state.icbSubSector,
          annualRevenue: state.annualRevenue,
          annualEbitda: state.ebitdaEstimate,
          ownerCompensation: 0,
          businessDescription: state.businessDescription || null,
        })
      })

      if (!companyResponse.ok) {
        const data = await companyResponse.json()
        throw new Error(data.error || 'Failed to create company')
      }

      const { company } = await companyResponse.json()
      updateState({ companyId: company.id })

      // Advance to step 2
      setProcessingSteps([
        { label: 'Creating your company profile', status: 'complete' },
        { label: 'Setting up your financial model', status: 'active' },
      ])

      // Save core factors with optimal defaults (Core Score = 1.0)
      await fetch(`/api/companies/${company.id}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenueSizeCategory,
          revenueModel: 'SUBSCRIPTION_SAAS',
          laborIntensity: 'LOW',
          assetIntensity: 'ASSET_LIGHT',
          ownerInvolvement: 'MINIMAL',
          grossMarginProxy: 'EXCELLENT',
        })
      })

      // Set company as selected
      setSelectedCompanyId(company.id)
      await refreshCompanies()

      // Complete all steps
      setProcessingSteps([
        { label: 'Creating your company profile', status: 'complete' },
        { label: 'Setting up your financial model', status: 'complete' },
      ])

    } catch (err) {
      console.error('[ONBOARDING] Company creation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create company')
      throw err
    } finally {
      clearTimeout(slowTimeout)
      setIsProcessing(false)
      setProcessingSteps([])
      setShowSlowMessage(false)
    }
  }, [state, updateState, setSelectedCompanyId, refreshCompanies])

  // Background processing for Step 3 -> 4 transition
  const processAssessment = useCallback(async () => {
    setIsProcessing(true)
    setShowSlowMessage(false)
    setError(null)

    // Initialize steps
    setProcessingSteps([
      { label: 'Analyzing your risk profile', status: 'active' },
      { label: 'Benchmarking industry peers', status: 'pending' },
      { label: 'Calculating your valuation range', status: 'pending' },
      { label: 'Building your action plan', status: 'pending' },
    ])

    // Set timeout for slow message
    const slowTimeout = setTimeout(() => setShowSlowMessage(true), 5000)

    try {
      // Calculate category scores from risk answers
      const categoryScoresObj: Record<string, number> = {
        FINANCIAL: 0.70,
        TRANSFERABILITY: 0.70,
        OPERATIONAL: 0.70,
        MARKET: 0.70,
        LEGAL_TAX: 0.70,
        PERSONAL: 0.70,
      }

      // Risk question mapping (simplified for streamlined flow)
      const riskCategoryMap: Record<string, string> = {
        'financial-1': 'FINANCIAL',
        'financial-2': 'FINANCIAL',
        'transferability-1': 'TRANSFERABILITY',
        'transferability-2': 'TRANSFERABILITY',
        'operational-1': 'OPERATIONAL',
        'legal-1': 'LEGAL_TAX',
        'market-1': 'MARKET',
      }

      // Reduce scores for identified risks
      Object.entries(state.riskAnswers).forEach(([questionId, answer]) => {
        const category = riskCategoryMap[questionId]
        if (category && categoryScoresObj[category] !== undefined) {
          // Risk is identified when answer is No (reduce score)
          if (!answer) {
            categoryScoresObj[category] = Math.max(0.30, categoryScoresObj[category] - 0.25)
          }
        }
      })

      // Calculate BRI from weighted category scores
      let briScore = 0
      for (const [category, score] of Object.entries(categoryScoresObj)) {
        const weight = DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
        briScore += score * weight
      }

      // Advance to step 2
      setProcessingSteps([
        { label: 'Analyzing your risk profile', status: 'complete' },
        { label: 'Benchmarking industry peers', status: 'active' },
        { label: 'Calculating your valuation range', status: 'pending' },
        { label: 'Building your action plan', status: 'pending' },
      ])

      // Get valuation data
      const valuationResponse = await fetch(`/api/companies/${state.companyId}/initial-valuation`)
      let multipleLow = 3.0
      let multipleHigh = 6.0
      let adjustedEbitda = state.annualRevenue * 0.10

      if (valuationResponse.ok) {
        const valuationData = await valuationResponse.json()
        multipleLow = valuationData.multipleLow
        multipleHigh = valuationData.multipleHigh
        adjustedEbitda = valuationData.adjustedEbitda
      }

      // Advance to step 3
      setProcessingSteps([
        { label: 'Analyzing your risk profile', status: 'complete' },
        { label: 'Benchmarking industry peers', status: 'complete' },
        { label: 'Calculating your valuation range', status: 'active' },
        { label: 'Building your action plan', status: 'pending' },
      ])

      // Calculate valuation using canonical formula
      const coreScore = 1.0
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

      // Convert category scores to percentages for display
      const categoryScoresPercent: Record<string, number> = {}
      for (const [category, score] of Object.entries(categoryScoresObj)) {
        categoryScoresPercent[category] = Math.round(score * 100)
      }

      updateState({
        briScore: Math.round(briScore * 100),
        categoryScores: categoryScoresPercent,
        currentValue,
        potentialValue,
        valueGap,
      })

      // Advance to step 4
      setProcessingSteps([
        { label: 'Analyzing your risk profile', status: 'complete' },
        { label: 'Benchmarking industry peers', status: 'complete' },
        { label: 'Calculating your valuation range', status: 'complete' },
        { label: 'Building your action plan', status: 'active' },
      ])

      // Create snapshot for task value calculation
      if (state.companyId) {
        await fetch(`/api/companies/${state.companyId}/onboarding-snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            briScore: Math.round(briScore * 100),
            categoryScores: categoryScoresPercent,
          }),
        })

        // Generate tasks
        const tasksResponse = await fetch('/api/tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: state.companyId,
            riskResults: {
              briScore: Math.round(briScore * 100),
              categoryScores: categoryScoresPercent,
              valueGapByCategory: {}, // Calculated on backend
            },
            riskQuestionAnswers: state.riskAnswers,
          }),
        })

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json()
          const tasks = tasksData.tasks || []
          updateState({
            createdTasks: tasks.slice(0, 3).map((t: { id: string; title: string }) => ({
              id: t.id,
              title: t.title,
            }))
          })
        }
      }

      // Complete all steps
      setProcessingSteps([
        { label: 'Analyzing your risk profile', status: 'complete' },
        { label: 'Benchmarking industry peers', status: 'complete' },
        { label: 'Calculating your valuation range', status: 'complete' },
        { label: 'Building your action plan', status: 'complete' },
      ])

    } catch (err) {
      console.error('[ONBOARDING] Assessment processing failed:', err)
      setError(err instanceof Error ? err.message : 'Assessment calculation failed')
      throw err
    } finally {
      clearTimeout(slowTimeout)
      setIsProcessing(false)
      setProcessingSteps([])
      setShowSlowMessage(false)
    }
  }, [state, updateState])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleNext = async () => {
    setError(null)

    try {
      if (currentStep === 1) {
        await processCompanyBasics()
        goToStep(2)
      } else if (currentStep === 2) {
        await processFinancials()
        goToStep(3)
      } else if (currentStep === 3) {
        await processAssessment()
        goToStep(4)
      }
    } catch {
      // Error already set in processing function
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    // Send onboarding complete email
    if (state.companyId) {
      const CATEGORY_LABELS: Record<string, string> = {
        FINANCIAL: 'Financial Health',
        TRANSFERABILITY: 'Transferability',
        OPERATIONAL: 'Operations',
        MARKET: 'Market Position',
        LEGAL_TAX: 'Legal & Tax',
        PERSONAL: 'Personal Readiness',
      }

      const topRisks = Object.entries(state.categoryScores)
        .filter(([cat]) => cat !== 'PERSONAL')
        .map(([cat, score]) => ({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          score: score as number,
        }))
        .sort((a, b) => a.score - b.score)

      fetch('/api/email/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: state.companyId,
          currentValue: state.currentValue,
          potentialValue: state.potentialValue,
          valueGap: state.valueGap,
          briScore: state.briScore,
          categoryScores: state.categoryScores,
          topRisks,
        }),
      }).catch(err => console.error('Failed to send onboarding email:', err))
    }

    // Clear onboarding state
    sessionStorage.removeItem('streamlined_onboarding_state')
    localStorage.removeItem('onboardingSkipped')

    // Navigate to dashboard
    router.push('/dashboard')
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(
          state.companyName &&
          state.businessDescription.length >= 20 &&
          state.icbIndustry &&
          state.icbSubSector
        )
      case 2:
        return state.annualRevenue > 0
      case 3:
        return Object.keys(state.riskAnswers).length === 7
      case 4:
        return true
      default:
        return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CompanyBasicsStep
            companyName={state.companyName}
            businessDescription={state.businessDescription}
            icbIndustry={state.icbIndustry}
            icbSuperSector={state.icbSuperSector}
            icbSector={state.icbSector}
            icbSubSector={state.icbSubSector}
            updateState={updateState}
          />
        )
      case 2:
        return (
          <FinancialQuickScanStep
            annualRevenue={state.annualRevenue}
            ebitdaEstimate={state.ebitdaEstimate}
            employeeCount={state.employeeCount}
            yearsInBusiness={state.yearsInBusiness}
            updateState={updateState}
          />
        )
      case 3:
        return (
          <RiskAssessmentStep
            riskAnswers={state.riskAnswers}
            updateState={updateState}
          />
        )
      case 4:
        return (
          <ReadinessSummaryStep
            companyName={state.companyName}
            briScore={state.briScore}
            currentValue={state.currentValue}
            potentialValue={state.potentialValue}
            valueGap={state.valueGap}
            categoryScores={state.categoryScores}
            topTasks={state.createdTasks}
            onComplete={handleComplete}
          />
        )
      default:
        return null
    }
  }

  const showNavigation = currentStep < 4
  const currentStepData = STEPS.find(s => s.id === currentStep)

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-display text-foreground">
              Exit<span className="text-primary">OS</span><span className="text-muted-foreground text-lg">x</span>
            </span>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all ${
                  step.id === currentStep
                    ? 'w-8 bg-primary'
                    : step.id < currentStep
                      ? 'w-2 bg-primary'
                      : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

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

      {/* Main Content */}
      <div className="pt-8 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Welcome (Step 1 only) */}
          {currentStep === 1 && userName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl font-bold text-foreground font-display">
                Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-2">
                Let&apos;s discover what your business could be worth in under 5 minutes.
              </p>
            </motion.div>
          )}

          {/* Step Title (Steps 2-4) */}
          {currentStep > 1 && currentStepData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                Step {currentStep} of {STEPS.length}
              </p>
              <h2 className="text-2xl font-bold text-foreground font-display">
                {currentStepData.title}
              </h2>
              <p className="text-muted-foreground mt-1">
                {currentStepData.description}
              </p>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Processing Overlay */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card rounded-2xl border border-border p-8 shadow-2xl max-w-md mx-4 w-full"
                >
                  {/* Step List */}
                  <div className="space-y-4">
                    {processingSteps.map((step, index) => (
                      <motion.div
                        key={`${index}-${step.label}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <AnimatePresence mode="wait">
                            {step.status === 'complete' ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                              </motion.div>
                            ) : step.status === 'active' ? (
                              <motion.div
                                key="spinner"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="pending"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Label */}
                        <p
                          className={`font-medium transition-colors ${
                            step.status === 'complete'
                              ? 'text-foreground'
                              : step.status === 'active'
                                ? 'text-foreground'
                                : 'text-muted-foreground/50'
                          }`}
                        >
                          {step.label}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Slow Message */}
                  <AnimatePresence>
                    {showSlowMessage && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-muted-foreground mt-6 text-center"
                      >
                        Almost there...
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {showNavigation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between mt-8"
            >
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || isProcessing}
                className={currentStep === 1 ? 'invisible' : ''}
              >
                Back
              </Button>

              <Button
                onClick={handleNext}
                disabled={!canProceed() || isProcessing}
                className="px-8"
              >
                {currentStep === 3 ? 'Calculate My Score' : 'Continue'}
              </Button>
            </motion.div>
          )}

          {/* Security Footer */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <span>Enterprise-grade security • Your data is never shared</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
