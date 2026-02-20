'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronRight } from 'lucide-react'
import styles from '@/components/onboarding/onboarding.module.css'

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
      <div className={styles.riskQLoadingWrap}>
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className={styles.riskQLoadingText}>
          Analyzing your risks to create targeted questions...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.riskQErrorWrap}>
        <div className={styles.riskQErrorBox}>
          <p className={styles.riskQErrorTitle}>Unable to generate questions</p>
          <p className={styles.riskQErrorBody}>{error}</p>
        </div>
        <div className={styles.riskQErrorActions}>
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
      <div className={styles.riskQEmptyWrap}>
        <p className={styles.riskQEmptyText}>
          No additional questions needed based on your risk profile.
        </p>
        <Button onClick={() => onComplete({})}>
          Continue to Action Plan
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.riskQContainer}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.riskQHeader}
      >
        <h2 className={styles.riskQTitle}>
          Quick Risk Questions
        </h2>
        <p className={styles.riskQSubtitle}>
          Help us understand how these risks affect {companyName}
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className={styles.riskQProgressWrap}>
        <div className={styles.riskQProgressLabels}>
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className={styles.riskQProgressTrack}>
          <motion.div
            className={styles.riskQProgressFill}
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
          className={styles.riskQCard}
        >
          {/* Category badge */}
          <div className={styles.riskQCategoryBadge}>
            {CATEGORY_LABELS[currentQuestion.category] || currentQuestion.category}
          </div>

          {/* Question */}
          <h3 className={styles.riskQQuestion}>
            {currentQuestion.question}
          </h3>

          {/* Context */}
          <p className={styles.riskQContext}>
            {currentQuestion.riskContext}
          </p>

          {/* Options */}
          <div className={styles.riskQOptions}>
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOption === option.id

              const btnClass = `${styles.riskQOptionBtn}${isSelected ? ` ${styles.riskQOptionBtnSelected}` : ''}`
              const radioClass = `${styles.riskQOptionRadio}${isSelected ? ` ${styles.riskQOptionRadioSelected}` : ''}`

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={btnClass}
                >
                  <div className={styles.riskQOptionInner}>
                    <div className={radioClass}>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={styles.riskQOptionDot}
                        />
                      )}
                    </div>
                    <span className={styles.riskQOptionText}>{option.text}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.riskQNavRow}>
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
