'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard'
import {
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  Info,
  TrendingUp,
} from 'lucide-react'

// Types
interface QuestionOption {
  id: string
  optionText: string
  scoreValue: number
  displayOrder: number
}

interface ProjectQuestion {
  id: string
  moduleId: string
  questionText: string
  helpText: string | null
  briCategory: string
  subCategory: string | null
  options: QuestionOption[]
}

interface AssessmentQuestion {
  id: string
  questionId: string
  displayOrder: number
  selectionReason: string
  priorityScore: number
  question: ProjectQuestion
}

interface ProjectAssessment {
  id: string
  assessmentNumber: number
  title: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  primaryCategory: string | null
  questions: AssessmentQuestion[]
  responses: Array<{
    questionId: string
    selectedOptionId: string
  }>
  completedAt: string | null
}

interface CompletionResult {
  briRefinement: {
    before: number | null
    after: number
    impact: number | null
  }
  actionPlan: {
    tasksCreated: number
    totalEstimatedHours: number
    estimatedValueImpact: number
    topTasks: Array<{ title: string; effortLevel: string }>
  }
  scoreImpactSummary: {
    overallChange: string
    keyFindings: string[]
  }
  milestone: {
    completedCount: number
    message: string
    isNewLearning: boolean
  }
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
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

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const PROGRESS_STEPS = [
  { label: 'Analyzing your company profile', duration: 800 },
  { label: 'Reviewing previous assessment responses', duration: 1000 },
  { label: 'Identifying high-impact questions', duration: 1200 },
  { label: 'Prioritizing by buyer readiness impact', duration: 1000 },
  { label: 'Preparing your assessment', duration: 800 },
]

const COMPLETION_STEPS = [
  { label: 'Analyzing your responses', duration: 1000 },
  { label: 'Calculating impact on BRI score', duration: 1200 },
  { label: 'Identifying key findings', duration: 1000 },
  { label: 'Generating personalized action items', duration: 1500 },
  { label: 'Preparing your results', duration: 800 },
]

export default function RiskAssessmentPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()

