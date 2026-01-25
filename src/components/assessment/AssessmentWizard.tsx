'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { QuestionCard } from './QuestionCard'
// TERM-001 FIX: Use shared constants for consistent terminology
import { BRI_CATEGORY_LABELS, BRI_CATEGORY_ORDER } from '@/lib/constants/bri-categories'

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

// TERM-001 FIX: Using shared constants from @/lib/constants/bri-categories
const CATEGORY_LABELS: Record<string, string> = BRI_CATEGORY_LABELS
const CATEGORY_ORDER: string[] = [...BRI_CATEGORY_ORDER]

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
  // UX-001 FIX: Add pending selection state for confirmation before auto-advance
  const [pendingSelection, setPendingSelection] = useState<{ optionId: string; optionText: string } | null>(null)
  // NAV-001 FIX: Track skipped questions warning state
  const [showSkippedWarning, setShowSkippedWarning] = useState(false)

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

  // UX-001 FIX: Two-step answer flow - select first, then confirm
  const handleAnswerSelect = (optionId: string) => {
    if (!currentQuestion) return
    const option = currentQuestion.options.find(o => o.id === optionId)
    setPendingSelection({ optionId, optionText: option?.optionText || '' })
  }

  const handleAnswerConfirm = async (confidenceLevel: string = 'CONFIDENT') => {
    if (!assessmentId || !currentQuestion || !pendingSelection) return

    setSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: pendingSelection.optionId,
          confidenceLevel,
        }),
      })

      if (!res.ok) throw new Error('Failed to save response')

      // Update local state
      const newResponses = new Map(responses)
      newResponses.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        selectedOptionId: pendingSelection.optionId,
        confidenceLevel,
      })
      setResponses(newResponses)
      setPendingSelection(null)

      // Auto-advance to next question after confirmation
      setTimeout(() => {
        if (currentQuestionIndex < orderedQuestions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
      }, 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAnswerCancel = () => {
    setPendingSelection(null)
  }

  // Legacy handler for backward compatibility
  const handleAnswer = async (optionId: string) => {
    handleAnswerSelect(optionId)
  }

  // NAV-001 FIX: Check for skipped questions before completing
  const getSkippedQuestions = () => {
    return orderedQuestions.filter(q => !responses.has(q.id))
  }

  const handleCompleteWithWarningCheck = () => {
    const skipped = getSkippedQuestions()
    if (skipped.length > 0) {
      setShowSkippedWarning(true)
    } else {
      handleCompleteConfirmed()
    }
  }

  const handleCompleteConfirmed = async () => {
    if (!assessmentId) return
    setShowSkippedWarning(false)

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
    // UI-001 FIX: Use formatCurrency to display celebration data
    const formatCurrency = (value: number) =>
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
        <p className="text-muted-foreground mb-4 max-w-md">
          Your Buyer Readiness Index has been calculated
        </p>

        {/* UI-001 FIX: Display celebration metrics */}
        {(celebrationData.briScore > 0 || celebrationData.currentValue > 0) && (
          <div className="flex gap-6 mb-8">
            {celebrationData.briScore > 0 && (
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{Math.round(celebrationData.briScore * 100)}%</p>
                <p className="text-xs text-muted-foreground">BRI Score</p>
              </div>
            )}
            {celebrationData.currentValue > 0 && (
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{formatCurrency(celebrationData.currentValue)}</p>
                <p className="text-xs text-muted-foreground">Estimated Value</p>
              </div>
            )}
          </div>
        )}

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
              selectedOptionId={pendingSelection?.optionId || responses.get(currentQuestion.id)?.selectedOptionId}
              onAnswer={handleAnswer}
              disabled={saving || !!pendingSelection}
            />

            {/* UX-001 & UX-002 FIX: Confirmation panel with confidence selection */}
            {pendingSelection && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Selected: {pendingSelection.optionText}</p>
                    <p className="text-xs text-muted-foreground mt-1">How confident are you in this answer?</p>

                    {/* UX-002 FIX: Confidence level selection */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => handleAnswerConfirm('UNCERTAIN')}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        Uncertain
                      </button>
                      <button
                        onClick={() => handleAnswerConfirm('SOMEWHAT_CONFIDENT')}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        Somewhat Confident
                      </button>
                      <button
                        onClick={() => handleAnswerConfirm('CONFIDENT')}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        Confident
                      </button>
                    </div>

                    <button
                      onClick={handleAnswerCancel}
                      disabled={saving}
                      className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Change answer
                    </button>
                  </div>
                </div>
              </div>
            )}
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
          <Button onClick={handleCompleteWithWarningCheck} disabled={saving} className="gap-2 px-6">
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

      {/* NAV-001 FIX: Skipped questions warning dialog */}
      {showSkippedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Incomplete Assessment</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {getSkippedQuestions().length} unanswered question{getSkippedQuestions().length !== 1 ? 's' : ''}. Unanswered questions will affect the accuracy of your Buyer Readiness Index.
                </p>
                <div className="mt-4 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Skipped questions:</p>
                  <ul className="space-y-1">
                    {getSkippedQuestions().slice(0, 5).map((q, i) => (
                      <li key={q.id} className="text-xs text-foreground truncate">
                        {i + 1}. {q.questionText}
                      </li>
                    ))}
                    {getSkippedQuestions().length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        ...and {getSkippedQuestions().length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowSkippedWarning(false)}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={handleCompleteConfirmed}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Completing...' : 'Complete Anyway'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
