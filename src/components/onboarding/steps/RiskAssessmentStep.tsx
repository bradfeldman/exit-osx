'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { BRI_CATEGORY_LABELS, BRI_CATEGORY_ORDER } from '@/lib/constants/bri-categories'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  DollarSign,
  Users,
  Settings,
  Target,
  Scale,
  User,
  MinusCircle,
  Sparkles,
} from 'lucide-react'
import styles from '@/components/onboarding/onboarding.module.css'

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

interface RiskAssessmentStepProps {
  companyId: string
  companyName: string
  onComplete: (data: {
    briScore: number
    currentValue: number
    potentialValue: number
    valueGap: number
    categoryScores: Array<{ category: string; score: number }>
    tasksCreated: number
    topTask: { id: string; title: string; description: string; category: string; estimatedValue: number } | null
  }) => void
  onSkip: () => void
}

const CATEGORY_LABELS: Record<string, string> = BRI_CATEGORY_LABELS
const CATEGORY_ORDER: string[] = [...BRI_CATEGORY_ORDER]

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FINANCIAL: DollarSign,
  TRANSFERABILITY: Users,
  OPERATIONAL: Settings,
  MARKET: Target,
  LEGAL_TAX: Scale,
  PERSONAL: User,
}

const COMPLETION_STEPS = [
  { label: 'Analyzing your responses', duration: 800 },
  { label: 'Calculating your BRI score', duration: 1000 },
  { label: 'Identifying key risks', duration: 1200 },
  { label: 'Building your action plan', duration: 1500 },
  { label: 'Preparing your results', duration: 800 },
]

