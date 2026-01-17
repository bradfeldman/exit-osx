'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QuestionOption {
  id: string
  optionText: string
  scoreValue: number
  displayOrder: number
}

interface Question {
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
  question: Question
}

interface Response {
  questionId: string
  selectedOptionId: string
}

interface Assessment {
  id: string
  assessmentNumber: number
  title: string
  status: string
  primaryCategory: string
  questions: AssessmentQuestion[]
  responses: Response[]
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

export default function AssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string
  const { selectedCompanyId } = useCompany()

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true) // Prevents error flash during initial load
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null)

  useEffect(() => {
    if (assessmentId) {
      loadAssessment()
    }
    // Mark initialization complete after a brief delay to prevent error flash
    const timer = setTimeout(() => setInitializing(false), 500)
    return () => clearTimeout(timer)
  }, [assessmentId])

  async function loadAssessment() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/project-assessments/${assessmentId}`)
      if (response.ok) {
        const data = await response.json()
        setAssessment(data.assessment)

        // Initialize responses from existing saved responses
        const existingResponses: Record<string, string> = {}
        for (const r of data.assessment.responses || []) {
          existingResponses[r.questionId] = r.selectedOptionId
        }
        setResponses(existingResponses)

        // Find first unanswered question
        const firstUnanswered = data.assessment.questions.findIndex(
          (q: AssessmentQuestion) => !existingResponses[q.questionId]
        )
        if (firstUnanswered >= 0) {
          setCurrentQuestionIndex(firstUnanswered)
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to load assessment')
      }
    } catch (err) {
      console.error('Failed to load assessment:', err)
      setError('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }

  async function saveResponse(questionId: string, optionId: string) {
    setSaving(true)

    try {
      const response = await fetch(`/api/project-assessments/${assessmentId}/responses`, {
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
    } catch (err) {
      console.error('Failed to save response:', err)
      setError('Failed to save response')
    } finally {
      setSaving(false)
    }
  }

  async function skipQuestion(questionId: string) {
    setSaving(true)

    try {
      const response = await fetch(`/api/project-assessments/${assessmentId}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to skip question')
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to skip question:', err)
      setError('Failed to skip question')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleOptionSelect(optionId: string) {
    if (!assessment) return

    const question = assessment.questions[currentQuestionIndex]
    const questionId = question.questionId

    // Update local state
    setResponses(prev => ({ ...prev, [questionId]: optionId }))

    // Save to server
    await saveResponse(questionId, optionId)

    // Auto-advance to next question after brief delay
    setTimeout(() => {
      if (currentQuestionIndex < assessment.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      }
    }, 300)
  }

  async function handleSkip() {
    if (!assessment) return

    const question = assessment.questions[currentQuestionIndex]
    const success = await skipQuestion(question.questionId)

    if (success) {
      // Mark as skipped in local state (use special marker)
      setResponses(prev => ({ ...prev, [question.questionId]: '__SKIPPED__' }))

      // Advance to next question
      if (currentQuestionIndex < assessment.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      }
    }
  }

  async function handleComplete() {
    if (!assessment) return

    setCompleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/project-assessments/${assessmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok) {
        // Store the completion result to show feedback
        setCompletionResult({
          briRefinement: data.briRefinement,
          actionPlan: data.actionPlan,
          scoreImpactSummary: data.scoreImpactSummary,
          milestone: data.milestone,
        })
      } else {
        setError(data.error || 'Failed to complete assessment')
      }
    } catch (err) {
      console.error('Failed to complete assessment:', err)
      setError('Failed to complete assessment')
    } finally {
      setCompleting(false)
    }
  }

  // Show loading while fetching, initializing, or if we don't have an assessment yet (and no error)
  if (loading || initializing || (!assessment && !error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading your assessment...</p>
      </div>
    )
  }

  // Show completion results
  if (completionResult) {
    const { briRefinement, actionPlan, scoreImpactSummary, milestone } = completionResult
    const briChange = briRefinement.impact !== null ? briRefinement.impact * 100 : 0
    const hasSignificantChange = Math.abs(briChange) >= 1
    const isFirstAssessment = milestone?.completedCount === 1

    return (
      <div className="max-w-2xl mx-auto py-12 relative">
        {/* Confetti Animation */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rotate-45"
                style={{
                  backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'][i % 6],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes confetti {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          .animate-confetti {
            animation: confetti linear forwards;
          }
        `}</style>

        <Card className="overflow-hidden relative z-10">
          {/* Celebration Header - Updated color scheme */}
          <div className="bg-gradient-to-br from-primary via-primary/90 to-violet-600 text-white p-8 text-center relative overflow-hidden">
            {/* Sparkle decorations */}
            <div className="absolute top-6 left-10 text-2xl animate-pulse">✨</div>
            <div className="absolute top-10 right-14 text-xl animate-pulse" style={{ animationDelay: '0.5s' }}>🎉</div>
            <div className="absolute bottom-10 left-20 text-lg animate-pulse" style={{ animationDelay: '1s' }}>⭐</div>
            <div className="absolute bottom-6 right-10 text-2xl animate-pulse" style={{ animationDelay: '0.3s' }}>🎊</div>

            <div className="relative">
              <div className="mx-auto w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-3">Assessment Complete!</h1>
              <p className="text-white/90 text-base max-w-md mx-auto">
                {isFirstAssessment
                  ? "Congratulations on completing your first assessment! Your answers help us continue finding opportunities to increase your Business Readiness Index."
                  : `Great job! You've now completed a total of ${milestone?.completedCount || 1} assessments.`
                }
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* What We Learned Section */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {milestone?.isNewLearning ? 'What We Learned' : 'Assessment Insights'}
              </h3>

              {milestone?.isNewLearning ? (
                <>
                  {/* Show actual findings when there are new learnings */}
                  {scoreImpactSummary.keyFindings.length > 0 && (
                    <ul className="space-y-3">
                      {scoreImpactSummary.keyFindings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Show BRI change if significant */}
                  {hasSignificantChange && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">BRI Score Impact</span>
                        <span className={`text-lg font-bold ${briChange > 0 ? 'text-primary' : 'text-amber-600'}`}>
                          {briChange > 0 ? '+' : ''}{briChange.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* No significant changes - show alignment message */
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium">Your answers aligned with our expectations</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Based on what we know about your business, your responses confirmed our assessment.
                  </p>
                </div>
              )}
            </div>

            {/* Action Plan Summary - only if tasks were created */}
            {actionPlan.tasksCreated > 0 && (
              <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  New Actions Added
                </h3>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-bold text-primary">{actionPlan.tasksCreated}</div>
                    <div className="text-xs text-gray-500">Tasks Created</div>
                  </div>
                  {actionPlan.estimatedValueImpact > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        ${actionPlan.estimatedValueImpact >= 1000000
                          ? (actionPlan.estimatedValueImpact / 1000000).toFixed(1) + 'M'
                          : (actionPlan.estimatedValueImpact / 1000).toFixed(0) + 'K'}
                      </div>
                      <div className="text-xs text-gray-500">Potential Value</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Return to Dashboard
              </Button>
              {actionPlan.tasksCreated > 0 && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/playbook')}
                  className="flex-1"
                >
                  View Action Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Only show error after initialization is complete (prevents flash)
  if (error && !assessment && !initializing) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Assessment</h1>
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

  // This should never be reached due to the loading check above, but TypeScript needs it
  if (!assessment) {
    return null
  }

  // Check if assessment is already completed
  if (assessment.status === 'COMPLETED') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle>Assessment Complete</CardTitle>
            <CardDescription>
              {assessment.title} has been completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const answeredCount = Object.values(responses).filter(v => v !== '__SKIPPED__').length
  const skippedCount = Object.values(responses).filter(v => v === '__SKIPPED__').length
  const handledCount = answeredCount + skippedCount
  const totalQuestions = assessment.questions.length
  const allHandled = handledCount === totalQuestions
  const progress = (handledCount / totalQuestions) * 100

  // Ensure currentQuestionIndex is valid
  const safeQuestionIndex = Math.min(currentQuestionIndex, totalQuestions - 1)
  const currentQuestion = assessment.questions[safeQuestionIndex]

  // Guard against undefined question
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading question...</p>
      </div>
    )
  }

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
              <h1 className="text-xl font-bold text-gray-900">10 Questions in 10 Minutes</h1>
              <p className="text-sm text-muted-foreground">Refine your Buyer Readiness score</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {answeredCount} answered{skippedCount > 0 ? `, ${skippedCount} skipped` : ''} of {totalQuestions}
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
        {assessment.questions.map((q, index) => {
          const isAnswered = !!responses[q.questionId]
          const isCurrent = index === safeQuestionIndex

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
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
              {safeQuestionIndex + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{currentQuestion.question.questionText}</CardTitle>
                {/* Info icon for helpful context */}
                {currentQuestion.question.helpText && (
                  <div className="relative group">
                    <button
                      type="button"
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                      title="More information"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute right-0 top-8 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <div>{currentQuestion.question.helpText}</div>
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45" />
                    </div>
                  </div>
                )}
              </div>
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

          {/* Skip option */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-muted-foreground hover:text-gray-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Skip this question
              <span className="text-xs text-muted-foreground">(will appear in a future assessment)</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Complete Button */}
      {allHandled && (
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
