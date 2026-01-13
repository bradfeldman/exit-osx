'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './StepIndicator'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { FinancialsStep } from './steps/FinancialsStep'
import { CoreFactorsStep } from './steps/CoreFactorsStep'
import { AdjustmentsStep } from './steps/AdjustmentsStep'

export interface CompanyFormData {
  // Step 1: Basic Info
  name: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  // Step 2: Financials
  annualRevenue: number
  annualEbitda: number
  ownerCompensation: number
  // Step 3: Core Factors
  revenueSizeCategory: string
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
  // Step 4: Adjustments
  adjustments: Array<{
    description: string
    amount: number
    type: 'ADD_BACK' | 'DEDUCTION'
  }>
}

const initialFormData: CompanyFormData = {
  name: '',
  icbIndustry: '',
  icbSuperSector: '',
  icbSector: '',
  icbSubSector: '',
  annualRevenue: 0,
  annualEbitda: 0,
  ownerCompensation: 0,
  revenueSizeCategory: '',
  revenueModel: '',
  grossMarginProxy: '',
  laborIntensity: '',
  assetIntensity: '',
  ownerInvolvement: '',
  adjustments: []
}

const steps = [
  { id: 1, title: 'Company Info', description: 'Basic details' },
  { id: 2, title: 'Financials', description: 'Revenue & EBITDA' },
  { id: 3, title: 'Business Profile', description: 'Core factors' },
  { id: 4, title: 'Adjustments', description: 'EBITDA add-backs' },
]

export function CompanySetupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFormData = (updates: Partial<CompanyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length))
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // First sync the user to ensure they exist in the database
      const syncResponse = await fetch('/api/user/sync', { method: 'POST' })
      if (!syncResponse.ok) {
        throw new Error('Failed to sync user')
      }

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
          annualEbitda: formData.annualEbitda,
          ownerCompensation: formData.ownerCompensation,
        })
      })

      if (!companyResponse.ok) {
        const data = await companyResponse.json()
        throw new Error(data.error || 'Failed to create company')
      }

      const { company } = await companyResponse.json()

      // Save core factors
      const coreFactorsResponse = await fetch(`/api/companies/${company.id}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenueSizeCategory: formData.revenueSizeCategory,
          revenueModel: formData.revenueModel,
          grossMarginProxy: formData.grossMarginProxy,
          laborIntensity: formData.laborIntensity,
          assetIntensity: formData.assetIntensity,
          ownerInvolvement: formData.ownerInvolvement,
        })
      })

      if (!coreFactorsResponse.ok) {
        console.error('Failed to save core factors')
      }

      // Save adjustments
      for (const adjustment of formData.adjustments) {
        await fetch(`/api/companies/${company.id}/adjustments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adjustment)
        })
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep formData={formData} updateFormData={updateFormData} />
      case 2:
        return <FinancialsStep formData={formData} updateFormData={updateFormData} />
      case 3:
        return <CoreFactorsStep formData={formData} updateFormData={updateFormData} />
      case 4:
        return <AdjustmentsStep formData={formData} updateFormData={updateFormData} />
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
        return formData.revenueSizeCategory && formData.revenueModel && formData.grossMarginProxy && formData.laborIntensity && formData.assetIntensity && formData.ownerInvolvement
      case 4:
        return true // Adjustments are optional
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          {renderStep()}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Back
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()}>
            {isSubmitting ? 'Creating...' : 'Complete Setup'}
          </Button>
        )}
      </div>
    </div>
  )
}
