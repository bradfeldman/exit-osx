'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  HelpCircle,
  MinusCircle,
  Sparkles,
  X,
} from 'lucide-react'

interface Question {
  id: string
  briCategory: string
  questionText: string
  helpText: string | null
  displayOrder: number
  maxImpactPoints: string
  companyId?: string | null
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

interface CategoryAssessmentFlowProps {
  category: string
  categoryLabel: string
  assessmentId: string
  companyId: string
  onClose: () => void
  onComplete: () => void
}

export function CategoryAssessmentFlow({
  category,
  categoryLabel,
  assessmentId,
  companyId,
  onClose,
  onComplete,
}: CategoryAssessmentFlowProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, Response>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [recentlySelected, setRecentlySelected] = useState<string | null>(null)

  // Load questions and existing responses for this category
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch questions (company-scoped if companyId available)
        const questionsUrl = companyId
          ? `/api/questions?companyId=${companyId}`
          : '/api/questions'
        const questionsRes = await fetch(questionsUrl)
        if (!questionsRes.ok) throw new Error('Failed to load questions')
        const { questions: allQuestions } = await questionsRes.json()

        // Filter to this category and sort: seed (foundational) first, then AI (adaptive)
        // PROD-014: Enforce Initial -> Adaptive question ordering
        const categoryQuestions = (allQuestions as Question[])
          .filter(q => q.briCategory === category)
          .sort((a, b) => {
            // Seed questions (companyId is null/undefined) come before AI questions
            const aIsSeed = !a.companyId ? 0 : 1
            const bIsSeed = !b.companyId ? 0 : 1
            if (aIsSeed !== bIsSeed) return aIsSeed - bIsSeed
            return a.displayOrder - b.displayOrder
          })
        setQuestions(categoryQuestions)

        // Fetch existing responses
        const responsesRes = await fetch(`/api/assessments/${assessmentId}/responses`)
        if (responsesRes.ok) {
          const { responses: existingResponses } = await responsesRes.json()
          const responseMap = new Map<string, Response>()
          for (const r of existingResponses) {
            if (categoryQuestions.some(q => q.id === r.questionId)) {
              responseMap.set(r.questionId, {
                questionId: r.questionId,
                selectedOptionId: r.selectedOptionId || '',
                confidenceLevel: r.confidenceLevel,
              })
            }
          }
          setResponses(responseMap)

          // Start at first unanswered question
          const firstUnanswered = categoryQuestions.findIndex(q => !responseMap.has(q.id))
          if (firstUnanswered >= 0) {
            setCurrentQuestionIndex(firstUnanswered)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, assessmentId])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0
    ? Math.round((responses.size / questions.length) * 100)
    : 0
  const allAnswered = responses.size >= questions.length

  // Auto-advance to next question
  const advanceToNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuestionIndex, questions.length])

  // Handle answer selection with auto-save
  const handleAnswer = async (optionId: string, confidenceLevel: string = 'CONFIDENT') => {
    if (!currentQuestion || saving) return

    setRecentlySelected(optionId)
    setSaving(true)

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
          confidenceLevel,
        }),
      })

      if (!res.ok) throw new Error('Failed to save response')

      const newResponses = new Map(responses)
      newResponses.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        selectedOptionId: optionId,
        confidenceLevel,
      })
      setResponses(newResponses)

      // Auto-advance after brief delay
      setTimeout(() => {
        setRecentlySelected(null)
        advanceToNext()
      }, 400)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setRecentlySelected(null)
    } finally {
      setSaving(false)
    }
  }

  // Mark as not applicable
  const markAsNotApplicable = async () => {
    if (!currentQuestion || saving) return

    setSaving(true)

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: null,
          confidenceLevel: 'NOT_APPLICABLE',
        }),
      })

      if (!res.ok) throw new Error('Failed to save response')

      const newResponses = new Map(responses)
      newResponses.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        selectedOptionId: '',
        confidenceLevel: 'NOT_APPLICABLE',
      })
      setResponses(newResponses)

      // Auto-advance
      setTimeout(() => {
        advanceToNext()
      }, 400)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Mark as uncertain
  const markAsUncertain = async () => {
    if (!currentQuestion) return
    const currentResponse = responses.get(currentQuestion.id)
    if (currentResponse && currentResponse.selectedOptionId) {
      await handleAnswer(currentResponse.selectedOptionId, 'UNCERTAIN')
    }
  }

  // Mark as "I don't know" — skip without blocking (BF-005)
  const markAsDontKnow = async () => {
    if (!currentQuestion || saving) return

    setSaving(true)

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: null,
          confidenceLevel: 'UNCERTAIN',
        }),
      })

      if (!res.ok) throw new Error('Failed to save response')

      const newResponses = new Map(responses)
      newResponses.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        selectedOptionId: '',
        confidenceLevel: 'UNCERTAIN',
      })
      setResponses(newResponses)

      setTimeout(() => {
        advanceToNext()
      }, 400)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Handle completion - recalculate BRI
  const handleDone = async () => {
    setSaving(true)
    try {
      // Trigger BRI recalculation by calling the recalculate endpoint
      const res = await fetch(`/api/companies/${companyId}/recalculate-bri`, {
        method: 'POST',
      })
      if (!res.ok) {
        console.error('Failed to recalculate BRI:', await res.text())
      }

      // Regenerate AI tasks — await so refinement events are created before navigating
      try {
        await fetch(`/api/companies/${companyId}/generate-ai-tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category }),
        })
      } catch {
        // Task generation failure shouldn't block completion
      }

      onComplete()
    } catch (err) {
      console.error('Error recalculating BRI:', err)
      onComplete() // Still close even if recalc fails
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">No questions available for this category.</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  const currentResponse = currentQuestion ? responses.get(currentQuestion.id) : null
  const isCurrentUncertain = currentResponse?.confidenceLevel === 'UNCERTAIN' && !!currentResponse?.selectedOptionId
  const isCurrentDontKnow = currentResponse?.confidenceLevel === 'UNCERTAIN' && !currentResponse?.selectedOptionId
  const isCurrentNotApplicable = currentResponse?.confidenceLevel === 'NOT_APPLICABLE'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="border-t border-border mt-4 pt-4"
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-primary uppercase tracking-wide">
            {categoryLabel} Assessment
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 hover:bg-muted"
          aria-label="Close assessment"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Inline error message */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{responses.size} answered</span>
          <span>{questions.length - responses.size} remaining</span>
        </div>
      </div>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Question text */}
            <div className="flex items-start gap-1.5 mb-1">
              <h3 className="text-base font-medium text-foreground">
                {currentQuestion.questionText}
              </h3>
              {currentQuestion.companyId && (
                <Sparkles className="w-3.5 h-3.5 text-violet-500/70 dark:text-violet-400/70 mt-1 shrink-0" />
              )}
            </div>
            {currentQuestion.helpText && (
              <p className="text-sm text-muted-foreground mb-4">
                {currentQuestion.helpText}
              </p>
            )}

            {/* Options */}
            <div className="space-y-2 mb-4" role="radiogroup" aria-label={currentQuestion.questionText}>
              {[...currentQuestion.options]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((option) => {
                  const isSelected = currentResponse?.selectedOptionId === option.id
                  const isRecentlySelected = recentlySelected === option.id

                  return (
                    <motion.button
                      key={option.id}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => !saving && handleAnswer(option.id)}
                      disabled={saving}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30",
                        saving && "opacity-60 cursor-not-allowed"
                      )}
                      whileHover={!saving ? { scale: 1.01 } : {}}
                      whileTap={!saving ? { scale: 0.99 } : {}}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {isSelected && (
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <span className={cn(
                          "text-sm leading-snug flex-1",
                          isSelected ? "text-foreground font-medium" : "text-foreground/80"
                        )}>
                          {option.optionText}
                        </span>
                        {isRecentlySelected && saving && (
                          <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  )
                })}

              {/* Skip options: "I don't know" and "Doesn't apply" (BF-005) */}
              <div className="flex items-center justify-center gap-4 pt-1">
                {isCurrentDontKnow ? (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600">
                    <HelpCircle className="w-3 h-3" />
                    Marked as &quot;I don&apos;t know&quot;
                  </span>
                ) : (
                  <button
                    onClick={markAsDontKnow}
                    disabled={saving}
                    className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="w-3 h-3" />
                    I don&apos;t know
                  </button>
                )}

                {!isCurrentDontKnow && !isCurrentNotApplicable && (
                  <span className="text-muted-foreground/30">|</span>
                )}

                {isCurrentNotApplicable ? (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MinusCircle className="w-3 h-3" />
                    Not applicable
                  </span>
                ) : (
                  <button
                    onClick={markAsNotApplicable}
                    disabled={saving}
                    className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MinusCircle className="w-3 h-3" />
                    Doesn&apos;t apply
                  </button>
                )}
              </div>

              {/* Uncertain flag - after answering (not for N/A or Don't Know) */}
              {currentResponse && !isCurrentUncertain && !isCurrentDontKnow && !isCurrentNotApplicable && currentResponse.selectedOptionId && (
                <button
                  onClick={markAsUncertain}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                  Not sure about this answer
                </button>
              )}
              {isCurrentUncertain && (
                <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-amber-600">
                  <HelpCircle className="w-3 h-3" />
                  Flagged as uncertain
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {/* Show Next button if not on last question */}
          {currentQuestionIndex < questions.length - 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {/* Show Done button when all answered OR on last question with an answer */}
          {(allAnswered || (currentQuestionIndex === questions.length - 1 && (currentResponse || recentlySelected))) && (
            <Button size="sm" onClick={handleDone} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  Done
                  <Check className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
