'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Types
interface CoreFactors {
  revenueSizeCategory: string
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
}

interface QuestionOption {
  id: string
  optionText: string
  scoreValue: string
  displayOrder: number
}

interface Question {
  id: string
  briCategory: string
  questionText: string
  helpText: string | null
  displayOrder: number
  options: QuestionOption[]
}

// Constants
const FACTOR_OPTIONS = {
  revenueSizeCategory: {
    label: 'Annual Revenue',
    description: 'What is your annual revenue range?',
    options: [
      { value: 'UNDER_500K', label: 'Under $500K' },
      { value: 'FROM_500K_TO_1M', label: '$500K - $1M' },
      { value: 'FROM_1M_TO_3M', label: '$1M - $3M' },
      { value: 'FROM_3M_TO_10M', label: '$3M - $10M' },
      { value: 'FROM_10M_TO_25M', label: '$10M - $25M' },
      { value: 'OVER_25M', label: 'Over $25M' },
    ],
  },
  revenueModel: {
    label: 'Revenue Model',
    description: 'How does your business generate revenue?',
    options: [
      { value: 'PROJECT_BASED', label: 'Project-Based' },
      { value: 'TRANSACTIONAL', label: 'Transactional' },
      { value: 'RECURRING_CONTRACTS', label: 'Recurring Contracts' },
      { value: 'SUBSCRIPTION_SAAS', label: 'Subscription/SaaS' },
    ],
  },
  grossMarginProxy: {
    label: 'Gross Margin',
    description: 'What is your typical gross margin?',
    options: [
      { value: 'LOW', label: 'Low (< 30%)' },
      { value: 'MODERATE', label: 'Moderate (30-50%)' },
      { value: 'GOOD', label: 'Good (50-70%)' },
      { value: 'EXCELLENT', label: 'Excellent (> 70%)' },
    ],
  },
  laborIntensity: {
    label: 'Labor Intensity',
    description: 'How labor-intensive is your business?',
    options: [
      { value: 'LOW', label: 'Low - Highly automated' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'VERY_HIGH', label: 'Very High - People-dependent' },
    ],
  },
  assetIntensity: {
    label: 'Asset Intensity',
    description: 'How asset-intensive is your business?',
    options: [
      { value: 'ASSET_LIGHT', label: 'Asset Light' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'ASSET_HEAVY', label: 'Asset Heavy' },
    ],
  },
  ownerInvolvement: {
    label: 'Owner Involvement',
    description: 'How involved is the owner in daily operations?',
    options: [
      { value: 'MINIMAL', label: 'Minimal - Business runs independently' },
      { value: 'LOW', label: 'Low' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'CRITICAL', label: 'Critical - Owner is essential' },
    ],
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const CATEGORY_ORDER = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
]

export default function BaselineAssessmentPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Core factors state
  const [factors, setFactors] = useState<CoreFactors | null>(null)
  const [originalFactors, setOriginalFactors] = useState<CoreFactors | null>(null)

  // Initial assessment state
  const [hasInitialAssessment, setHasInitialAssessment] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, string>>(new Map())
  const [originalResponses, setOriginalResponses] = useState<Map<string, string>>(new Map())

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0) // 0 = Business Profile, 1+ = assessment categories

  // Group questions by category
  const questionsByCategory = questions.reduce((acc, q) => {
    if (!acc[q.briCategory]) acc[q.briCategory] = []
    acc[q.briCategory].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  // Build steps array
  const steps = [
    { id: 'profile', label: 'Business Profile', category: null },
    ...CATEGORY_ORDER
      .filter(cat => questionsByCategory[cat]?.length > 0)
      .map(cat => ({ id: cat, label: CATEGORY_LABELS[cat], category: cat }))
  ]

  // Current step data
  const currentStepData = steps[currentStep]
  const currentCategoryQuestions = currentStepData?.category
    ? questionsByCategory[currentStepData.category] || []
    : []

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return

    setLoading(true)
    setError(null)

    try {
      // Load core factors
      const coreFactorsRes = await fetch(`/api/companies/${selectedCompanyId}/core-factors`)
      if (coreFactorsRes.ok) {
        const data = await coreFactorsRes.json()
        if (data.coreFactors) {
          // Extract only the factor values, not metadata like id, companyId, updatedAt
          const loadedFactors: CoreFactors = {
            revenueSizeCategory: data.coreFactors.revenueSizeCategory || '',
            revenueModel: data.coreFactors.revenueModel || '',
            grossMarginProxy: data.coreFactors.grossMarginProxy || '',
            laborIntensity: data.coreFactors.laborIntensity || '',
            assetIntensity: data.coreFactors.assetIntensity || '',
            ownerInvolvement: data.coreFactors.ownerInvolvement || '',
          }
          setFactors(loadedFactors)
          setOriginalFactors(loadedFactors)
        } else {
          const emptyFactors: CoreFactors = {
            revenueSizeCategory: '',
            revenueModel: '',
            grossMarginProxy: '',
            laborIntensity: '',
            assetIntensity: '',
            ownerInvolvement: '',
          }
          setFactors(emptyFactors)
          setOriginalFactors(emptyFactors)
        }
      }

      // Check if initial assessment exists (has BRI score)
      const dashboardRes = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (dashboardRes.ok) {
        const dashData = await dashboardRes.json()
        const briScore = dashData.tier1?.briScore
        const hasInitial = briScore !== null && briScore !== undefined
        setHasInitialAssessment(hasInitial)

        if (hasInitial) {
          // Load questions
          const questionsRes = await fetch('/api/questions')
          if (questionsRes.ok) {
            const qData = await questionsRes.json()
            setQuestions(qData.questions || [])
          }

          // Load assessment and responses
          const assessmentRes = await fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: selectedCompanyId }),
          })
          if (assessmentRes.ok) {
            const aData = await assessmentRes.json()
            setAssessmentId(aData.assessment?.id)

            if (aData.assessment?.id) {
              const responsesRes = await fetch(`/api/assessments/${aData.assessment.id}/responses`)
              if (responsesRes.ok) {
                const rData = await responsesRes.json()
                const responseMap = new Map<string, string>()
                for (const r of rData.responses || []) {
                  responseMap.set(r.questionId, r.selectedOptionId)
                }
                setResponses(responseMap)
                setOriginalResponses(new Map(responseMap))
              }
            }
          }
        }
      }
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle factor change
  function handleFactorChange(factor: keyof CoreFactors, value: string) {
    if (factors) {
      setFactors({ ...factors, [factor]: value })
      setError(null)
      setSuccess(null)
    }
  }

  // Handle assessment response change
  function handleResponseChange(questionId: string, optionId: string) {
    const newResponses = new Map(responses)
    newResponses.set(questionId, optionId)
    setResponses(newResponses)
    setError(null)
    setSuccess(null)
  }

  // Check for unsaved changes
  function hasChanges(): boolean {
    // Check core factors
    if (factors && originalFactors) {
      if (JSON.stringify(factors) !== JSON.stringify(originalFactors)) {
        return true
      }
    }

    // Check assessment responses
    if (responses.size !== originalResponses.size) return true
    for (const [key, value] of responses) {
      if (originalResponses.get(key) !== value) return true
    }

    return false
  }

  // Check if current step is complete
  function isStepComplete(stepIndex: number): boolean {
    const step = steps[stepIndex]
    if (!step) return false

    if (step.id === 'profile') {
      return factors ? Object.values(factors).every(v => v !== '') : false
    }

    const catQuestions = questionsByCategory[step.category!] || []
    return catQuestions.every(q => responses.has(q.id))
  }

  // Save all changes
  async function handleSave() {
    if (!selectedCompanyId || !factors) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Save core factors (this triggers snapshot recalculation)
      // Only send non-empty values - empty strings are invalid for enum fields
      const factorsPayload: Record<string, string> = {}
      if (factors.revenueSizeCategory) factorsPayload.revenueSizeCategory = factors.revenueSizeCategory
      if (factors.revenueModel) factorsPayload.revenueModel = factors.revenueModel
      if (factors.grossMarginProxy) factorsPayload.grossMarginProxy = factors.grossMarginProxy
      if (factors.laborIntensity) factorsPayload.laborIntensity = factors.laborIntensity
      if (factors.assetIntensity) factorsPayload.assetIntensity = factors.assetIntensity
      if (factors.ownerInvolvement) factorsPayload.ownerInvolvement = factors.ownerInvolvement

      const factorsRes = await fetch(`/api/companies/${selectedCompanyId}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(factorsPayload),
      })

      if (!factorsRes.ok) {
        const errorData = await factorsRes.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save business profile')
      }

      // Save assessment responses if we have changes
      if (assessmentId && hasInitialAssessment) {
        const changedResponses: Array<{ questionId: string; selectedOptionId: string }> = []

        for (const [questionId, optionId] of responses) {
          if (originalResponses.get(questionId) !== optionId) {
            changedResponses.push({ questionId, selectedOptionId: optionId })
          }
        }

        // Use the reassess endpoint to update responses and recalculate
        if (changedResponses.length > 0) {
          const reassessRes = await fetch(`/api/companies/${selectedCompanyId}/reassess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              responses: changedResponses.map(r => ({
                questionId: r.questionId,
                selectedOptionId: r.selectedOptionId,
                confidenceLevel: 'CONFIDENT',
              })),
            }),
          })

          if (!reassessRes.ok) {
            console.error('Failed to update assessment responses')
          }
        }
      }

      // Update original values
      setOriginalFactors(factors)
      setOriginalResponses(new Map(responses))

      setSuccess('Changes saved and valuation updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Navigate to next step
  function goToNextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Navigate to previous step
  function goToPrevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Loading state
  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No company selected</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Baseline Assessment</h1>
        <p className="text-gray-600">
          {hasInitialAssessment
            ? `Review and update ${selectedCompany?.name || 'your company'}'s baseline profile and assessment answers. Changes will recalculate your BRI score and update your task recommendations.`
            : `Set ${selectedCompany?.name || 'your company'}'s business profile. Complete the initial Risk Assessment to unlock full baseline editing.`
          }
        </p>
      </div>

      {/* Step Navigation */}
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isComplete = isStepComplete(index)
          const isCurrent = index === currentStep
          const isAccessible = index === 0 || hasInitialAssessment

          return (
            <button
              key={step.id}
              onClick={() => isAccessible && setCurrentStep(index)}
              disabled={!isAccessible}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isCurrent
                  ? 'bg-primary text-white shadow-md'
                  : isComplete
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isAccessible
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              )}
            >
              {isComplete && !isCurrent && (
                <span className="mr-1">✓</span>
              )}
              {step.label}
            </button>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStepData?.label}</CardTitle>
          <CardDescription>
            {currentStepData?.id === 'profile'
              ? 'These factors determine your Core Score and base valuation multiple.'
              : `Review and update your ${currentStepData?.label?.toLowerCase()} answers.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Profile Step */}
          {currentStepData?.id === 'profile' && factors && (
            <div className="space-y-8">
              {(Object.keys(FACTOR_OPTIONS) as Array<keyof typeof FACTOR_OPTIONS>).map((factorKey) => {
                const config = FACTOR_OPTIONS[factorKey]
                const currentValue = factors[factorKey] || ''

                return (
                  <div key={factorKey} className="space-y-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{config.label}</h3>
                      <p className="text-sm text-gray-500">{config.description}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {config.options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleFactorChange(factorKey, option.value)}
                          className={cn(
                            'p-3 text-left rounded-lg border transition-colors',
                            currentValue === option.value
                              ? 'border-[#B87333] bg-orange-50 text-gray-900'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          )}
                        >
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Assessment Category Steps */}
          {currentStepData?.category && currentCategoryQuestions.length > 0 && (
            <div className="space-y-6">
              {currentCategoryQuestions.map((question, qIndex) => {
                const selectedOptionId = responses.get(question.id)

                return (
                  <div key={question.id} className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Q{qIndex + 1}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{question.questionText}</h3>
                      {question.helpText && (
                        <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {question.options
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleResponseChange(question.id, option.id)}
                            className={cn(
                              'w-full p-3 text-left rounded-lg border transition-colors',
                              selectedOptionId === option.id
                                ? 'border-[#B87333] bg-orange-50 text-gray-900 ring-2 ring-[#B87333]/20'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            )}
                          >
                            <span className="text-sm">{option.optionText}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* No initial assessment message */}
          {currentStepData?.category && !hasInitialAssessment && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Initial Assessment First</h3>
              <p className="text-gray-600 mb-4">
                Complete your initial Risk Assessment to unlock full baseline editing capabilities.
              </p>
              <Button
                onClick={() => window.location.href = '/dashboard/assessment/risk'}
                className="bg-[#B87333] hover:bg-[#9A5F2A]"
              >
                Go to Risk Assessment
              </Button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {/* Always show save button when there are changes */}
          {hasChanges() && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#B87333] hover:bg-[#9A5F2A]"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}

          {/* Show Next button if not on last step */}
          {currentStep < steps.length - 1 && (
            <Button
              variant={hasChanges() ? 'outline' : 'default'}
              onClick={goToNextStep}
              disabled={!isStepComplete(currentStep) || (currentStep > 0 && !hasInitialAssessment)}
              className={hasChanges() ? 'gap-2' : 'gap-2 bg-[#B87333] hover:bg-[#9A5F2A]'}
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