  const [loading, setLoading] = useState(true)
  const [needsInitialAssessment, setNeedsInitialAssessment] = useState(false)
  const [currentAssessment, setCurrentAssessment] = useState<ProjectAssessment | null>(null)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completingStep, setCompletingStep] = useState(0)
  const [resultsReady, setResultsReady] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingStep, setCreatingStep] = useState(0)
  const [assessmentReady, setAssessmentReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null)

  // Animate through progress steps when creating
  useEffect(() => {
    if (!creating) {
      setCreatingStep(0)
      setAssessmentReady(false)
      return
    }

    const step = PROGRESS_STEPS[creatingStep]
    if (!step) return

    const timer = setTimeout(() => {
      if (creatingStep < PROGRESS_STEPS.length - 1) {
        setCreatingStep(prev => prev + 1)
      }
    }, step.duration)

    return () => clearTimeout(timer)
  }, [creating, creatingStep])

  useEffect(() => {
    if (assessmentReady && creatingStep >= 3) {
      setCreating(false)
    }
  }, [assessmentReady, creatingStep])

  useEffect(() => {
    if (!completing) {
      setCompletingStep(0)
      setResultsReady(false)
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

  useEffect(() => {
    if (resultsReady && completingStep >= 3) {
      setCompleting(false)
    }
  }, [resultsReady, completingStep])

  const checkInitialAssessment = useCallback(async () => {
    if (!selectedCompanyId) return false

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (response.ok) {
        const data = await response.json()
        const briScore = data.tier1?.briScore
        const hasInitialAssessment = briScore !== null && briScore !== undefined

        if (!hasInitialAssessment) {
          setNeedsInitialAssessment(true)
          setLoading(false)
          return true
        }
      }
      setNeedsInitialAssessment(false)
      return false
    } catch {
      setNeedsInitialAssessment(false)
      return false
    }
  }, [selectedCompanyId])

  const loadProjectAssessment = useCallback(async () => {
    if (!selectedCompanyId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/project-assessments?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()

        const inProgress = data.assessments?.find((a: ProjectAssessment) => a.status === 'IN_PROGRESS')
        const mostRecent = data.assessments?.[0]

        const assessmentToShow = inProgress || mostRecent

        if (assessmentToShow) {
          const detailResponse = await fetch(`/api/project-assessments/${assessmentToShow.id}`)
          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            setCurrentAssessment(detailData.assessment)

            const existingResponses: Record<string, string> = {}
            for (const r of detailData.assessment.responses || []) {
              existingResponses[r.questionId] = r.selectedOptionId
            }
            setResponses(existingResponses)

            const firstUnanswered = detailData.assessment.questions.findIndex(
              (q: AssessmentQuestion) => !existingResponses[q.questionId]
            )
            if (firstUnanswered >= 0) {
              setCurrentQuestionIndex(firstUnanswered)
            }
          }
        } else {
          setCurrentAssessment(null)
        }
      }
    } catch {
      setError('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    async function init() {
      if (!selectedCompanyId) return

      const needsInitial = await checkInitialAssessment()
      if (!needsInitial) {
        await loadProjectAssessment()
      }
    }
    init()
  }, [selectedCompanyId, checkInitialAssessment, loadProjectAssessment])

  async function createNewAssessment() {
    if (!selectedCompanyId) return

    setCreating(true)
    setCreatingStep(0)
    setAssessmentReady(false)
    setError(null)
    setCompletionResult(null)

    try {
      const response = await fetch('/api/project-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          questionCount: 10,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentAssessment(data.assessment)
        setResponses({})
        setCurrentQuestionIndex(0)
        setAssessmentReady(true)
      } else {
        setError(data.error || 'Failed to create assessment')
        setCreating(false)
      }
    } catch {
      setError('Failed to create assessment')
      setCreating(false)
    }
  }

  async function saveResponse(questionId: string, optionId: string) {
    if (!currentAssessment) return

    setSaving(true)

    try {
      const response = await fetch(`/api/project-assessments/${currentAssessment.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          selectedOptionId: optionId,
          confidenceLevel: 'CONFIDENT',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to save response')
      }
    } catch {
      setError('Failed to save response')
    } finally {
      setSaving(false)
    }
  }

  async function handleOptionSelect(optionId: string) {
    if (!currentAssessment) return

    const question = currentAssessment.questions[currentQuestionIndex]
    const questionId = question.questionId

    setResponses(prev => ({ ...prev, [questionId]: optionId }))

    await saveResponse(questionId, optionId)

    setTimeout(() => {
      if (currentQuestionIndex < currentAssessment.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      }
    }, 300)
  }

  async function handleComplete() {
    if (!currentAssessment) return

    setCompleting(true)
    setCompletingStep(0)
    setResultsReady(false)
    setError(null)

    try {
      const response = await fetch(`/api/project-assessments/${currentAssessment.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok) {
        setCompletionResult({
          briRefinement: data.briRefinement,
          actionPlan: data.actionPlan,
          scoreImpactSummary: data.scoreImpactSummary,
          milestone: data.milestone,
        })
        setCurrentAssessment(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
        setResultsReady(true)
      } else {
        setError(data.error || 'Failed to complete assessment')
        setCompleting(false)
      }
    } catch {
      setError('Failed to complete assessment')
      setCompleting(false)
    }
  }

  // Loading state
  if (companyLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </motion.div>
      </div>
    )
  }

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No company selected</p>
      </div>
    )
  }

  // Show creating animation
  if (creating) {
    const progressPercent = ((creatingStep + 1) / PROGRESS_STEPS.length) * 100

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
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="bg-gradient-to-r from-primary via-primary/90 to-amber-500 p-8 text-white">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16">
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display">
                    Building Your Assessment
                  </h2>
                  <p className="text-white/80">
                    Personalizing 10 high-impact questions
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {PROGRESS_STEPS.map((step, index) => {
                  const isCompleted = index < creatingStep
                  const isCurrent = index === creatingStep

                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                        isCurrent ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <motion.div
                            className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                        ) : isCurrent ? (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <motion.div
                              className="w-3 h-3 rounded-full bg-primary"
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

              <motion.div
                className="mt-6 pt-4 border-t border-border text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs text-muted-foreground">
                  Your assessment is tailored to your company's unique risk profile
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  // Show initial assessment wizard if needed
  if (needsInitialAssessment) {
    return (
      <div className="max-w-3xl mx-auto">
        <AssessmentWizard
          companyId={selectedCompanyId}
          companyName={selectedCompany.name}
          title="Risk Assessment"
        />
      </div>
    )
  }

  // Show completing animation
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
            transition={{ delay: 0.1, duration: 0.5 }}
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
                    Processing Your Results
                  </h2>
                  <p className="text-white/80">
                    Refining your Buyer Readiness score
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
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
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

              <motion.div
                className="mt-6 pt-4 border-t border-border text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs text-muted-foreground">
                  Building your personalized action plan based on your responses
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  // Show completion results
  if (completionResult) {
    const { briRefinement, actionPlan, scoreImpactSummary, milestone } = completionResult
    const briChange = briRefinement.impact !== null ? briRefinement.impact : null
    const hasBriComparison = briRefinement.before !== null && briChange !== null

    return (
      <motion.div
        className="max-w-2xl mx-auto py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-violet-600 text-white p-10 text-center">
            <motion.div
              className="mx-auto w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
              >
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>
            <motion.h1
              className="text-3xl font-bold mb-3 font-display"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              Assessment Complete!
            </motion.h1>
            <motion.p
              className="text-white/90 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {milestone.completedCount === 1
                ? "Great job completing your first 10-Minute Risk Assessment!"
                : `You've completed ${milestone.completedCount} assessments.`}
            </motion.p>
          </div>

          <CardContent className="p-8 space-y-6">
            {/* Findings */}
            {milestone.isNewLearning && scoreImpactSummary.keyFindings.length > 0 && (
              <motion.div
                className="bg-muted/50 rounded-2xl p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Key Findings
                </h3>
                <ul className="space-y-3">
                  {scoreImpactSummary.keyFindings.map((finding, i) => (
                    <motion.li
                      key={i}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {finding}
                    </motion.li>
                  ))}
                </ul>
                {hasBriComparison && (
                  <motion.div
                    className="mt-5 pt-4 border-t border-border flex justify-between items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.3 }}
                  >
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      BRI Impact
                    </span>
                    <span className={`text-lg font-bold ${briChange && briChange > 0 ? 'text-emerald-600' : briChange && briChange < 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {briChange === 0 ? 'No change' : `${briChange && briChange > 0 ? '+' : ''}${briChange} ${Math.abs(briChange || 0) === 1 ? 'point' : 'points'}`}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Tasks Created */}
            {actionPlan.tasksCreated > 0 && (
              <motion.div
                className="bg-primary/5 rounded-2xl p-5 border border-primary/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <h3 className="font-semibold text-foreground mb-2">New Actions Added</h3>
                <div className="text-3xl font-bold text-primary font-display">{actionPlan.tasksCreated} Tasks</div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              className="flex gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.4 }}
            >
              <Button onClick={createNewAssessment} disabled={creating} className="flex-1 h-12 bg-primary hover:bg-primary/90">
                {creating ? 'Creating...' : 'Start Another Assessment'}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="flex-1 h-12">
                Return to Dashboard
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Show start new assessment if none exists or last one is completed
  if (!currentAssessment || currentAssessment.status === 'COMPLETED') {
    return (
      <motion.div
        className="max-w-2xl mx-auto py-8 space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">10-Minute Risk Assessment</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Answer 10 targeted questions to refine your Buyer Readiness score
          </p>
        </motion.div>

        {currentAssessment?.status === 'COMPLETED' && (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Last Assessment</CardTitle>
                    <CardDescription>
                      {currentAssessment.title} • Completed {new Date(currentAssessment.completedAt!).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {currentAssessment.questions.length} questions answered across{' '}
                  {currentAssessment.primaryCategory ? CATEGORY_LABELS[currentAssessment.primaryCategory] : 'multiple'} categories.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-xl hover:shadow-2xl transition-all">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display">Ready for your next assessment?</CardTitle>
                  <CardDescription className="text-base">
                    Each assessment asks new questions based on your current risk profile
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={createNewAssessment}
                disabled={creating}
                size="lg"
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 gap-3"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Assessment...
                  </>
                ) : (
                  <>
                    Start 10-Minute Assessment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Link to Baseline Assessment */}
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-4 p-5 bg-muted/50 rounded-2xl border border-border"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Need to update your initial assessment answers? You can review and edit all baseline questions in{' '}
              <a href="/dashboard/assessment/company" className="text-primary hover:underline font-medium">
                Baseline Assessment
              </a>
              .
            </p>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Show in-progress assessment questions
  const answeredCount = Object.keys(responses).length
  const totalQuestions = currentAssessment.questions.length
  const allAnswered = answeredCount === totalQuestions
  const progress = (answeredCount / totalQuestions) * 100
  const currentQuestion = currentAssessment.questions[currentQuestionIndex]

  return (
    <motion.div
      className="max-w-3xl mx-auto py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div className="mb-8" variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-xl font-bold text-white font-display">10</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">10-Minute Risk Assessment</h1>
              <p className="text-muted-foreground">Refine your Buyer Readiness score</p>
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Question Navigation */}
      <motion.div className="flex flex-wrap gap-2 mb-8" variants={itemVariants}>
        {currentAssessment.questions.map((q, index) => {
          const isAnswered = !!responses[q.questionId]
          const isCurrent = index === currentQuestionIndex

          return (
            <motion.button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isCurrent
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : isAnswered
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {index + 1}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          >
            <Card className="mb-8 border-0 shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                    {currentQuestionIndex + 1}
                  </span>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{currentQuestion.question.questionText}</CardTitle>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                        {CATEGORY_LABELS[currentQuestion.question.briCategory] || currentQuestion.question.briCategory}
                      </span>
                      {currentQuestion.question.subCategory && (
                        <span className="text-xs text-muted-foreground">
                          {currentQuestion.question.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentQuestion.question.options
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((option, index) => {
                      const isSelected = responses[currentQuestion.questionId] === option.id

                      return (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          onClick={() => handleOptionSelect(option.id)}
                          disabled={saving}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                              : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <span className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {option.optionText}
                          </span>
                        </motion.button>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Button */}
      {allAnswered && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={handleComplete}
            disabled={completing}
            size="lg"
            className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700 gap-3"
          >
            {completing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                Complete Assessment
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
