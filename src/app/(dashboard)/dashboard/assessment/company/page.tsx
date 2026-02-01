'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  User,
  Lock
} from 'lucide-react'

// Types
interface CoreFactors {
  revenueSizeCategory: string
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
}

interface QuestionOption {
  id: string
  optionText: string
  scoreValue: string
  displayOrder: number
}

interface Question {
  id: string
  briCategory: string
  questionText: string
  helpText: string | null
  displayOrder: number
  options: QuestionOption[]
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

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 80, damping: 15 }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 }
  }
} as const

// Constants
const FACTOR_OPTIONS = {
  revenueSizeCategory: {
    label: 'Annual Revenue',
    description: 'What is your annual revenue range?',
    icon: DollarSign,
    options: [
      { value: 'UNDER_500K', label: 'Under $500K' },
      { value: 'FROM_500K_TO_1M', label: '$500K - $1M' },
      { value: 'FROM_1M_TO_3M', label: '$1M - $3M' },
      { value: 'FROM_3M_TO_10M', label: '$3M - $10M' },
      { value: 'FROM_10M_TO_25M', label: '$10M - $25M' },
      { value: 'OVER_25M', label: 'Over $25M' },
    ],
  },
  revenueModel: {
    label: 'Revenue Model',
    description: 'How does your business generate revenue?',
    icon: RefreshCw,
    options: [
      { value: 'PROJECT_BASED', label: 'Project-Based' },
      { value: 'TRANSACTIONAL', label: 'Transactional' },
      { value: 'RECURRING_CONTRACTS', label: 'Recurring Contracts' },
      { value: 'SUBSCRIPTION_SAAS', label: 'Subscription/SaaS' },
    ],
  },
  grossMarginProxy: {
    label: 'Gross Margin',
    description: 'What is your typical gross margin?',
    icon: TrendingUp,
    options: [
      { value: 'LOW', label: 'Low (< 30%)' },
      { value: 'MODERATE', label: 'Moderate (30-50%)' },
      { value: 'GOOD', label: 'Good (50-70%)' },
      { value: 'EXCELLENT', label: 'Excellent (> 70%)' },
    ],
  },
  laborIntensity: {
    label: 'Labor Intensity',
    description: 'How labor-intensive is your business?',
    icon: Users,
    options: [
      { value: 'LOW', label: 'Low - Highly automated' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'VERY_HIGH', label: 'Very High - People-dependent' },
    ],
  },
  assetIntensity: {
    label: 'Asset Intensity',
    description: 'How asset-intensive is your business?',
    icon: Building2,
    options: [
      { value: 'ASSET_LIGHT', label: 'Asset Light' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'ASSET_HEAVY', label: 'Asset Heavy' },
    ],
  },
  ownerInvolvement: {
    label: 'Owner Involvement',
    description: 'How involved is the owner in daily operations?',
    icon: User,
    options: [
      { value: 'MINIMAL', label: 'Minimal - Business runs independently' },
      { value: 'LOW', label: 'Low' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'CRITICAL', label: 'Critical - Owner is essential' },
    ],
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const CATEGORY_ORDER = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
]

export default function BaselineAssessmentPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Core factors state
  const [factors, setFactors] = useState<CoreFactors | null>(null)
  const [originalFactors, setOriginalFactors] = useState<CoreFactors | null>(null)

  // Initial assessment state
  const [hasInitialAssessment, setHasInitialAssessment] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Map<string, string>>(new Map())
  const [originalResponses, setOriginalResponses] = useState<Map<string, string>>(new Map())

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0) // 0 = Business Profile, 1+ = assessment categories

  // Group questions by category
  const questionsByCategory = questions.reduce((acc, q) => {
    if (!acc[q.briCategory]) acc[q.briCategory] = []
    acc[q.briCategory].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  // Build steps array
  const steps = [
    { id: 'profile', label: 'Business Profile', category: null },
    ...CATEGORY_ORDER
      .filter(cat => questionsByCategory[cat]?.length > 0)
      .map(cat => ({ id: cat, label: CATEGORY_LABELS[cat], category: cat }))
  ]

  // Current step data
  const currentStepData = steps[currentStep]
  const currentCategoryQuestions = currentStepData?.category
    ? questionsByCategory[currentStepData.category] || []
    : []

  // Load data
  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return

    setLoading(true)
    setError(null)

    try {
      // Load core factors
      const emptyFactors: CoreFactors = {
        revenueSizeCategory: '',
        revenueModel: '',
        grossMarginProxy: '',
        laborIntensity: '',
        assetIntensity: '',
        ownerInvolvement: '',
      }

      const coreFactorsRes = await fetch(`/api/companies/${selectedCompanyId}/core-factors`)
      if (coreFactorsRes.ok) {
        const data = await coreFactorsRes.json()
        if (data.coreFactors) {
          const loadedFactors: CoreFactors = {
            revenueSizeCategory: data.coreFactors.revenueSizeCategory || '',
            revenueModel: data.coreFactors.revenueModel || '',
            grossMarginProxy: data.coreFactors.grossMarginProxy || '',
            laborIntensity: data.coreFactors.laborIntensity || '',
            assetIntensity: data.coreFactors.assetIntensity || '',
            ownerInvolvement: data.coreFactors.ownerInvolvement || '',
          }
          setFactors(loadedFactors)
          setOriginalFactors(loadedFactors)
        } else {
          setFactors(emptyFactors)
          setOriginalFactors(emptyFactors)
        }
      } else {
        setFactors(emptyFactors)
        setOriginalFactors(emptyFactors)
      }

      // Check if initial assessment exists (has BRI score)
      const dashboardRes = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (dashboardRes.ok) {
        const dashData = await dashboardRes.json()
        const briScore = dashData.tier1?.briScore
        const hasInitial = briScore !== null && briScore !== undefined
        setHasInitialAssessment(hasInitial)

        if (hasInitial) {
          // Load questions
          const questionsRes = await fetch('/api/questions')
          if (questionsRes.ok) {
            const qData = await questionsRes.json()
            setQuestions(qData.questions || [])
          }

          // Load assessment and responses
          const assessmentRes = await fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: selectedCompanyId }),
          })
          if (assessmentRes.ok) {
            const aData = await assessmentRes.json()
            setAssessmentId(aData.assessment?.id)

            if (aData.assessment?.id) {
              const responsesRes = await fetch(`/api/assessments/${aData.assessment.id}/responses`)
              if (responsesRes.ok) {
                const rData = await responsesRes.json()
                const responseMap = new Map<string, string>()
                for (const r of rData.responses || []) {
                  responseMap.set(r.questionId, r.selectedOptionId)
                }
                setResponses(responseMap)
                setOriginalResponses(new Map(responseMap))
              }
            }
          }
        }
      }
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle factor change
  function handleFactorChange(factor: keyof CoreFactors, value: string) {
    if (factors) {
      setFactors({ ...factors, [factor]: value })
      setError(null)
      setSuccess(null)
    }
  }

  // Handle assessment response change
  function handleResponseChange(questionId: string, optionId: string) {
    const newResponses = new Map(responses)
    newResponses.set(questionId, optionId)
    setResponses(newResponses)
    setError(null)
    setSuccess(null)
  }

  // Check for unsaved changes
  function hasChanges(): boolean {
    if (factors && originalFactors) {
      if (JSON.stringify(factors) !== JSON.stringify(originalFactors)) {
        return true
      }
    }

    if (responses.size !== originalResponses.size) return true
    for (const [key, value] of responses) {
      if (originalResponses.get(key) !== value) return true
    }

    return false
  }

  // Check if current step is complete
  function isStepComplete(stepIndex: number): boolean {
    const step = steps[stepIndex]
    if (!step) return false

    if (step.id === 'profile') {
      return factors ? Object.values(factors).every(v => v !== '') : false
    }

    const catQuestions = questionsByCategory[step.category!] || []
    return catQuestions.every(q => responses.has(q.id))
  }

  // Calculate progress
  const completedSteps = steps.filter((_, i) => isStepComplete(i)).length
  const progressPercent = Math.round((completedSteps / steps.length) * 100)

  // Save all changes
  async function handleSave() {
    if (!selectedCompanyId || !factors) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const factorsPayload: Record<string, string> = {}
      if (factors.revenueSizeCategory) factorsPayload.revenueSizeCategory = factors.revenueSizeCategory
      if (factors.revenueModel) factorsPayload.revenueModel = factors.revenueModel
      if (factors.grossMarginProxy) factorsPayload.grossMarginProxy = factors.grossMarginProxy
      if (factors.laborIntensity) factorsPayload.laborIntensity = factors.laborIntensity
      if (factors.assetIntensity) factorsPayload.assetIntensity = factors.assetIntensity
      if (factors.ownerInvolvement) factorsPayload.ownerInvolvement = factors.ownerInvolvement

      const factorsRes = await fetch(`/api/companies/${selectedCompanyId}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(factorsPayload),
      })

      if (!factorsRes.ok) {
        const errorData = await factorsRes.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save business profile')
      }

      if (assessmentId && hasInitialAssessment) {
        const changedResponses: Array<{ questionId: string; selectedOptionId: string }> = []

        for (const [questionId, optionId] of responses) {
          if (originalResponses.get(questionId) !== optionId) {
            changedResponses.push({ questionId, selectedOptionId: optionId })
          }
        }

        if (changedResponses.length > 0) {
          const reassessRes = await fetch(`/api/companies/${selectedCompanyId}/reassess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              responses: changedResponses.map(r => ({
                questionId: r.questionId,
                selectedOptionId: r.selectedOptionId,
                confidenceLevel: 'CONFIDENT',
              })),
            }),
          })

          if (!reassessRes.ok) {
            console.error('Failed to update assessment responses')
          }
        }
      }

      setOriginalFactors(factors)
      setOriginalResponses(new Map(responses))

      setSuccess('Changes saved and valuation updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Navigate
  function goToNextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function goToPrevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Loading state
  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </motion.div>
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No company selected</p>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-8 max-w-4xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
          Baseline Assessment
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {hasInitialAssessment
            ? `Review and update ${selectedCompany?.name || 'your company'}'s baseline profile and assessment answers.`
            : `Set ${selectedCompany?.name || 'your company'}'s business profile to calculate your Core Score.`
          }
        </p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{progressPercent}% Complete</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Step Navigation */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isComplete = isStepComplete(index)
          const isCurrent = index === currentStep
          const isAccessible = index === 0 || hasInitialAssessment

          return (
            <motion.button
              key={step.id}
              onClick={() => isAccessible && setCurrentStep(index)}
              disabled={!isAccessible}
              whileHover={isAccessible ? { scale: 1.02, y: -1 } : {}}
              whileTap={isAccessible ? { scale: 0.98 } : {}}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2',
                isCurrent
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : isComplete
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : isAccessible
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
              )}
            >
              {isComplete && !isCurrent && (
                <Check className="h-4 w-4" />
              )}
              {!isAccessible && (
                <Lock className="h-3 w-3" />
              )}
              {step.label}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-display">{currentStepData?.label}</CardTitle>
              <CardDescription className="text-base">
                {currentStepData?.id === 'profile'
                  ? 'These factors determine your Core Score and base valuation multiple.'
                  : `Review and update your ${currentStepData?.label?.toLowerCase()} answers.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Profile Step */}
              {currentStepData?.id === 'profile' && factors && (
                <motion.div
                  className="space-y-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {(Object.keys(FACTOR_OPTIONS) as Array<keyof typeof FACTOR_OPTIONS>).map((factorKey, index) => {
                    const config = FACTOR_OPTIONS[factorKey]
                    const currentValue = factors[factorKey] || ''
                    const Icon = config.icon

                    return (
                      <motion.div
                        key={factorKey}
                        className="space-y-4"
                        variants={itemVariants}
                        custom={index}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{config.label}</h3>
                            <p className="text-sm text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-12">
                          {config.options.map((option) => (
                            <motion.button
                              key={option.value}
                              type="button"
                              onClick={() => handleFactorChange(factorKey, option.value)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                'p-4 text-left rounded-xl border-2 transition-all duration-200',
                                currentValue === option.value
                                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              )}
                            >
                              <span className={cn(
                                'text-sm font-medium',
                                currentValue === option.value ? 'text-primary' : 'text-foreground'
                              )}>
                                {option.label}
                              </span>
                              {currentValue === option.value && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-2 right-2"
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}

              {/* Assessment Category Steps */}
              {currentStepData?.category && currentCategoryQuestions.length > 0 && (
                <motion.div
                  className="space-y-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {currentCategoryQuestions.map((question, qIndex) => {
                    const selectedOptionId = responses.get(question.id)

                    return (
                      <motion.div
                        key={question.id}
                        className="space-y-4"
                        variants={itemVariants}
                        custom={qIndex}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                              Q{qIndex + 1}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground text-lg">{question.questionText}</h3>
                          {question.helpText && (
                            <p className="text-sm text-muted-foreground mt-1">{question.helpText}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          {question.options
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((option) => (
                              <motion.button
                                key={option.id}
                                type="button"
                                onClick={() => handleResponseChange(question.id, option.id)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={cn(
                                  'w-full p-4 text-left rounded-xl border-2 transition-all duration-200 flex items-center gap-3',
                                  selectedOptionId === option.id
                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                )}
                              >
                                <div className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  selectedOptionId === option.id
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground/30'
                                )}>
                                  {selectedOptionId === option.id && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                    >
                                      <Check className="h-3 w-3 text-primary-foreground" />
                                    </motion.div>
                                  )}
                                </div>
                                <span className={cn(
                                  'text-sm',
                                  selectedOptionId === option.id ? 'text-foreground font-medium' : 'text-muted-foreground'
                                )}>
                                  {option.optionText}
                                </span>
                              </motion.button>
                            ))}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}

              {/* No initial assessment message */}
              {currentStepData?.category && !hasInitialAssessment && (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                    <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Complete Initial Assessment First</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Complete your initial Risk Assessment to unlock full baseline editing capabilities.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/dashboard/assessment/risk'}
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                  >
                    Go to Risk Assessment
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
                  >
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3"
                  >
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-300 text-sm">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <Button
          variant="outline"
          onClick={goToPrevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {hasChanges() && (
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="outline"
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}

          {currentStep < steps.length - 1 && (
            <Button
              onClick={goToNextStep}
              disabled={!isStepComplete(currentStep) || (currentStep > 0 && !hasInitialAssessment)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
