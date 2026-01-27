'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
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
  HelpCircle,
  MinusCircle,
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

interface AssessmentWizardProps {
  companyId: string
  companyName: string
  title?: string
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
  const [showSkippedWarning, setShowSkippedWarning] = useState(false)
  const [recentlySelected, setRecentlySelected] = useState<string | null>(null)

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
        const questionsRes = await fetch('/api/questions')
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

        if (assessment.completedAt) {
          isRedirecting = true
          router.push('/dashboard')
          return
        }

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
        if (!isRedirecting) {
          setLoading(false)
        }
      }
    }

    initAssessment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  // Advance to next question
  const advanceToNext = useCallback(() => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuestionIndex, orderedQuestions.length])

  // Handle answer selection - SMOOTH FLOW: click = save = advance
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
      }, 500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setRecentlySelected(null)
    } finally {
      setSaving(false)
    }
  }

  // Mark current answer as uncertain
  const markAsUncertain = async () => {
    if (!currentQuestion) return
    const currentResponse = responses.get(currentQuestion.id)
    if (currentResponse && currentResponse.selectedOptionId) {
      await handleAnswer(currentResponse.selectedOptionId, 'UNCERTAIN')
    }
  }

  // Mark question as not applicable to this business
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

      // Auto-advance after a brief moment
      setTimeout(() => {
        advanceToNext()
      }, 500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

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

      setCelebrationData({
        briScore: data.summary?.briScore || 0,
        currentValue: data.summary?.currentValue || 0,
      })
      setShowCelebration(true)
      setSaving(false)

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#B87333', '#3D3D3D', '#FFD700', '#FFFFFF']
      })

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

  // Celebration screen
  if (showCelebration && celebrationData) {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[500px] text-center px-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="relative w-28 h-28 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            >
              <Check className="w-14 h-14 text-white" strokeWidth={3} />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl font-bold text-foreground mb-3 font-display"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Assessment Complete!
        </motion.h1>
        <motion.p
          className="text-lg text-muted-foreground mb-6 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Your Buyer Readiness Index has been calculated
        </motion.p>

        {(celebrationData.briScore > 0 || celebrationData.currentValue > 0) && (
          <motion.div
            className="flex gap-8 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {celebrationData.briScore > 0 && (
              <div className="text-center">
                <motion.p
                  className="text-5xl font-bold text-primary font-display"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                >
                  {Math.round(celebrationData.briScore)}
                </motion.p>
                <p className="text-sm text-muted-foreground mt-1">BRI Score</p>
              </div>
            )}
            {celebrationData.currentValue > 0 && (
              <div className="text-center">
                <motion.p
                  className="text-5xl font-bold text-emerald-600 font-display"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                >
                  {formatCurrency(celebrationData.currentValue)}
                </motion.p>
                <p className="text-sm text-muted-foreground mt-1">Estimated Value</p>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          className="flex items-center gap-2 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Taking you to your dashboard...</span>
        </motion.div>
      </motion.div>
    )
  }

  const allAnswered = responses.size >= orderedQuestions.length
  const currentResponse = currentQuestion ? responses.get(currentQuestion.id) : null
  const isCurrentUncertain = currentResponse?.confidenceLevel === 'UNCERTAIN'
  const isCurrentNotApplicable = currentResponse?.confidenceLevel === 'NOT_APPLICABLE'

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">{title}</h1>
        <p className="text-lg text-muted-foreground mt-1">{companyName}</p>
      </div>

      {/* Category Navigation - Simplified */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
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
              onClick={() => firstQuestionIndex >= 0 && setCurrentQuestionIndex(firstQuestionIndex)}
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

      {/* Progress Bar - Clean and simple */}
      <div className="bg-card rounded-xl border border-border p-4">
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
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span>{responses.size} answered</span>
          <span>{orderedQuestions.length - responses.size} remaining</span>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Question - THE MAIN EVENT */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
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
              <h2 className="text-xl font-semibold text-foreground leading-relaxed">
                {currentQuestion.questionText}
              </h2>
              {currentQuestion.helpText && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {currentQuestion.helpText}
                </p>
              )}
            </div>

            {/* Answer Options - Clean, clickable, instant feedback */}
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
                        {/* Selection indicator */}
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
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </div>

                        {/* Option text */}
                        <span className={cn(
                          "text-sm leading-relaxed flex-1",
                          isSelected ? "text-foreground font-medium" : "text-foreground/80"
                        )}>
                          {option.optionText}
                        </span>

                        {/* Saving indicator */}
                        {isRecentlySelected && saving && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  )
                })}

              {/* "Doesn't apply" option - always visible */}
              <AnimatePresence mode="wait">
                {isCurrentNotApplicable ? (
                  <motion.div
                    key="na-state"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <MinusCircle className="w-4 h-4" />
                    Marked as not applicable to your business
                  </motion.div>
                ) : (
                  <motion.button
                    key="na-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={markAsNotApplicable}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    This doesn&apos;t apply to my business
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Subtle "Not sure" option - appears after answering (but not for N/A) */}
              <AnimatePresence>
                {currentResponse && !isCurrentUncertain && !isCurrentNotApplicable && currentResponse.selectedOptionId && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={markAsUncertain}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Not sure about this answer? Click to flag for review
                  </motion.button>
                )}
                {isCurrentUncertain && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 py-2 text-xs text-amber-600 dark:text-amber-400"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Flagged as uncertain - we&apos;ll help you clarify this later
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
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
            onClick={handleCompleteWithWarningCheck}
            disabled={saving}
            className="gap-2 px-6 bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                Complete Assessment
                <Check className="w-4 h-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(Math.min(orderedQuestions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex >= orderedQuestions.length - 1}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Skipped questions warning dialog */}
      <AnimatePresence>
        {showSkippedWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Incomplete Assessment</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have {getSkippedQuestions().length} unanswered question{getSkippedQuestions().length !== 1 ? 's' : ''}. This will affect the accuracy of your results.
                  </p>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
