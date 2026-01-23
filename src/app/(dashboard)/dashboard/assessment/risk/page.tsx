'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard'

// Types for Project Assessment
interface QuestionOption {
  id: string
  optionText: string
  scoreValue: number
  displayOrder: number
}

interface ProjectQuestion {
  id: string
  moduleId: string
  questionText: string
  helpText: string | null
  briCategory: string
  subCategory: string | null
  options: QuestionOption[]
}

interface AssessmentQuestion {
  id: string
  questionId: string
  displayOrder: number
  selectionReason: string
  priorityScore: number
  question: ProjectQuestion
}

interface ProjectAssessment {
  id: string
  assessmentNumber: number
  title: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  primaryCategory: string | null
  questions: AssessmentQuestion[]
  responses: Array<{
    questionId: string
    selectedOptionId: string
  }>
  completedAt: string | null
}

interface CompletionResult {
  briRefinement: {
    before: number | null
    after: number
    impact: number | null
  }
  actionPlan: {
    tasksCreated: number
    totalEstimatedHours: number
    estimatedValueImpact: number
    topTasks: Array<{ title: string; effortLevel: string }>
  }
  scoreImpactSummary: {
    overallChange: string
    keyFindings: string[]
  }
  milestone: {
    completedCount: number
    message: string
    isNewLearning: boolean
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const PROGRESS_STEPS = [
  { label: 'Analyzing your company profile', duration: 800 },
  { label: 'Reviewing previous assessment responses', duration: 1000 },
  { label: 'Identifying high-impact questions', duration: 1200 },
  { label: 'Prioritizing by buyer readiness impact', duration: 1000 },
  { label: 'Preparing your assessment', duration: 800 },
]

export default function RiskAssessmentPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()

  // State
  const [loading, setLoading] = useState(true)
  const [needsInitialAssessment, setNeedsInitialAssessment] = useState(false)
  const [currentAssessment, setCurrentAssessment] = useState<ProjectAssessment | null>(null)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingStep, setCreatingStep] = useState(0)
  const [assessmentReady, setAssessmentReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null)

  // Animate through progress steps when creating
  useEffect(() => {
    if (!creating) {
      setCreatingStep(0)
      setAssessmentReady(false)
      return
    }

    const step = PROGRESS_STEPS[creatingStep]
    if (!step) return

    const timer = setTimeout(() => {
      if (creatingStep < PROGRESS_STEPS.length - 1) {
        setCreatingStep(prev => prev + 1)
      }
    }, step.duration)

    return () => clearTimeout(timer)
  }, [creating, creatingStep])

  // Finish creating when both animation progresses enough AND assessment is ready
  useEffect(() => {
    if (assessmentReady && creatingStep >= 3) {
      setCreating(false)
    }
  }, [assessmentReady, creatingStep])