export function RiskAssessmentStep({
  companyId,
  companyName,
  onComplete,
  onSkip,
}: RiskAssessmentStepProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completingStep, setCompletingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, Response>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [recentlySelected, setRecentlySelected] = useState<string | null>(null)

  const questionStartTime = useRef<number>(Date.now())

  const questionsByCategory = questions.reduce((acc, q) => {
    if (!acc[q.briCategory]) acc[q.briCategory] = []
    acc[q.briCategory].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  const orderedQuestions = CATEGORY_ORDER.flatMap(
    cat => questionsByCategory[cat] || []
  )

  const currentQuestion = orderedQuestions[currentQuestionIndex]
  const progress = orderedQuestions.length > 0
    ? Math.round((responses.size / orderedQuestions.length) * 100)
    : 0

  const currentCategory = currentQuestion?.briCategory
  const categoryQuestions = currentCategory ? questionsByCategory[currentCategory] : []
  const categoryQuestionIndex = categoryQuestions.findIndex(q => q.id === currentQuestion?.id)

  useEffect(() => {
    async function initAssessment() {
      try {
        const questionsUrl = companyId
          ? `/api/questions?companyId=${companyId}`
          : '/api/questions'
        const questionsRes = await fetch(questionsUrl)
        if (!questionsRes.ok) throw new Error('Failed to load questions')
        const { questions: fetchedQuestions } = await questionsRes.json()
        setQuestions(fetchedQuestions)

        const assessmentRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId }),
        })
        if (!assessmentRes.ok) throw new Error('Failed to create assessment')
        const { assessment } = await assessmentRes.json()
        setAssessmentId(assessment.id)

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
        setLoading(false)
      }
    }

    initAssessment()
  }, [companyId])

  useEffect(() => {
    if (!completing) {
      setCompletingStep(0)
      return
    }

    const step = COMPLETION_STEPS[completingStep]
    if (!step) return

    const timer = setTimeout(() => {
      if (completingStep < COMPLETION_STEPS.length - 1) {
        setCompletingStep(prev => prev + 1)
      }
    }, step.duration)

    return () => clearTimeout(timer)
  }, [completing, completingStep])

  const advanceToNext = useCallback(() => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      questionStartTime.current = Date.now()
    }
  }, [currentQuestionIndex, orderedQuestions.length])

  const handleAnswer = async (optionId: string, confidenceLevel: string = 'CONFIDENT') => {
    if (!assessmentId || !currentQuestion || saving) return

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

  const markAsNotApplicable = async () => {
    if (!assessmentId || !currentQuestion || saving) return

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

      setTimeout(() => {
        advanceToNext()
      }, 400)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!assessmentId) return

    setCompleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/complete`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete assessment')
      }

      const dashboardRes = await fetch(`/api/companies/${companyId}/dashboard`)
      const dashboardData = await dashboardRes.json()
      const tier1 = dashboardData.tier1 || {}

      let tasksCreated = 0
      let topTask: { id: string; title: string; description: string; category: string; estimatedValue: number } | null = null
      try {
        const tasksRes = await fetch(`/api/tasks?companyId=${companyId}&status=PENDING`)
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          tasksCreated = tasksData.stats?.pending || tasksData.tasks?.length || 0

          if (tasksData.tasks && tasksData.tasks.length > 0) {
            const firstTask = tasksData.tasks[0]
            topTask = {
              id: firstTask.id,
              title: firstTask.title,
              description: firstTask.description || '',
              category: firstTask.briCategory || 'OPERATIONAL',
              estimatedValue: firstTask.estimatedValueImpact || 0,
            }
          }
        }
      } catch {
        // Ignore task fetch errors
      }

      const tier3 = dashboardData.tier3 || {}
      const categoryScores = tier3.categories
        ? tier3.categories.map((c: { key: string; score: number }) => ({
            category: c.key,
            score: c.score,
          }))
        : [
            { category: 'FINANCIAL', score: 50 },
            { category: 'TRANSFERABILITY', score: 50 },
            { category: 'OPERATIONAL', score: 50 },
            { category: 'MARKET', score: 50 },
            { category: 'LEGAL_TAX', score: 50 },
            { category: 'PERSONAL', score: 50 },
          ]

      await new Promise(resolve => setTimeout(resolve, COMPLETION_STEPS.reduce((acc, s) => acc + s.duration, 0)))

      onComplete({
        briScore: tier1.briScore || 0,
        currentValue: tier1.currentValue || 0,
        potentialValue: tier1.potentialValue || 0,
        valueGap: tier1.valueGap || 0,
        categoryScores,
        tasksCreated,
        topTask,
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
      setCompleting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.riskAssessLoadingWrap}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center' }}
        >
          <div className={styles.riskAssessLoadingSpinnerWrap}>
            <div className={styles.riskAssessLoadingTrack} />
            <div className={styles.riskAssessLoadingSpinner} />
          </div>
          <p className={styles.riskAssessLoadingText}>Loading assessment...</p>
        </motion.div>
      </div>
    )
  }

  // Completing state
  if (completing) {
    const completionPercent = ((completingStep + 1) / COMPLETION_STEPS.length) * 100

    return (
      <motion.div
        className={styles.riskAssessCompletingWrap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className={styles.riskAssessCompletingInner}>
          <motion.div
            className={styles.riskAssessCompletingCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className={styles.riskAssessCompletingHeader}>
              <div className={styles.riskAssessCompletingHeaderInner}>
                <div className={styles.riskAssessCompletingSpinnerWrap}>
                  <motion.div
                    className={styles.riskAssessCompletingSpinnerRing}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className={styles.riskAssessCompletingSpinnerIcon}>
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className={styles.riskAssessCompletingTitle}>
                    Calculating Your Results
                  </h2>
                  <p className={styles.riskAssessCompletingSubtitle}>
                    Analyzing {companyName}&apos;s risk profile
                  </p>
                </div>
              </div>

              <div className={styles.riskAssessCompletingProgressTrack}>
                <motion.div
                  className={styles.riskAssessCompletingProgressFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className={styles.riskAssessCompletingBody}>
              <div className={styles.riskAssessCompletingSteps}>
                {COMPLETION_STEPS.map((step, index) => {
                  const isCompleted = index < completingStep
                  const isCurrent = index === completingStep

                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`${styles.riskAssessCompletingStep}${isCurrent ? ` ${styles.riskAssessCompletingStepActive}` : ''}`}
                    >
                      <div className={styles.riskAssessCompletingSpinnerWrap}>
                        {isCompleted ? (
                          <motion.div
                            className={styles.riskAssessCompletingStepIconDone}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check className="w-5 h-5 text-emerald-600" />
                          </motion.div>
                        ) : isCurrent ? (
                          <div className={styles.riskAssessCompletingStepIconCurrent}>
                            <motion.div
                              className={styles.riskAssessCompletingStepDot}
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                              style={{ background: '#10b981', borderRadius: '50%', width: '0.75rem', height: '0.75rem' }}
                            />
                          </div>
                        ) : (
                          <div className={styles.riskAssessCompletingStepIconPending}>
                            <div className={styles.riskAssessCompletingStepDot} />
                          </div>
                        )}
                      </div>

                      <span className={
                        isCompleted
                          ? styles.riskAssessCompletingStepLabelDone
                          : isCurrent
                          ? styles.riskAssessCompletingStepLabelCurrent
                          : styles.riskAssessCompletingStepLabelPending
                      }>
                        {step.label}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  const allAnswered = responses.size >= orderedQuestions.length
  const currentResponse = currentQuestion ? responses.get(currentQuestion.id) : null
  const isCurrentNotApplicable = currentResponse?.confidenceLevel === 'NOT_APPLICABLE'

  return (
    <div className={styles.riskAssessContainer}>
      {/* Header */}
      <motion.div
        className={styles.riskAssessHeader}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.riskAssessModeBadge}>
          <Target className="w-4 h-4" />
          Risk Discovery
        </div>
        <h2 className={styles.riskAssessTitle}>
          {currentCategory
            ? `How's Your ${CATEGORY_LABELS[currentCategory]}?`
            : 'Discovering Your Risks'}
        </h2>
        <p className={styles.riskAssessRemaining}>
          {orderedQuestions.length - responses.size} questions remaining
        </p>
      </motion.div>

      {/* Category Navigation */}
      <div className={styles.riskAssessCategoryNav}>
        {CATEGORY_ORDER.map((cat) => {
          const catQuestions = questionsByCategory[cat] || []
          const catAnswered = catQuestions.filter(q => responses.has(q.id)).length
          const isComplete = catAnswered === catQuestions.length && catQuestions.length > 0
          const isCurrentCat = cat === currentCategory
          const firstQuestionIndex = orderedQuestions.findIndex(q => q.briCategory === cat)
          const Icon = CATEGORY_ICONS[cat] || Settings

          const btnClass = `${styles.riskAssessCategoryBtn} ${
            isComplete
              ? styles.riskAssessCategoryBtnComplete
              : isCurrentCat
              ? styles.riskAssessCategoryBtnActive
              : styles.riskAssessCategoryBtnDefault
          }`

          const iconClass = `${styles.riskAssessCategoryIconWrap} ${
            isComplete
              ? styles.riskAssessCategoryIconComplete
              : isCurrentCat
              ? styles.riskAssessCategoryIconActive
              : styles.riskAssessCategoryIconDefault
          }`

          const labelClass = isComplete
            ? styles.riskAssessCategoryLabelComplete
            : isCurrentCat
            ? styles.riskAssessCategoryLabelActive
            : styles.riskAssessCategoryLabelDefault

          return (
            <button
              key={cat}
              onClick={() => {
                if (firstQuestionIndex >= 0) {
                  setCurrentQuestionIndex(firstQuestionIndex)
                }
              }}
              className={btnClass}
            >
              <div className={iconClass}>
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className={`${styles.riskAssessCategoryLabel} ${labelClass}`}>
                {CATEGORY_LABELS[cat]?.split(' ')[0]}
              </div>
              <div className={styles.riskAssessCategoryCount}>
                {catAnswered}/{catQuestions.length}
              </div>
            </button>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className={styles.riskAssessProgressCard}>
        <div className={styles.riskAssessProgressTop}>
          <span className={styles.riskAssessProgressLabel}>Overall Progress</span>
          <span className={styles.riskAssessProgressValue}>{progress}%</span>
        </div>
        <div className={styles.riskAssessProgressTrack}>
          <motion.div
            className={styles.riskAssessProgressFill}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.riskAssessError}
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className={styles.riskAssessErrorText}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={styles.riskAssessQuestionCard}
          >
            {/* Question Header */}
            <div className={styles.riskAssessQuestionHeader}>
              <div className={styles.riskAssessQuestionMeta}>
                <span className={styles.riskAssessQuestionCategoryBadge}>
                  {CATEGORY_LABELS[currentQuestion.briCategory]}
                </span>
                <span className={styles.riskAssessQuestionCounter}>
                  Question {categoryQuestionIndex + 1} of {categoryQuestions.length}
                </span>
              </div>
              <h3 className={styles.riskAssessQuestionText}>
                {currentQuestion.questionText}
              </h3>
              {currentQuestion.helpText && (
                <p className={styles.riskAssessHelpText}>
                  {currentQuestion.helpText}
                </p>
              )}
            </div>

            {/* Answer Options */}
            <div className={styles.riskAssessOptions}>
              {[...currentQuestion.options]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((option) => {
                  const isSelected = currentResponse?.selectedOptionId === option.id
                  const isRecentlySelected = recentlySelected === option.id

                  const btnClass = [
                    styles.riskAssessOptionBtn,
                    isSelected ? styles.riskAssessOptionBtnSelected : '',
                    saving ? styles.riskAssessOptionBtnDisabled : '',
                  ].filter(Boolean).join(' ')

                  const radioClass = [
                    styles.riskAssessOptionRadio,
                    isSelected ? styles.riskAssessOptionRadioSelected : '',
                  ].filter(Boolean).join(' ')

                  const textClass = [
                    styles.riskAssessOptionText,
                    isSelected ? styles.riskAssessOptionTextSelected : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => !saving && handleAnswer(option.id)}
                      disabled={saving}
                      className={btnClass}
                      whileHover={!saving ? { scale: 1.01 } : {}}
                      whileTap={!saving ? { scale: 0.99 } : {}}
                    >
                      <div className={styles.riskAssessOptionInner}>
                        <div className={radioClass}>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </div>

                        <span className={textClass}>
                          {option.optionText}
                        </span>

                        {isRecentlySelected && saving && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  )
                })}

              {/* Not applicable option */}
              {isCurrentNotApplicable ? (
                <div className={styles.riskAssessNaMarked}>
                  <MinusCircle className="w-4 h-4" />
                  Marked as not applicable
                </div>
              ) : (
                <button
                  onClick={markAsNotApplicable}
                  disabled={saving}
                  className={styles.riskAssessNaBtn}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  This doesn&apos;t apply to my business
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.riskAssessNav}>
        <Button
          variant="ghost"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        {allAnswered ? (
          <Button
            onClick={handleComplete}
            disabled={saving || completing}
            className="gap-2 px-6 bg-emerald-600 hover:bg-emerald-700"
          >
            {completing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                See My Results
                <Check className="w-4 h-4" />
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
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Skip link */}
      {!completing && (
        <div className={styles.riskAssessSkipRow}>
          <button
            onClick={onSkip}
            className={styles.riskAssessSkipBtn}
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}
