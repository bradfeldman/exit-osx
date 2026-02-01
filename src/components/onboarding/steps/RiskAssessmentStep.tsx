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
import { cn } from '@/lib/utils'

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

  // Track question timing
  const questionStartTime = useRef<number>(Date.now())

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

  // Initialize assessment
  useEffect(() => {
    async function initAssessment() {
      try {
        // Load questions
        const questionsRes = await fetch('/api/questions')
        if (!questionsRes.ok) throw new Error('Failed to load questions')
        const { questions: fetchedQuestions } = await questionsRes.json()
        setQuestions(fetchedQuestions)

        // Create or get assessment
        const assessmentRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId }),
        })
        if (!assessmentRes.ok) throw new Error('Failed to create assessment')
        const { assessment } = await assessmentRes.json()
        setAssessmentId(assessment.id)

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
        setLoading(false)
      }
    }

    initAssessment()
  }, [companyId])

  // Animate through completion steps
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

  // Advance to next question
  const advanceToNext = useCallback(() => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      questionStartTime.current = Date.now()
    }
  }, [currentQuestionIndex, orderedQuestions.length])

  // Handle answer selection
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

      // Auto-advance after a brief moment
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

  // Complete assessment
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

      // Fetch updated dashboard data for reveal
      const dashboardRes = await fetch(`/api/companies/${companyId}/dashboard`)
      const dashboardData = await dashboardRes.json()
      const tier1 = dashboardData.tier1 || {}

      // Fetch task count
      let tasksCreated = 0
      try {
        const tasksRes = await fetch(`/api/tasks?companyId=${companyId}&status=PENDING`)
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          tasksCreated = tasksData.stats?.pending || tasksData.tasks?.length || 0
        }
      } catch {
        // Ignore task fetch errors
      }

      // Build category scores
      const categoryScores = [
        { category: 'FINANCIAL', score: tier1.briFinancial || 0 },
        { category: 'TRANSFERABILITY', score: tier1.briTransferability || 0 },
        { category: 'OPERATIONAL', score: tier1.briOperational || 0 },
        { category: 'MARKET', score: tier1.briMarket || 0 },
        { category: 'LEGAL_TAX', score: tier1.briLegalTax || 0 },
        { category: 'PERSONAL', score: tier1.briPersonal || 0 },
      ]

      // Wait for completion animation to finish
      await new Promise(resolve => setTimeout(resolve, COMPLETION_STEPS.reduce((acc, s) => acc + s.duration, 0)))

      onComplete({
        briScore: tier1.briScore || 0,
        currentValue: tier1.currentValue || 0,
        potentialValue: tier1.potentialValue || 0,
        valueGap: tier1.valueGap || 0,
        categoryScores,
        tasksCreated,
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete')
      setCompleting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-muted-foreground">Loading assessment...</p>
        </motion.div>
      </div>
    )
  }

  // Completing state
  if (completing) {
    const completionPercent = ((completingStep + 1) / COMPLETION_STEPS.length) * 100

    return (
      <motion.div
        className="flex items-center justify-center min-h-[500px] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-full max-w-lg">
          <motion.div
            className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-8 text-white">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16">
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display">
                    Calculating Your Results
                  </h2>
                  <p className="text-white/80">
                    Analyzing {companyName}&apos;s risk profile
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {COMPLETION_STEPS.map((step, index) => {
                  const isCompleted = index < completingStep
                  const isCurrent = index === completingStep

                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                        isCurrent ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <motion.div
                            className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                        ) : isCurrent ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <motion.div
                              className="w-3 h-3 rounded-full bg-emerald-500"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      <span className={`text-sm ${
                        isCompleted
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                          : isCurrent
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      }`}>
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
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm text-primary mb-3">
          <Target className="w-4 h-4" />
          Risk Discovery
        </div>
        <h2 className="text-xl font-bold text-foreground font-display">
          {currentCategory
            ? `How's Your ${CATEGORY_LABELS[currentCategory]}?`
            : 'Discovering Your Risks'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {orderedQuestions.length - responses.size} questions remaining
        </p>
      </motion.div>

      {/* Category Navigation */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {CATEGORY_ORDER.map((cat) => {
          const catQuestions = questionsByCategory[cat] || []
          const catAnswered = catQuestions.filter(q => responses.has(q.id)).length
          const isComplete = catAnswered === catQuestions.length && catQuestions.length > 0
          const isCurrentCat = cat === currentCategory
          const firstQuestionIndex = orderedQuestions.findIndex(q => q.briCategory === cat)
          const Icon = CATEGORY_ICONS[cat] || Settings

          return (
            <button
              key={cat}
              onClick={() => {
                if (firstQuestionIndex >= 0) {
                  setCurrentQuestionIndex(firstQuestionIndex)
                }
              }}
              className={cn(
                "relative rounded-xl p-3 text-center transition-all duration-200",
                isComplete
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800"
                  : isCurrentCat
                    ? "bg-primary/5 border-2 border-primary shadow-sm"
                    : "bg-card border border-border hover:border-primary/30"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2",
                isComplete
                  ? "bg-emerald-500 text-white"
                  : isCurrentCat
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
              )}>
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className={cn(
                "text-xs font-medium truncate",
                isComplete ? "text-emerald-700 dark:text-emerald-400" : isCurrentCat ? "text-primary" : "text-muted-foreground"
              )}>
                {CATEGORY_LABELS[cat]?.split(' ')[0]}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {catAnswered}/{catQuestions.length}
              </div>
            </button>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
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
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
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
            className="bg-card rounded-2xl border border-border overflow-hidden mb-6"
          >
            {/* Question Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary font-medium rounded-lg">
                  {CATEGORY_LABELS[currentQuestion.briCategory]}
                </span>
                <span className="text-muted-foreground">
                  Question {categoryQuestionIndex + 1} of {categoryQuestions.length}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground leading-relaxed">
                {currentQuestion.questionText}
              </h3>
              {currentQuestion.helpText && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {currentQuestion.helpText}
                </p>
              )}
            </div>

            {/* Answer Options */}
            <div className="px-6 pb-6 space-y-3">
              {[...currentQuestion.options]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((option) => {
                  const isSelected = currentResponse?.selectedOptionId === option.id
                  const isRecentlySelected = recentlySelected === option.id

                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => !saving && handleAnswer(option.id)}
                      disabled={saving}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30",
                        saving && "opacity-60 cursor-not-allowed"
                      )}
                      whileHover={!saving ? { scale: 1.01 } : {}}
                      whileTap={!saving ? { scale: 0.99 } : {}}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </div>

                        <span className={cn(
                          "text-sm leading-relaxed flex-1",
                          isSelected ? "text-foreground font-medium" : "text-foreground/80"
                        )}>
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
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800">
                  <MinusCircle className="w-4 h-4" />
                  Marked as not applicable
                </div>
              ) : (
                <button
                  onClick={markAsNotApplicable}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
      <div className="flex justify-between items-center">
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
      <div className="mt-6 text-center">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
