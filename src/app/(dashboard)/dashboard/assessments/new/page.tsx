'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'

const PROGRESS_STEPS = [
  { label: 'Analyzing your company profile', duration: 800 },
  { label: 'Reviewing previous assessment responses', duration: 1000 },
  { label: 'Identifying high-impact questions', duration: 1200 },
  { label: 'Prioritizing by buyer readiness impact', duration: 1000 },
  { label: 'Preparing your assessment', duration: 800 },
]

export default function NewAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedCompanyId } = useCompany()
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [assessmentReady, setAssessmentReady] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)

  const focusCategory = searchParams.get('category')

  // Animate through progress steps
  useEffect(() => {
    if (!creating || assessmentReady) return

    const step = PROGRESS_STEPS[currentStep]
    if (!step) return

    const timer = setTimeout(() => {
      if (currentStep < PROGRESS_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1)
      }
    }, step.duration)

    return () => clearTimeout(timer)
  }, [currentStep, creating, assessmentReady])

  // Create assessment
  useEffect(() => {
    if (selectedCompanyId) {
      createAssessment()
    }
  }, [selectedCompanyId])

  // Redirect when both assessment is ready and animation has progressed enough
  useEffect(() => {
    if (assessmentId && currentStep >= 2) {
      router.replace(`/dashboard/assessments/${assessmentId}`)
    }
  }, [assessmentId, currentStep, router])

  async function createAssessment() {
    if (!selectedCompanyId) return

    try {
      const response = await fetch('/api/project-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          focusCategory: focusCategory || undefined,
          questionCount: 10,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to create assessment')
        setCreating(false)
        return
      }

      const data = await response.json()

      if (data.assessment) {
        // If returning existing assessment, redirect immediately (no progress animation needed)
        if (data.isExisting) {
          router.replace(`/dashboard/assessments/${data.assessment.id}`)
          return
        }
        setAssessmentId(data.assessment.id)
        setAssessmentReady(true)
      } else {
        setError('No assessment returned')
        setCreating(false)
      }
    } catch (err) {
      console.error('Failed to create assessment:', err)
      setError('Failed to create assessment')
      setCreating(false)
    }
  }

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No company selected</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to Create Assessment</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-primary" />
      </div>

      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-lg font-semibold text-gray-900">
          Building Your Assessment
        </h2>

        {/* Progress steps */}
        <div className="space-y-2">
          {PROGRESS_STEPS.map((step, index) => (
            <div
              key={step.label}
              className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                index < currentStep
                  ? 'text-green-600'
                  : index === currentStep
                  ? 'text-primary font-medium'
                  : 'text-gray-300'
              }`}
            >
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : index === currentStep ? (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-200" />
                )}
              </span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
