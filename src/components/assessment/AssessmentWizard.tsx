'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QuestionCard } from './QuestionCard'
import { AssessmentResults } from './AssessmentResults'

interface Question {
  id: string
  briCategory: string
  questionText: string
  helpText: string | null
  displayOrder: number
  maxImpactPoints: string
  options: Array<{
    id: string
    optionText: string
    scoreValue: string
    displayOrder: number
  }>
}

interface Response {
  questionId: string
  selectedOptionId: string
  confidenceLevel: string
}

interface AssessmentWizardProps {
  companyId: string
  companyName: string
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

export function AssessmentWizard({ companyId, companyName }: AssessmentWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, Response>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [results, setResults] = useState<Record<string, unknown> | null>(null)

  // Group questions by category
  const questionsByCategory = questions.reduce((acc, q) => {
    if (!acc[q.briCategory]) acc[q.briCategory] = []
    acc[q.briCategory].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  // Get ordered list of all questions
  const orderedQuestions = CATEGORY_ORDER.flatMap(
    cat => questionsByCategory[cat] || []
  )

  const currentQuestion = orderedQuestions[currentQuestionIndex]
  const progress = orderedQuestions.length > 0
    ? Math.round((responses.size / orderedQuestions.length) * 100)
    : 0

  // Get current category info
  const currentCategory = currentQuestion?.briCategory
  const categoryQuestions = currentCategory ? questionsByCategory[currentCategory] : []
  const categoryQuestionIndex = categoryQuestions.findIndex(q => q.id === currentQuestion?.id)

  useEffect(() => {
    async function initAssessment() {
      try {
        // Fetch questions
        const questionsRes = await fetch('/api/questions')
        if (!questionsRes.ok) throw new Error('Failed to load questions')
        const { questions: fetchedQuestions } = await questionsRes.json()
        setQuestions(fetchedQuestions)

        // Create or get existing assessment
        const assessmentRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId }),
        })
        if (!assessmentRes.ok) throw new Error('Failed to create assessment')
        const { assessment } = await assessmentRes.json()
        setAssessmentId(assessment.id)

        // Check if already completed
        if (assessment.completedAt) {
          setIsComplete(true)
          // Fetch results
          const resultsRes = await fetch(`/api/assessments/${assessment.id}`)
          if (resultsRes.ok) {
            const data = await resultsRes.json()
            setResults(data)
          }
        } else {
          // Load existing responses
          const responsesRes = await fetch(`/api/assessments/${assessment.id}/responses`)
          if (responsesRes.ok) {
            const { responses: existingResponses } = await responsesRes.json()
            const responseMap = new Map<string, Response>()
            for (const r of existingResponses) {
              responseMap.set(r.questionId, {
                questionId: r.questionId,
                selectedOptionId: r.selectedOptionId,
                confidenceLevel: r.confidenceLevel,
              })
            }
            setResponses(responseMap)

            // Find first unanswered question
            const orderedQs = CATEGORY_ORDER.flatMap(
              cat => (fetchedQuestions as Question[]).filter(q => q.briCategory === cat)
            )
            const firstUnanswered = orderedQs.findIndex(q => !responseMap.has(q.id))
            if (firstUnanswered >= 0) {
              setCurrentQuestionIndex(firstUnanswered)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    initAssessment()
  }, [companyId])

  const handleAnswer = async (optionId: string) => {
    if (!assessmentId || !currentQuestion) return

    setSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
          confidenceLevel: 'CONFIDENT',
        }),
      })

      if (!res.ok) throw new Error('Failed to save response')

      // Update local state
      const newResponses = new Map(responses)
      newResponses.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        selectedOptionId: optionId,
        confidenceLevel: 'CONFIDENT',
      })
      setResponses(newResponses)

      // Auto-advance to next question after short delay
      setTimeout(() => {
        if (currentQuestionIndex < orderedQuestions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!assessmentId) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/complete`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete assessment')
      }

      setResults(data)
      setIsComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
    } finally {
      setSaving(false)
    }
  }

  const handleViewDashboard = () => {
    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (isComplete && results) {
    return <AssessmentResults results={results} onViewDashboard={handleViewDashboard} />
  }

  const allAnswered = responses.size >= orderedQuestions.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buyer Readiness Assessment</h1>
        <p className="text-gray-600">{companyName}</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {orderedQuestions.length}
            </span>
            <span className="text-sm font-medium text-primary">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORY_ORDER.map(cat => {
              const catQuestions = questionsByCategory[cat] || []
              const catAnswered = catQuestions.filter(q => responses.has(q.id)).length
              const isCurrentCat = cat === currentCategory

              return (
                <span
                  key={cat}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    catAnswered === catQuestions.length
                      ? 'bg-green-100 text-green-700'
                      : isCurrentCat
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {CATEGORY_LABELS[cat]} ({catAnswered}/{catQuestions.length})
                </span>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-primary mb-2">
              <span className="px-2 py-0.5 bg-primary/10 rounded">
                {CATEGORY_LABELS[currentQuestion.briCategory]}
              </span>
              <span className="text-gray-400">
                Question {categoryQuestionIndex + 1} of {categoryQuestions.length}
              </span>
            </div>
            <CardTitle className="text-xl">{currentQuestion.questionText}</CardTitle>
            {currentQuestion.helpText && (
              <p className="text-sm text-gray-600 mt-2">{currentQuestion.helpText}</p>
            )}
          </CardHeader>
          <CardContent>
            <QuestionCard
              question={currentQuestion}
              selectedOptionId={responses.get(currentQuestion.id)?.selectedOptionId}
              onAnswer={handleAnswer}
              disabled={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        {allAnswered ? (
          <Button onClick={handleComplete} disabled={saving}>
            {saving ? 'Calculating...' : 'Complete Assessment'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(Math.min(orderedQuestions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex >= orderedQuestions.length - 1}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
