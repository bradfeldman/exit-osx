'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { QuestionCard } from './QuestionCard'
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
} from 'lucide-react'

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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
} as const

const questionVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 80, damping: 15 }
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: { duration: 0.2 }
  }
} as const

const CATEGORY_LABELS: Record<string, string> = BRI_CATEGORY_LABELS
const CATEGORY_ORDER: string[] = [...BRI_CATEGORY_ORDER]

// Category icons
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
  const [pendingSelection, setPendingSelection] = useState<{ optionId: string; optionText: string } | null>(null)
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

      const newResponses = new Map(responses)
      newResponses.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        selectedOptionId: pendingSelection.optionId,
        confidenceLevel,
      })
      setResponses(newResponses)
      setPendingSelection(null)

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

  const handleAnswer = async (optionId: string) => {
    handleAnswerSelect(optionId)
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
        {/* Success animation */}
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
                  {Math.round(celebrationData.briScore * 100)}%
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

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">{title}</h1>
        <p className="text-lg text-muted-foreground mt-1">{companyName}</p>
      </motion.div>

      {/* Category Navigation Boxes */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        variants={itemVariants}
      >
        {CATEGORY_ORDER.map((cat, index) => {
          const catQuestions = questionsByCategory[cat] || []
          const catAnswered = catQuestions.filter(q => responses.has(q.id)).length
          const isComplete = catAnswered === catQuestions.length && catQuestions.length > 0
          const isCurrentCat = cat === currentCategory
          const progressPercent = catQuestions.length > 0 ? (catAnswered / catQuestions.length) * 100 : 0
          const firstQuestionIndex = orderedQuestions.findIndex(q => q.briCategory === cat)
          const Icon = CATEGORY_ICONS[cat] || Settings

          return (
            <motion.button
              key={cat}
              onClick={() => firstQuestionIndex >= 0 && setCurrentQuestionIndex(firstQuestionIndex)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 ${
                isComplete
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : isCurrentCat
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              {/* Progress fill from bottom */}
              {!isComplete && progressPercent > 0 && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-primary/10"
                  initial={{ height: 0 }}
                  animate={{ height: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              )}

              {/* Content */}
              <div className="relative">
                {/* Icon/Status */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isCurrentCat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Label */}
                <div className={`text-sm font-semibold truncate ${
                  isComplete
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isCurrentCat
                    ? 'text-primary'
                    : 'text-foreground'
                }`}>
                  {CATEGORY_LABELS[cat]}
                </div>

                {/* Status text */}
                <div className={`text-xs mt-1 ${
                  isComplete
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-muted-foreground'
                }`}>
                  {isComplete ? 'Complete' : `${catAnswered}/${catQuestions.length} answered`}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Overall Progress Bar */}
      <motion.div
        className="bg-card rounded-2xl border border-border p-5"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            Overall Progress
          </span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{responses.size} answered</span>
          <span>{orderedQuestions.length - responses.size} remaining</span>
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            variants={questionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg"
          >
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="px-3 py-1.5 bg-primary/10 text-primary font-semibold rounded-lg">
                  {CATEGORY_LABELS[currentQuestion.briCategory]}
                </span>
                <span className="text-muted-foreground">
                  Question {categoryQuestionIndex + 1} of {categoryQuestions.length}
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

              {/* Confirmation panel */}
              <AnimatePresence>
                {pendingSelection && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 10, height: 0 }}
                    className="mt-4 p-5 bg-primary/5 border border-primary/20 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Selected: {pendingSelection.optionText}</p>
                        <p className="text-xs text-muted-foreground mt-1">How confident are you in this answer?</p>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <motion.button
                            onClick={() => handleAnswerConfirm('UNCERTAIN')}
                            disabled={saving}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                          >
                            Uncertain
                          </motion.button>
                          <motion.button
                            onClick={() => handleAnswerConfirm('SOMEWHAT_CONFIDENT')}
                            disabled={saving}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400"
                          >
                            Somewhat Confident
                          </motion.button>
                          <motion.button
                            onClick={() => handleAnswerConfirm('CONFIDENT')}
                            disabled={saving}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400"
                          >
                            Confident
                          </motion.button>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div
        className="flex justify-between"
        variants={itemVariants}
      >
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
      </motion.div>

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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
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
                  className="flex-1 bg-primary hover:bg-primary/90"
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
