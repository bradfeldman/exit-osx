'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronRight } from 'lucide-react'

interface RiskQuestion {
  id: string
  category: string
  question: string
  options: { id: string; text: string }[]
  riskContext: string
}

interface RiskQuestionsStepProps {
  companyId: string
  companyName: string
  businessDescription: string
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
    currentValue: number
    potentialValue: number
    valueGap: number
  }
  onComplete: (answers: Record<string, string>) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

export function RiskQuestionsStep({
  companyId,
  companyName,
  businessDescription,
  riskResults,
  onComplete,
}: RiskQuestionsStepProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<RiskQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Fetch AI-generated risk questions
  useEffect(() => {
    async function fetchQuestions() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/risk-assessment/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            businessDescription,
            riskResults: {
              briScore: riskResults.briScore,
              categoryScores: riskResults.categoryScores,
              valueGapByCategory: riskResults.valueGapByCategory,
            },
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate questions')
        }

        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        console.error('Error fetching risk questions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [companyId, businessDescription, riskResults])

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId)
  }

  const handleNext = () => {
    if (!selectedOption || !currentQuestion) return

    const newAnswers = {
      ...answers,
      [currentQuestion.id]: selectedOption,
    }
    setAnswers(newAnswers)

    if (isLastQuestion) {
      onComplete(newAnswers)
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">
          Analyzing your risks to create targeted questions...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 dark:bg-red-950/30 dark:border-red-800/30 dark:text-red-400">
          <p className="font-medium">Unable to generate questions</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // No questions generated
  if (questions.length === 0) {
    return (
      <div className="space-y-6 text-center py-8">
        <p className="text-muted-foreground">
          No additional questions needed based on your risk profile.
        </p>
        <Button onClick={() => onComplete({})}>
          Continue to Action Plan
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Quick Risk Questions
        </h2>
        <p className="text-muted-foreground mt-2">
          Help us understand how these risks affect {companyName}
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          {/* Category badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4">
            {CATEGORY_LABELS[currentQuestion.category] || currentQuestion.category}
          </div>

          {/* Question */}
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {currentQuestion.question}
          </h3>

          {/* Context */}
          <p className="text-sm text-muted-foreground mb-6">
            {currentQuestion.riskContext}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedOption === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOption === option.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30'
                  }`}>
                    {selectedOption === option.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 bg-white rounded-full"
                      />
                    )}
                  </div>
                  <span className="text-foreground">{option.text}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-end">
        <Button
          onClick={handleNext}
          disabled={!selectedOption}
          className="gap-2"
        >
          {isLastQuestion ? 'See Your Action Plan' : 'Next Question'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