  // Check if company has completed initial assessment
  const checkInitialAssessment = useCallback(async () => {
    if (!selectedCompanyId) return false

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (response.ok) {
        const data = await response.json()
        // Check if BRI score exists in tier1 - if present, initial assessment is done
        const briScore = data.tier1?.briScore
        const hasInitialAssessment = briScore !== null && briScore !== undefined

        if (!hasInitialAssessment) {
          setNeedsInitialAssessment(true)
          setLoading(false)
          return true
        }
      }
      setNeedsInitialAssessment(false)
      return false
    } catch {
      setNeedsInitialAssessment(false)
      return false
    }
  }, [selectedCompanyId])

  // Load current/latest Project Assessment
  const loadProjectAssessment = useCallback(async () => {
    if (!selectedCompanyId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/project-assessments?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()

        // Find in-progress assessment first, then most recent
        const inProgress = data.assessments?.find((a: ProjectAssessment) => a.status === 'IN_PROGRESS')
        const mostRecent = data.assessments?.[0] // Already sorted by desc

        const assessmentToShow = inProgress || mostRecent

        if (assessmentToShow) {
          // Load full assessment details
          const detailResponse = await fetch(`/api/project-assessments/${assessmentToShow.id}`)
          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            setCurrentAssessment(detailData.assessment)

            // Initialize responses from existing
            const existingResponses: Record<string, string> = {}
            for (const r of detailData.assessment.responses || []) {
              existingResponses[r.questionId] = r.selectedOptionId
            }
            setResponses(existingResponses)

            // Find first unanswered question
            const firstUnanswered = detailData.assessment.questions.findIndex(
              (q: AssessmentQuestion) => !existingResponses[q.questionId]
            )
            if (firstUnanswered >= 0) {
              setCurrentQuestionIndex(firstUnanswered)
            }
          }
        } else {
          setCurrentAssessment(null)
        }
      }
    } catch {
      setError('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    async function init() {
      if (!selectedCompanyId) return

      const needsInitial = await checkInitialAssessment()
      if (!needsInitial) {
        await loadProjectAssessment()
      }
    }
    init()
  }, [selectedCompanyId, checkInitialAssessment, loadProjectAssessment])

  // Create new assessment
  async function createNewAssessment() {
    if (!selectedCompanyId) return

    setCreating(true)
    setCreatingStep(0)
    setAssessmentReady(false)
    setError(null)
    setCompletionResult(null)

    try {
      const response = await fetch('/api/project-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          questionCount: 10,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentAssessment(data.assessment)
        setResponses({})
        setCurrentQuestionIndex(0)
        // Signal that assessment data is ready - animation will finish before showing
        setAssessmentReady(true)
      } else {
        setError(data.error || 'Failed to create assessment')
        setCreating(false)
      }
    } catch {
      setError('Failed to create assessment')
      setCreating(false)
    }
  }

  // Save response
  async function saveResponse(questionId: string, optionId: string) {
    if (!currentAssessment) return

    setSaving(true)

    try {
      const response = await fetch(`/api/project-assessments/${currentAssessment.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          selectedOptionId: optionId,
          confidenceLevel: 'CONFIDENT',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to save response')
      }
    } catch {
      setError('Failed to save response')
    } finally {
      setSaving(false)
    }
  }

  // Handle option selection
  async function handleOptionSelect(optionId: string) {
    if (!currentAssessment) return

    const question = currentAssessment.questions[currentQuestionIndex]
    const questionId = question.questionId

    // Update local state
    setResponses(prev => ({ ...prev, [questionId]: optionId }))

    // Save to server
    await saveResponse(questionId, optionId)

    // Auto-advance
    setTimeout(() => {
      if (currentQuestionIndex < currentAssessment.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      }
    }, 300)
  }

  // Complete assessment
  async function handleComplete() {
    if (!currentAssessment) return

    setCompleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/project-assessments/${currentAssessment.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok) {
        setCompletionResult({
          briRefinement: data.briRefinement,
          actionPlan: data.actionPlan,
          scoreImpactSummary: data.scoreImpactSummary,
          milestone: data.milestone,
        })
        // Update assessment status locally
        setCurrentAssessment(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
      } else {
        setError(data.error || 'Failed to complete assessment')
      }
    } catch {
      setError('Failed to complete assessment')
    } finally {
      setCompleting(false)
    }
  }

  // Loading state
  if (companyLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No company selected</p>
      </div>
    )
  }

  // Show creating animation
  if (creating) {
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
                  index < creatingStep
                    ? 'text-green-600'
                    : index === creatingStep
                    ? 'text-primary font-medium'
                    : 'text-gray-300'
                }`}
              >
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {index < creatingStep ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : index === creatingStep ? (
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

  // Show initial assessment wizard if needed
  if (needsInitialAssessment) {
    return (
      <div className="max-w-3xl mx-auto">
        <AssessmentWizard
          companyId={selectedCompanyId}
          companyName={selectedCompany.name}
          title="Risk Assessment"
        />
      </div>
    )
  }

  // Show completion results
  if (completionResult) {
    const { briRefinement, actionPlan, scoreImpactSummary, milestone } = completionResult
    const briChange = briRefinement.impact !== null ? briRefinement.impact * 100 : 0
    const hasSignificantChange = Math.abs(briChange) >= 1

    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-violet-600 text-white p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Assessment Complete!</h1>
            <p className="text-white/90">
              {milestone.completedCount === 1
                ? "Great job completing your first 10-Minute Risk Assessment!"
                : `You've completed ${milestone.completedCount} assessments.`}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Findings */}
            {milestone.isNewLearning && scoreImpactSummary.keyFindings.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  {scoreImpactSummary.keyFindings.map((finding, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-primary">•</span>
                      {finding}
                    </li>
                  ))}
                </ul>
                {hasSignificantChange && (
                  <div className="mt-3 pt-3 border-t flex justify-between">
                    <span className="text-sm text-gray-600">BRI Impact</span>
                    <span className={`font-bold ${briChange > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {briChange > 0 ? '+' : ''}{briChange.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Created */}
            {actionPlan.tasksCreated > 0 && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <h3 className="font-semibold text-gray-900 mb-2">New Actions Added</h3>
                <div className="text-2xl font-bold text-primary">{actionPlan.tasksCreated} Tasks</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={createNewAssessment} disabled={creating} className="flex-1">
                {creating ? 'Creating...' : 'Start Another Assessment'}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="flex-1">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show start new assessment if none exists or last one is completed
  if (!currentAssessment || currentAssessment.status === 'COMPLETED') {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">10-Minute Risk Assessment</h1>
          <p className="text-gray-600 mt-1">
            Answer 10 targeted questions to refine your Buyer Readiness score
          </p>
        </div>

        {currentAssessment?.status === 'COMPLETED' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last Assessment</CardTitle>
              <CardDescription>
                {currentAssessment.title} • Completed {new Date(currentAssessment.completedAt!).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {currentAssessment.questions.length} questions answered across{' '}
                {currentAssessment.primaryCategory ? CATEGORY_LABELS[currentAssessment.primaryCategory] : 'multiple'} categories.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Ready for your next assessment?</CardTitle>
            <CardDescription>
              Each assessment asks new questions based on your current risk profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createNewAssessment} disabled={creating} size="lg" className="w-full">
              {creating ? 'Creating Assessment...' : 'Start 10-Minute Assessment'}
            </Button>
            {error && (
              <p className="text-sm text-red-600 mt-3">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Link to Baseline Assessment */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              Need to update your initial assessment answers? You can review and edit all baseline questions in{' '}
              <a href="/dashboard/assessment/company" className="text-primary hover:underline font-medium">
                Baseline Assessment
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show in-progress assessment questions
  const answeredCount = Object.keys(responses).length
  const totalQuestions = currentAssessment.questions.length
  const allAnswered = answeredCount === totalQuestions
  const progress = (answeredCount / totalQuestions) * 100
  const currentQuestion = currentAssessment.questions[currentQuestionIndex]

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">10</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">10-Minute Risk Assessment</h1>
              <p className="text-sm text-muted-foreground">Refine your Buyer Readiness score</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {currentAssessment.questions.map((q, index) => {
          const isAnswered = !!responses[q.questionId]
          const isCurrent = index === currentQuestionIndex

          return (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                isCurrent
                  ? 'bg-primary text-white'
                  : isAnswered
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                {currentQuestionIndex + 1}
              </span>
              <div className="flex-1">
                <CardTitle className="text-lg">{currentQuestion.question.questionText}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {CATEGORY_LABELS[currentQuestion.question.briCategory] || currentQuestion.question.briCategory}
                  </span>
                  {currentQuestion.question.subCategory && (
                    <span className="text-xs text-muted-foreground">
                      {currentQuestion.question.subCategory}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.question.options
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((option) => {
                  const isSelected = responses[currentQuestion.questionId] === option.id

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={saving}
                      className={`w-full p-4 text-left rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm">{option.optionText}</span>
                    </button>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Complete Button */}
      {allAnswered && (
        <div className="flex justify-center">
          <Button
            onClick={handleComplete}
            disabled={completing}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {completing ? 'Completing...' : 'Complete Assessment'}
          </Button>
        </div>
      )}
    </div>
  )
}
