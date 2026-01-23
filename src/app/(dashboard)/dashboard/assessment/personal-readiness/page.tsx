'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface QuestionOption {
  id: string
  optionText: string
  scoreValue: number
  displayOrder: number
}

interface Question {
  id: string
  questionText: string
  helpText: string | null
  maxImpactPoints: number
  options: QuestionOption[]
  currentResponse: {
    selectedOptionId: string
    confidenceLevel: string
    notes: string | null
  } | null
}

// Categories type used for API response structure
type _Categories = Record<string, Question[]>

export default function PersonalReadinessPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [changedResponses, setChangedResponses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (selectedCompanyId) {
      loadAssessmentData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  async function loadAssessmentData() {
    if (!selectedCompanyId) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/reassess`)
      if (response.ok) {
        const data = await response.json()
        // Only use the PERSONAL category
        setQuestions(data.categories.PERSONAL || [])
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to load assessment data')
      }
    } catch (_err) {
      setError('Failed to load assessment data')
    } finally {
      setLoading(false)
    }
  }

  function handleResponseChange(questionId: string, optionId: string) {
    setChangedResponses(prev => ({ ...prev, [questionId]: optionId }))
    setError(null)
    setSuccess(null)
  }

  function getCurrentSelection(question: Question): string {
    // Check if user changed this response in current session
    if (changedResponses[question.id]) {
      return changedResponses[question.id]
    }
    // Otherwise use the saved response
    return question.currentResponse?.selectedOptionId || ''
  }

  function hasChanges(): boolean {
    return Object.keys(changedResponses).length > 0
  }

  async function handleSave() {
    if (!selectedCompanyId || !hasChanges()) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const responses = Object.entries(changedResponses).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
        confidenceLevel: 'CONFIDENT',
      }))

      const response = await fetch(`/api/companies/${selectedCompanyId}/reassess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })

      if (response.ok) {
        const data = await response.json()
        setChangedResponses({})
        // Reload data to get updated responses
        await loadAssessmentData()
        setSuccess(data.snapshotUpdated
          ? `${data.updated} response(s) saved and valuation snapshot updated.`
          : `${data.updated} response(s) saved.`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save responses')
      }
    } catch (_err) {
      setError('Failed to save responses')
    } finally {
      setSaving(false)
    }
  }

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

  if (error && questions.length === 0) {
    const needsInitialAssessment = error.toLowerCase().includes('no completed assessment')

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal Readiness</h1>
          <p className="text-gray-600">
            Assess your personal exit readiness
          </p>
        </div>
        {needsInitialAssessment ? (
          <Card>
            <CardHeader>
              <CardTitle>Complete Initial Assessment First</CardTitle>
              <CardDescription>
                Personal Readiness questions are part of your initial Business Readiness Assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To assess your personal readiness for exit, you&apos;ll need to complete the initial
                Business Readiness Assessment. This comprehensive assessment covers all six categories
                including Personal Readiness.
              </p>
              <p className="text-gray-600">
                Once completed, you can return here to review and update your Personal Readiness
                responses at any time.
              </p>
              <Link href="/dashboard/assessment/risk">
                <Button className="bg-[#B87333] hover:bg-[#9A5F2A]">
                  Start Initial Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800">{error}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personal Readiness</h1>
        <p className="text-gray-600">
          Assess your personal exit readiness for {selectedCompany?.name}. This assessment evaluates your personal readiness to exit the business.
        </p>
      </div>

      {/* Questions */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Readiness Questions</CardTitle>
            <CardDescription>
              Review and update your responses to assess your personal exit readiness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {questions.map((question, index) => {
              const currentSelection = getCurrentSelection(question)
              const hasChanged = !!changedResponses[question.id]

              return (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {question.questionText}
                        {hasChanged && (
                          <span className="ml-2 text-xs text-orange-600">(modified)</span>
                        )}
                      </h3>
                      {question.helpText && (
                        <p className="text-sm text-gray-500 mt-1">{question.helpText}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-9 space-y-2">
                    {question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleResponseChange(question.id, option.id)}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          currentSelection === option.id
                            ? 'border-[#B87333] bg-orange-50 text-gray-900'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <span className="text-sm">{option.optionText}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
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

      {/* Actions */}
      <div className="flex items-center justify-between py-4 border-t sticky bottom-0 bg-white">
        <div className="text-sm text-gray-500">
          {hasChanges()
            ? `${Object.keys(changedResponses).length} unsaved change(s)`
            : 'No changes'}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          className="bg-[#B87333] hover:bg-[#9A5F2A]"
        >
          {saving ? 'Saving...' : 'Save & Update Valuation'}
        </Button>
      </div>
    </div>
  )
}
