'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { BRI_CATEGORY_LABELS, BRI_CATEGORY_ORDER } from '@/lib/constants/bri-categories'
import { analytics } from '@/lib/analytics'
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
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

export function AssessmentWizard({ companyId, companyName, title: _title = 'Buyer Readiness Assessment' }: AssessmentWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, Response>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{ briScore: number; currentValue: number; tasksCreated?: number } | null>(null)
  const [revealStage, setRevealStage] = useState(0)
  const [showSkippedWarning, setShowSkippedWarning] = useState(false)
  const [recentlySelected, setRecentlySelected] = useState<string | null>(null)

  // Analytics tracking state
  const assessmentStartTime = useRef<number>(0)
  const questionStartTime = useRef<number>(0)
  const questionsViewed = useRef<Set<number>>(new Set())
  const hasTrackedStart = useRef(false)
  const lastQuestionIndex = useRef<number>(-1)

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
        // Trigger AI question generation if dossier exists (non-blocking failure)
        if (companyId) {
          try {
            await fetch(`/api/companies/${companyId}/dossier/generate-questions`, {
              method: 'POST',
            })
          } catch {
            // Silently fall back to existing questions
          }
        }

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

        if (assessment.completedAt) {
          isRedirecting = true
          router.push('/dashboard')
          return
        }

        // Track assessment started
        assessmentStartTime.current = Date.now()
        hasTrackedStart.current = true

        analytics.track('assessment_started', {
          assessmentId: assessment.id,
          assessmentType: 'initial',
          totalQuestions: fetchedQuestions.length,
          isFirstAssessment: true,
        })

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

  // Track question display when question index changes
  useEffect(() => {
    if (!assessmentId || orderedQuestions.length === 0) return
    if (currentQuestionIndex === lastQuestionIndex.current) return

    const question = orderedQuestions[currentQuestionIndex]
    if (!question) return

    // Track time spent on previous question
    if (lastQuestionIndex.current >= 0 && questionStartTime.current > 0) {
      const timeOnQuestion = Date.now() - questionStartTime.current
      analytics.track('question_time', {
        assessmentId,
        questionNumber: lastQuestionIndex.current + 1,
        timeSpent: timeOnQuestion,
      })
    }

    // Track question displayed
    const isFirstView = !questionsViewed.current.has(currentQuestionIndex)
    questionsViewed.current.add(currentQuestionIndex)

    analytics.track('question_displayed', {
      assessmentId,
      questionId: question.id,
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: orderedQuestions.length,
      category: question.briCategory,
      isFirstView,
    })

    // Reset question timer
    questionStartTime.current = Date.now()
    lastQuestionIndex.current = currentQuestionIndex
  }, [currentQuestionIndex, assessmentId, orderedQuestions])

  // Track assessment abandonment on unmount
  useEffect(() => {
    const trackAbandonment = () => {
      if (!assessmentId || !hasTrackedStart.current) return
      if (showCelebration) return // Don't track abandonment if completed

      const totalTime = assessmentStartTime.current > 0
        ? Date.now() - assessmentStartTime.current
        : 0

      analytics.track('assessment_abandoned', {
        assessmentId,
        assessmentType: 'initial',
        questionsAnswered: responses.size,
        totalQuestions: orderedQuestions.length,
        lastQuestionViewed: currentQuestionIndex + 1,
        totalTime,
        completionRate: orderedQuestions.length > 0
          ? (responses.size / orderedQuestions.length) * 100
          : 0,
      })
    }

    const handleBeforeUnload = () => {
      trackAbandonment()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      trackAbandonment()
    }
  }, [assessmentId, currentQuestionIndex, responses.size, orderedQuestions.length, showCelebration])

  // Advance to next question
  const advanceToNext = useCallback(() => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuestionIndex, orderedQuestions.length])

  // Handle answer selection - SMOOTH FLOW: click = save = advance
  const handleAnswer = async (optionId: string, confidenceLevel: string = 'CONFIDENT') => {
    if (!assessmentId || !currentQuestion || saving) return

    const selectedOption = currentQuestion.options.find(o => o.id === optionId)
    const previousResponse = responses.get(currentQuestion.id)
    const timeToAnswer = questionStartTime.current > 0
      ? Date.now() - questionStartTime.current
      : 0

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

      // Track question response
      analytics.track('question_response', {
        assessmentId,
        questionId: currentQuestion.id,
        questionNumber: currentQuestionIndex + 1,
        category: currentQuestion.briCategory,
        responseValue: selectedOption ? parseFloat(selectedOption.scoreValue) : 0,
        timeToAnswer,
        wasEdited: !!previousResponse && previousResponse.selectedOptionId !== optionId,
        confidenceLevel,
      })

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

    const timeToAnswer = questionStartTime.current > 0
      ? Date.now() - questionStartTime.current
      : 0

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

      // Track question skipped/not applicable
      analytics.track('question_skipped', {
        assessmentId,
        questionId: currentQuestion.id,
        questionNumber: currentQuestionIndex + 1,
        category: currentQuestion.briCategory,
        skipReason: 'not_applicable',
        timeToSkip: timeToAnswer,
      })

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

  // Mark question as "I don't know" — doesn't block progress (BF-005)
  const markAsDontKnow = async () => {
    if (!assessmentId || !currentQuestion || saving) return

    const timeToAnswer = questionStartTime.current > 0
      ? Date.now() - questionStartTime.current
      : 0

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

      analytics.track('question_skipped', {
        assessmentId,
        questionId: currentQuestion.id,
        questionNumber: currentQuestionIndex + 1,
        category: currentQuestion.briCategory,
        skipReason: 'dont_know',
        timeToSkip: timeToAnswer,
      })

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

  // Score interpretation with honest framing
  const getScoreInterpretation = (briScore: number) => {
    if (briScore >= 75) {
      return {
        headline: "Strong Foundation",
        message: "Your business shows strong buyer appeal. Fine-tuning a few areas could push you into premium territory.",
        tone: "positive"
      }
    }
    if (briScore >= 60) {
      return {
        headline: "Solid Position",
        message: "You have good fundamentals. Addressing key gaps could meaningfully increase what buyers would pay.",
        tone: "encouraging"
      }
    }
    if (briScore >= 45) {
      return {
        headline: "Room to Grow",
        message: "Your score indicates several areas that would concern buyers. The good news: these are addressable. Your action plan targets the highest-impact improvements.",
        tone: "constructive"
      }
    }
    // Below 45 - be honest
    return {
      headline: "Work to Do",
      message: "Let's be direct: buyers would see significant risks in your current state. But that's why you're here. The action plan we've created addresses the critical gaps — start with the high-impact items.",
      tone: "honest"
    }
  }

  // Progress through reveal stages when celebration shows
  useEffect(() => {
    if (showCelebration) {
      setRevealStage(0)
      const timers = [
        setTimeout(() => setRevealStage(1), 500),   // Show score
        setTimeout(() => setRevealStage(2), 2000),  // Show context
        setTimeout(() => setRevealStage(3), 3500),  // Show next step
      ]
      return () => timers.forEach(clearTimeout)
    }
  }, [showCelebration])

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

    const totalAssessmentTime = assessmentStartTime.current > 0
      ? Date.now() - assessmentStartTime.current
      : 0

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

      // Track assessment completed
      analytics.track('assessment_completed', {
        assessmentId,
        assessmentType: 'initial',
        totalTime: totalAssessmentTime,
        questionsAnswered: responses.size,
        totalQuestions: orderedQuestions.length,
        completionRate: orderedQuestions.length > 0
          ? (responses.size / orderedQuestions.length) * 100
          : 100,
      })

      // Track results displayed
      analytics.track('results_displayed', {
        assessmentId,
        briScoreBefore: null,
        briScoreAfter: data.summary?.briScore ?? null,
        briImpact: null,
        tasksCreated: 0,
        keyFindingsCount: 0,
        estimatedValue: data.summary?.currentValue ?? null,
      })

      // Reset tracking state
      hasTrackedStart.current = false

      // Set initial celebration data (tasksCreated will be fetched async)
      setCelebrationData({
        briScore: data.summary?.briScore || 0,
        currentValue: data.summary?.currentValue || 0,
        tasksCreated: undefined, // Will be populated async
      })
      setShowCelebration(true)
      setSaving(false)

      // Trigger confetti
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

      // Fetch task count async (don't block celebration)
      try {
        const tasksRes = await fetch(`/api/tasks?companyId=${companyId}&status=PENDING`)
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          const taskCount = tasksData.stats?.pending || tasksData.tasks?.length || 0
          setCelebrationData(prev => prev ? { ...prev, tasksCreated: taskCount } : null)
        } else {
          // If fetch fails, just show "Assessment complete"
          setCelebrationData(prev => prev ? { ...prev, tasksCreated: 0 } : null)
        }
      } catch {
        // If fetch fails, just show "Assessment complete"
        setCelebrationData(prev => prev ? { ...prev, tasksCreated: 0 } : null)
      }

      // NO auto-redirect - user clicks CTA to navigate
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

  // Celebration screen - Staged reveal
  if (showCelebration && celebrationData) {
    const briScore = Math.round(celebrationData.briScore)
    const interpretation = getScoreInterpretation(briScore)
    const tasksCreated = celebrationData.tasksCreated

    return (
      <motion.div
        className="relative flex flex-col items-center justify-center min-h-[600px] text-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Stage 1: Score Reveal */}
        <AnimatePresence>
          {revealStage >= 1 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mb-8"
            >
              {/* Score Circle */}
              <div className="relative w-48 h-48 mx-auto">
                {/* Animated ring */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="rgba(184, 115, 51, 0.2)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="#B87333"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 54}
                    initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - briScore / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>

                {/* Score number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className="text-6xl font-bold text-foreground font-display"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {briScore}
                  </motion.span>
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">
                    Buyer Readiness Index
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 2: Context - with HONEST score messaging */}
        <AnimatePresence>
          {revealStage >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 max-w-md"
            >
              <h2 className="text-2xl font-bold text-foreground font-display mb-3">
                {interpretation.headline}
              </h2>
              <p className="text-muted-foreground">
                {interpretation.message}
              </p>

              {/* Benchmark context */}
              <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">How you compare:</span>
                  {' '}Businesses with BRI scores above 75 typically command
                  <span className="text-primary font-semibold"> 20-40% higher multiples</span>
                  {' '}than industry average.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 3: Next Step CTA */}
        <AnimatePresence>
          {revealStage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Tasks badge - handle loading/async */}
              {tasksCreated === undefined ? (
                // Still calculating
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Building your action plan...
                  </span>
                </div>
              ) : tasksCreated > 0 ? (
                // Tasks ready
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {tasksCreated} personalized actions created
                  </span>
                </motion.div>
              ) : (
                // No tasks (edge case - assessment complete but no new tasks)
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">
                    Assessment complete
                  </span>
                </div>
              )}

              {/* Primary CTA */}
              <div>
                <Button
                  size="lg"
                  onClick={() => router.push('/dashboard/action-center')}
                  className="px-8 py-6 text-lg shadow-xl shadow-primary/25"
                >
                  See Your Action Plan
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              {/* Secondary option */}
              <p className="text-sm text-muted-foreground">
                or{' '}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-primary hover:underline"
                >
                  return to dashboard
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  const allAnswered = responses.size >= orderedQuestions.length
  const currentResponse = currentQuestion ? responses.get(currentQuestion.id) : null
  const isCurrentUncertain = currentResponse?.confidenceLevel === 'UNCERTAIN' && !!currentResponse?.selectedOptionId
  const isCurrentDontKnow = currentResponse?.confidenceLevel === 'UNCERTAIN' && !currentResponse?.selectedOptionId
  const isCurrentNotApplicable = currentResponse?.confidenceLevel === 'NOT_APPLICABLE'

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Assessment Header - Dynamic based on progress */}
      <motion.div
        className="text-center mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Progress context badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Discovering your buyer appeal
          </span>
        </div>

        {/* Dynamic headline based on progress */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display tracking-tight mb-2">
          {currentCategory
            ? `How's Your ${CATEGORY_LABELS[currentCategory]}?`
            : `Let's Evaluate ${companyName}`}
        </h1>

        <p className="text-muted-foreground max-w-md mx-auto">
          {orderedQuestions.length - responses.size > 5
            ? "Each answer helps us understand how buyers would see your business."
            : orderedQuestions.length - responses.size > 0
              ? "Almost there — these final questions complete your profile."
              : "Review your answers, then see your results."}
        </p>
      </motion.div>

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
              onClick={() => {
                if (firstQuestionIndex >= 0) {
                  analytics.track('progress_indicator_interaction', {
                    assessmentId: assessmentId || '',
                    fromQuestion: currentQuestionIndex + 1,
                    toQuestion: firstQuestionIndex + 1,
                    direction: firstQuestionIndex > currentQuestionIndex ? 'forward' : 'backward',
                    navigationType: 'category',
                  })
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

      {/* Progress Bar - With category encouragement */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {(() => {
              const catQuestions = questionsByCategory[currentCategory] || []
              const catAnswered = catQuestions.filter(q => responses.has(q.id)).length
              const catRemaining = catQuestions.length - catAnswered
              if (catRemaining === 0 && catQuestions.length > 0) {
                return `${CATEGORY_LABELS[currentCategory]} complete!`
              }
              if (catRemaining <= 2 && catRemaining > 0) {
                return `${catRemaining} more in ${CATEGORY_LABELS[currentCategory]?.split(' ')[0]}`
              }
              return 'Overall Progress'
            })()}
          </span>
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
                {currentQuestion.companyId && (
                  <Sparkles className="w-3.5 h-3.5 text-violet-500/70 dark:text-violet-400/70" />
                )}
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
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !saving) {
                          e.preventDefault()
                          handleAnswer(option.id)
                        }
                      }}
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

              {/* Skip options: "I don't know" and "Doesn't apply" (BF-005) */}
              <div className="flex items-center justify-center gap-4 pt-1">
                {/* "I don't know" - skip without blocking progress */}
                <AnimatePresence mode="wait">
                  {isCurrentDontKnow ? (
                    <motion.div
                      key="dk-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Marked as &quot;I don&apos;t know&quot; &mdash; you can revisit later
                    </motion.div>
                  ) : (
                    <motion.button
                      key="dk-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={markAsDontKnow}
                      disabled={saving}
                      className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      I don&apos;t know
                    </motion.button>
                  )}
                </AnimatePresence>

                {!isCurrentDontKnow && !isCurrentNotApplicable && (
                  <span className="text-muted-foreground/30">|</span>
                )}

                {/* "Doesn't apply" */}
                <AnimatePresence mode="wait">
                  {isCurrentNotApplicable ? (
                    <motion.div
                      key="na-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-xs text-slate-500"
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      Marked as not applicable
                    </motion.div>
                  ) : (
                    <motion.button
                      key="na-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={markAsNotApplicable}
                      disabled={saving}
                      className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      Doesn&apos;t apply
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* "Not sure" flag - appears after answering (not for N/A or Don't Know) */}
              <AnimatePresence>
                {currentResponse && !isCurrentUncertain && !isCurrentDontKnow && !isCurrentNotApplicable && currentResponse.selectedOptionId && (
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
          onClick={() => {
            const newIndex = Math.max(0, currentQuestionIndex - 1)
            analytics.track('progress_indicator_interaction', {
              assessmentId: assessmentId || '',
              fromQuestion: currentQuestionIndex + 1,
              toQuestion: newIndex + 1,
              direction: 'backward',
              navigationType: 'button',
            })
            setCurrentQuestionIndex(newIndex)
          }}
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
            onClick={() => {
              const newIndex = Math.min(orderedQuestions.length - 1, currentQuestionIndex + 1)
              analytics.track('progress_indicator_interaction', {
                assessmentId: assessmentId || '',
                fromQuestion: currentQuestionIndex + 1,
                toQuestion: newIndex + 1,
                direction: 'forward',
                navigationType: 'button',
              })
              setCurrentQuestionIndex(newIndex)
            }}
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
