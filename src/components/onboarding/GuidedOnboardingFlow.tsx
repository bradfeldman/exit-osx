'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { BasicInfoStep } from '@/components/company/steps/BasicInfoStep'
import { RevenueStep } from '@/components/company/steps/RevenueStep'
import { IndustryPreviewStep } from './steps/IndustryPreviewStep'
import { RiskAssessmentStep } from './steps/RiskAssessmentStep'
import { ValuationRevealStep } from './steps/ValuationRevealStep'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

// Onboarding step definitions
const STEPS = [
  { id: 1, key: 'company', title: 'Your Business' },
  { id: 2, key: 'revenue', title: 'Revenue' },
  { id: 3, key: 'preview', title: 'Industry Preview' },
  { id: 4, key: 'assessment', title: 'Risk Discovery' },
  { id: 5, key: 'reveal', title: 'Your Valuation' },
]

interface CompanyFormData {
  name: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  annualRevenue: number
}

const initialFormData: CompanyFormData = {
  name: '',
  icbIndustry: '',
  icbSuperSector: '',
  icbSector: '',
  icbSubSector: '',
  annualRevenue: 0,
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

interface GuidedOnboardingFlowProps {
  userName?: string
  onComplete?: () => void
}

export function GuidedOnboardingFlow({ userName, onComplete }: GuidedOnboardingFlowProps) {
  const router = useRouter()
  const { refreshCompanies, setSelectedCompanyId } = useCompany()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null)
  const [industryPreviewData, setIndustryPreviewData] = useState<{
    valuationLow: number
    valuationHigh: number
    potentialGap: number
    industryName: string
  } | null>(null)
  const [assessmentComplete, setAssessmentComplete] = useState(false)
  const [revealData, setRevealData] = useState<{
    briScore: number
    currentValue: number
    potentialValue: number
    valueGap: number
    topRisks: Array<{ category: string; score: number; label: string }>
    tasksCreated: number
  } | null>(null)

  // Load company name from localStorage (set during signup)
  useEffect(() => {
    const pendingCompanyName = localStorage.getItem('pendingCompanyName')
    if (pendingCompanyName) {
      setFormData(prev => ({ ...prev, name: pendingCompanyName }))
      localStorage.removeItem('pendingCompanyName')
    }
  }, [])

  // Check for existing onboarding state
  useEffect(() => {
    const savedState = localStorage.getItem('onboardingState')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        if (state.step) setCurrentStep(state.step)
        if (state.formData) setFormData(state.formData)
        if (state.companyId) setCreatedCompanyId(state.companyId)
        if (state.industryPreviewData) setIndustryPreviewData(state.industryPreviewData)
      } catch (e) {
        console.error('Failed to restore onboarding state:', e)
      }
    }
  }, [])

  // Save onboarding state
  const saveState = useCallback(() => {
    const state = {
      step: currentStep,
      formData,
      companyId: createdCompanyId,
      industryPreviewData,
    }
    localStorage.setItem('onboardingState', JSON.stringify(state))
  }, [currentStep, formData, createdCompanyId, industryPreviewData])

  useEffect(() => {
    saveState()
  }, [saveState])

  const updateFormData = (updates: Partial<CompanyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Create company after step 2
  const createCompany = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // First sync the user
      const syncResponse = await fetch('/api/user/sync', { method: 'POST' })
      if (!syncResponse.ok) {
        throw new Error('Failed to sync user')
      }

      const revenueSizeCategory = getRevenueSizeCategory(formData.annualRevenue)

      // Create the company
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
        const midPoint = (valuationLow + valuationHigh) / 2
        const potentialGap = Math.round(valuationHigh * 0.35) // ~35% gap potential

        setIndustryPreviewData({
          valuationLow: Math.round(valuationLow),
          valuationHigh: Math.round(valuationHigh),
          potentialGap,
          industryName: formData.icbSubSector.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        })
      }

      // Set company as selected
      setSelectedCompanyId(company.id)
      await refreshCompanies()

      return company.id
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
      // Create company before moving to step 3
      const companyId = await createCompany()
      if (companyId) {
        setCurrentStep(3)
      }
    } else if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    // Skip to dashboard with incomplete state
    localStorage.setItem('onboardingSkipped', 'true')
    localStorage.removeItem('onboardingState')
    router.push('/dashboard')
  }

  const handleAssessmentComplete = async (data: {
    briScore: number
    currentValue: number
    potentialValue: number
    valueGap: number
    categoryScores: Array<{ category: string; score: number }>
    tasksCreated: number
  }) => {
    // Transform category scores to top risks
    const CATEGORY_LABELS: Record<string, string> = {
      FINANCIAL: 'Financial Health',
      TRANSFERABILITY: 'Transferability',
      OPERATIONAL: 'Operations',
      MARKET: 'Market Position',
      LEGAL_TAX: 'Legal & Tax',
      PERSONAL: 'Personal Readiness',
    }

    const topRisks = data.categoryScores
      .map(cs => ({
        category: cs.category,
        score: Math.round(cs.score * 100),
        label: CATEGORY_LABELS[cs.category] || cs.category,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)

    setRevealData({
      briScore: data.briScore,
      currentValue: data.currentValue,
      potentialValue: data.potentialValue,
      valueGap: data.valueGap,
      topRisks,
      tasksCreated: data.tasksCreated,
    })
    setAssessmentComplete(true)
    setCurrentStep(5)
  }

  const handleComplete = async () => {
    // Clear onboarding state
    localStorage.removeItem('onboardingState')
    localStorage.removeItem('onboardingSkipped')

    if (onComplete) {
      onComplete()
    } else {
      router.push('/dashboard')
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.icbIndustry && formData.icbSuperSector && formData.icbSector && formData.icbSubSector
      case 2:
        return formData.annualRevenue > 0
      case 3:
        return true // Can always proceed from preview
      case 4:
        return assessmentComplete
      case 5:
        return true
      default:
        return false
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep formData={formData} updateFormData={updateFormData} />
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
            onContinue={() => setCurrentStep(4)}
            onSkip={handleSkip}
          />
        ) : null
      case 4:
        return createdCompanyId ? (
          <RiskAssessmentStep
            companyId={createdCompanyId}
            companyName={formData.name}
            onComplete={handleAssessmentComplete}
            onSkip={handleSkip}
          />
        ) : null
      case 5:
        return revealData ? (
          <ValuationRevealStep
            companyName={formData.name}
            briScore={revealData.briScore}
            currentValue={revealData.currentValue}
            potentialValue={revealData.potentialValue}
            valueGap={revealData.valueGap}
            topRisks={revealData.topRisks}
            tasksCreated={revealData.tasksCreated}
            onComplete={handleComplete}
          />
        ) : null
      default:
        return null
    }
  }

  // Steps 3-5 handle their own navigation
  const showNavigation = currentStep <= 2

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Minimal header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-display text-foreground">
              Exit<span className="text-primary">OS</span><span className="text-muted-foreground text-lg">x</span>
            </span>
          </div>

          {/* Progress indicator for steps 1-2 */}
          {currentStep <= 2 && (
            <div className="flex items-center gap-2">
              {STEPS.slice(0, 2).map((step) => (
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
      <div className="pt-20 pb-12 px-4">
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
              {currentStep <= 2 ? (
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
