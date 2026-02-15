'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronRight,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { CategoryAssessmentFlow } from '@/components/diagnosis/CategoryAssessmentFlow'
import {
  BRI_CATEGORIES,
  BRI_CATEGORY_LABELS,
  BRI_CATEGORY_BORDER_COLORS,
  type BRICategory,
} from '@/lib/constants/bri-categories'

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

interface DeepDiveStepProps {
  companyId: string
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
    currentValue: number
    potentialValue: number
    valueGap: number
  }
  onFinish: () => void
}

export function DeepDiveStep({
  companyId,
  riskResults,
  onFinish,
}: DeepDiveStepProps) {
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assessmentId, setAssessmentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('onboarding_deepdive_assessmentId')
  })
  const [isAssessmentCompleted, setIsAssessmentCompleted] = useState(false)
  const [questionsByCategory, setQuestionsByCategory] = useState<Record<string, Question[]>>({})
  const [expandedCategory, setExpandedCategory] = useState<BRICategory | null>(null)
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set())
  const [taskGenError, setTaskGenError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Persist assessmentId to sessionStorage
  useEffect(() => {
    if (assessmentId) {
      sessionStorage.setItem('onboarding_deepdive_assessmentId', assessmentId)
    }
  }, [assessmentId])

  // Initialize: create/get assessment + load questions
  const initialize = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Create or get existing assessment
      const assessmentRes = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, assessmentType: 'INITIAL' }),
      })
      if (!assessmentRes.ok) throw new Error('Failed to create assessment')
      const assessmentData = await assessmentRes.json()
      const aId = assessmentData.assessment.id
      setAssessmentId(aId)

      // If assessment is already completed, mark all categories done
      if (assessmentData.isCompleted) {
        setIsAssessmentCompleted(true)
        setCompletedCategories(new Set(BRI_CATEGORIES))
        setLoading(false)
        return
      }

      // Fetch questions grouped by category
      const questionsRes = await fetch(`/api/questions?companyId=${companyId}`)
      if (!questionsRes.ok) throw new Error('Failed to load questions')
      const { questions: allQuestions } = await questionsRes.json()

      const grouped: Record<string, Question[]> = {}
      for (const q of allQuestions as Question[]) {
        if (!grouped[q.briCategory]) {
          grouped[q.briCategory] = []
        }
        grouped[q.briCategory].push(q)
      }
      setQuestionsByCategory(grouped)

      // Fetch existing responses to determine which categories are done
      const responsesRes = await fetch(`/api/assessments/${aId}/responses`)
      if (responsesRes.ok) {
        const { responses } = await responsesRes.json()

        // Count answered questions per category
        const answeredByCategory: Record<string, Set<string>> = {}
        for (const r of responses) {
          const question = (allQuestions as Question[]).find(q => q.id === r.questionId)
          if (question) {
            if (!answeredByCategory[question.briCategory]) {
              answeredByCategory[question.briCategory] = new Set()
            }
            answeredByCategory[question.briCategory].add(r.questionId)
          }
        }

        // Mark categories as completed if all questions answered
        const done = new Set<string>()
        for (const [cat, questions] of Object.entries(grouped)) {
          const answered = answeredByCategory[cat]
          if (answered && answered.size >= questions.length) {
            done.add(cat)
          }
        }
        setCompletedCategories(done)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleCategoryComplete = (category: BRICategory) => {
    setCompletedCategories(prev => {
      const next = new Set(prev)
      next.add(category)
      return next
    })
    setExpandedCategory(null)
  }

  const handleContinue = async () => {
    setFinishing(true)
    setTaskGenError(null)
    try {
      const allDone = completedCategories.size >= BRI_CATEGORIES.length

      if (allDone && assessmentId && !isAssessmentCompleted) {
        // All 6 categories completed — complete the full assessment (scoring + task generation)
        const res = await fetch(`/api/assessments/${assessmentId}/complete`, {
          method: 'POST',
        })
        if (!res.ok) {
          throw new Error('Failed to complete assessment')
        }
      } else {
        // Partial or skip — generate tasks from QuickScan risk results
        const res = await fetch('/api/tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            riskResults: {
              briScore: riskResults.briScore,
              categoryScores: riskResults.categoryScores,
              valueGapByCategory: riskResults.valueGapByCategory,
            },
            riskQuestionAnswers: {},
          }),
        })
        if (!res.ok) {
          throw new Error('Failed to generate tasks')
        }
      }

      // Success — clean up and proceed
      sessionStorage.removeItem('onboarding_deepdive_assessmentId')
      setFinishing(false)
      onFinish()
    } catch (err) {
      console.error('[DeepDiveStep] Task generation error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate action plan'

      if (retryCount < 2) {
        // Show error with retry option
        setTaskGenError(errorMessage)
        setFinishing(false)
      } else {
        // After 2 failed retries, allow user to continue
        sessionStorage.removeItem('onboarding_deepdive_assessmentId')
        setFinishing(false)
        onFinish()
      }
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    handleContinue()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {error}
        </div>
        <Button onClick={() => onFinish()}>Continue to Dashboard</Button>
      </div>
    )
  }

  const completedCount = completedCategories.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Refine Your Risk Profile
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Answer detailed questions in each category to get a more accurate diagnosis.
          This is optional — you can skip straight to your dashboard.
        </p>
      </motion.div>

      {/* Progress pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center"
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-sm font-medium">
          <span className="text-primary font-semibold">{completedCount}</span>
          <span className="text-muted-foreground">/ {BRI_CATEGORIES.length} categories assessed</span>
        </span>
      </motion.div>

      {/* Category cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {BRI_CATEGORIES.map((category) => {
          const isCompleted = completedCategories.has(category)
          const isExpanded = expandedCategory === category
          const questions = questionsByCategory[category] || []
          const score = riskResults.categoryScores[category]
          const borderColor = BRI_CATEGORY_BORDER_COLORS[category]

          return (
            <motion.div
              key={category}
              layout
              className={cn(
                'rounded-xl border bg-card transition-all',
                isExpanded ? 'sm:col-span-2' : '',
                isCompleted ? 'border-emerald-500/30' : 'border-border',
              )}
            >
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {/* Color accent dot */}
                  <div className={cn('w-2.5 h-2.5 rounded-full border-2', borderColor)} />

                  {/* Category name + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {BRI_CATEGORY_LABELS[category]}
                      </h3>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <Check className="w-3 h-3" />
                          Done
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        QuickScan: {score !== undefined ? `${score}%` : 'N/A'}
                      </span>
                      {questions.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {questions.length} questions
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  {!isExpanded && !isCompleted && questions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedCategory(category)}
                      className="shrink-0 gap-1 text-xs"
                    >
                      Start
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                  {!isExpanded && isCompleted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedCategory(category)}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded assessment flow */}
              <AnimatePresence>
                {isExpanded && assessmentId && (
                  <CategoryAssessmentFlow
                    category={category}
                    categoryLabel={BRI_CATEGORY_LABELS[category]}
                    assessmentId={assessmentId}
                    companyId={companyId}
                    onClose={() => setExpandedCategory(null)}
                    onComplete={() => handleCategoryComplete(category)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Task generation error */}
      <AnimatePresence>
        {taskGenError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
          >
            <p className="text-sm text-destructive mb-3">{taskGenError}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={finishing}
              >
                {finishing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </Button>
              {retryCount >= 1 && (
                <p className="text-xs text-muted-foreground flex items-center">
                  We're generating your action plan. It'll be ready when you reach your dashboard.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-2"
      >
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleContinue}
          disabled={finishing}
        >
          {finishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing your dashboard...
            </>
          ) : (
            <>
              Continue to Dashboard
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
        {completedCount === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            You can always refine your assessment later from the Diagnosis page.
          </p>
        )}
      </motion.div>
    </div>
  )
}
