'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './StepIndicator'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { RevenueStep } from './steps/RevenueStep'
import { BusinessProfileStep } from './steps/BusinessProfileStep'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/utils'

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

const steps = [
  { id: 1, title: 'Company Info', description: 'Name & industry' },
  { id: 2, title: 'Revenue', description: 'Annual revenue' },
  { id: 3, title: 'Business Profile', description: 'Core factors' },
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [newCompanyId, setNewCompanyId] = useState<string | null>(null)

  const updateFormData = (updates: Partial<CompanyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Fire confetti when celebration shows
  useEffect(() => {
    if (showCelebration) {
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#B87333', '#3D3D3D', '#FFD700']
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#B87333', '#3D3D3D', '#FFD700']
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#B87333', '#3D3D3D', '#FFD700', '#FFFFFF']
      })

      frame()
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

      // Save core factors (grossMarginProxy is set later in Baseline Assessment)
      const coreFactorsPayload: Record<string, string> = {
        revenueSizeCategory,
        revenueModel: formData.revenueModel,
        laborIntensity: formData.laborIntensity,
        assetIntensity: formData.assetIntensity,
        ownerInvolvement: formData.ownerInvolvement,
      }
      // Only include grossMarginProxy if it was set (for backwards compatibility)
      if (formData.grossMarginProxy) {
        coreFactorsPayload.grossMarginProxy = formData.grossMarginProxy
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

      // Save the new company ID and show celebration
      setNewCompanyId(company.id)
      setShowCelebration(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
        return <BasicInfoStep formData={formData} updateFormData={updateFormData} />
      case 2:
        return <RevenueStep formData={formData} updateFormData={updateFormData} />
      case 3:
        return <BusinessProfileStep formData={formData} updateFormData={updateFormData} />
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
      case 3:
        return formData.revenueModel && formData.laborIntensity && formData.assetIntensity && formData.ownerInvolvement
      default:
        return false
    }
  }

  // Celebration screen
  if (showCelebration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
        {/* Success animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-2">
          You&apos;re All Set!
        </h1>
        <p className="text-lg text-muted-foreground mb-1 max-w-md">
          Your company profile for <span className="font-semibold text-foreground">{formData.name}</span>
          <br />has been created.
        </p>
        <p className="text-sm text-muted-foreground max-w-lg mb-8">
          Head to your dashboard to see your preliminary valuation.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          onClick={handleContinueToDashboard}
          className="text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all"
        >
          <span>Go to Dashboard</span>
          <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Form Container */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="min-h-[400px]">
          {renderStep()}
        </div>
      </div>

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
