'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
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
import styles from '@/components/onboarding/onboarding.module.css'

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
      <div className={styles.deepDiveLoadingState}>
        <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p className={styles.deepDiveLoadingText}>Loading assessment...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.deepDiveErrorState}>
        <div className={styles.deepDiveErrorBanner}>
          {error}
        </div>
        <Button onClick={() => onFinish()}>Continue to Dashboard</Button>
      </div>
    )
  }

  const completedCount = completedCategories.size

  return (
    <div className={styles.deepDiveRoot}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.deepDiveHeader}
      >
        <h2 className={styles.deepDiveTitle}>
          Refine Your Risk Profile
        </h2>
        <p className={styles.deepDiveSubtitle}>
          Answer detailed questions in each category to get a more accurate diagnosis.
          This is optional — you can skip straight to your dashboard.
        </p>
      </motion.div>

      {/* Progress pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={styles.deepDiveProgressWrap}
      >
        <span className={styles.deepDiveProgressPill}>
          <span className={styles.deepDiveProgressCount}>{completedCount}</span>
          <span className={styles.deepDiveProgressLabel}>/ {BRI_CATEGORIES.length} categories assessed</span>
        </span>
      </motion.div>

      {/* Category cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={styles.deepDiveCategoryGrid}
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
              className={`${styles.deepDiveCategoryCard} ${isCompleted ? styles.deepDiveCategoryCardCompleted : ''}`}
              style={isExpanded ? { gridColumn: '1 / -1' } : undefined}
            >
              {/* Card header */}
              <div className={styles.deepDiveCategoryHeader}>
                <div className={styles.deepDiveCategoryInner}>
                  {/* Color accent dot */}
                  <div className={`${styles.deepDiveAccentDot} ${borderColor}`} />

                  {/* Category name + info */}
                  <div className={styles.deepDiveCategoryMeta}>
                    <div className={styles.deepDiveCategoryTitleRow}>
                      <h3 className={styles.deepDiveCategoryName}>
                        {BRI_CATEGORY_LABELS[category]}
                      </h3>
                      {isCompleted && (
                        <span className={styles.deepDiveCompletedBadge}>
                          <Check style={{ width: '0.75rem', height: '0.75rem' }} />
                          Done
                        </span>
                      )}
                    </div>
                    <div className={styles.deepDiveCategoryStats}>
                      <span className={styles.deepDiveCategoryStat}>
                        QuickScan: {score !== undefined ? `${score}%` : 'N/A'}
                      </span>
                      {questions.length > 0 && (
                        <span className={styles.deepDiveCategoryStat}>
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
                      <ChevronRight style={{ width: '0.75rem', height: '0.75rem' }} />
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
            className={styles.deepDiveTaskGenError}
          >
            <p className={styles.deepDiveTaskGenErrorText}>{taskGenError}</p>
            <div className={styles.deepDiveTaskGenErrorActions}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={finishing}
              >
                {finishing ? (
                  <>
                    <Loader2 style={{ width: '0.75rem', height: '0.75rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </Button>
              {retryCount >= 1 && (
                <p className={styles.deepDiveRetryNote}>
                  We&apos;re generating your action plan. It&apos;ll be ready when you reach your dashboard.
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
        className={styles.deepDiveContinueWrap}
      >
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleContinue}
          disabled={finishing}
        >
          {finishing ? (
            <>
              <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
              Preparing your dashboard...
            </>
          ) : (
            <>
              Continue to Dashboard
              <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
            </>
          )}
        </Button>
        {completedCount === 0 && (
          <p className={styles.deepDiveSkipNote}>
            You can always refine your assessment later from the Diagnosis page.
          </p>
        )}
      </motion.div>
    </div>
  )
}
