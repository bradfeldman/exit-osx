'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { QuestionCard } from './QuestionCard'

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
  title?: string
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

export function AssessmentWizard({ companyId, companyName, title = 'Buyer Readiness Assessment' }: AssessmentWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, Response>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{ briScore: number; currentValue: number } | null>(null)

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
    let isRedirecting = false

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

        // Check if already completed - redirect to dashboard
        if (assessment.completedAt) {
          isRedirecting = true
          router.push('/dashboard')
          // Keep loading state true so user sees spinner during redirect
          return
        }

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        // Don't set loading to false if we're redirecting
        if (!isRedirecting) {
          setLoading(false)
        }
      }
    }

    initAssessment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Show celebration with results
      setCelebrationData({
        briScore: data.summary?.briScore || 0,
        currentValue: data.summary?.currentValue || 0,
      })
      setShowCelebration(true)
      setSaving(false)

      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#B87333', '#3D3D3D', '#FFD700', '#FFFFFF']
      })

      // Continue confetti for a moment
      const duration = 2000
      const end = Date.now() + duration
      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#B87333', '#3D3D3D', '#FFD700']
        })
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#B87333', '#3D3D3D', '#FFD700']
        })
        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()

      // Redirect after celebration
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    )
  }

  // Celebration screen after completing assessment
  if (showCelebration && celebrationData) {
    const _formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
        {/* Success animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Assessment Complete!
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Your Buyer Readiness Index has been calculated
        </p>

        {/* Redirect notice */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Taking you to your dashboard...
        </div>
      </div>
    )
  }

  const allAnswered = responses.size >= orderedQuestions.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{companyName}</p>
      </div>

      {/* Category Navigation Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORY_ORDER.map(cat => {
          const catQuestions = questionsByCategory[cat] || []
          const catAnswered = catQuestions.filter(q => responses.has(q.id)).length
          const isComplete = catAnswered === catQuestions.length && catQuestions.length > 0
          const isCurrentCat = cat === currentCategory
          const progressPercent = catQuestions.length > 0 ? (catAnswered / catQuestions.length) * 100 : 0

          // Find the first question index for this category
          const firstQuestionIndex = orderedQuestions.findIndex(q => q.briCategory === cat)

          return (
            <button
              key={cat}
              onClick={() => firstQuestionIndex >= 0 && setCurrentQuestionIndex(firstQuestionIndex)}
              className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-300 ${
                isComplete
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : isCurrentCat
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              {/* Progress fill from bottom */}
              {!isComplete && progressPercent > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all duration-500"
                  style={{ height: `${progressPercent}%` }}
                />
              )}

              {/* Content */}
              <div className="relative">
                {/* Icon/Status */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isCurrentCat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{catAnswered}/{catQuestions.length}</span>
                  )}
                </div>

                {/* Label */}
                <div className={`text-sm font-medium truncate ${
                  isComplete
                    ? 'text-emerald-700'
                    : isCurrentCat
                    ? 'text-primary'
                    : 'text-foreground'
                }`}>
                  {CATEGORY_LABELS[cat]}
                </div>

                {/* Status text */}
                <div className={`text-xs mt-0.5 ${
                  isComplete
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
                }`}>
                  {isComplete ? 'Complete' : `${catQuestions.length - catAnswered} left`}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Overall Progress Bar */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Overall Progress
          </span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{responses.size} answered</span>
          <span>{orderedQuestions.length - responses.size} remaining</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="px-2.5 py-1 bg-primary/10 text-primary font-medium rounded-lg">
                {CATEGORY_LABELS[currentQuestion.briCategory]}
              </span>
              <span className="text-muted-foreground">
                {categoryQuestionIndex + 1} of {categoryQuestions.length}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-foreground">{currentQuestion.questionText}</h2>
            {currentQuestion.helpText && (
              <p className="text-sm text-muted-foreground mt-2">{currentQuestion.helpText}</p>
            )}
          </div>
          <div className="px-6 pb-6">
            <QuestionCard
              question={currentQuestion}
              selectedOptionId={responses.get(currentQuestion.id)?.selectedOptionId}
              onAnswer={handleAnswer}
              disabled={saving}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
          className="gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Previous
        </Button>

        {allAnswered ? (
          <Button onClick={handleComplete} disabled={saving} className="gap-2 px-6">
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Calculating...
              </>
            ) : (
              <>
                Complete Assessment
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(Math.min(orderedQuestions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex >= orderedQuestions.length - 1}
            className="gap-2"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  )
}
