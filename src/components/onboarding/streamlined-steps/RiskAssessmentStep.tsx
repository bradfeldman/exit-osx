'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle } from 'lucide-react'

// 7 Critical Risk Questions - Streamlined from 8 (removed Personal Readiness for onboarding)
const RISK_QUESTIONS = [
  {
    id: 'financial-1',
    category: 'FINANCIAL',
    categoryLabel: 'Financial',
    question: 'Would a buyer receive third-party-verified financials without asking for them?',
    rationale: 'Buyers expect CPA-reviewed or audited statements. Without them, due diligence stalls and discounts follow.',
  },
  {
    id: 'financial-2',
    category: 'FINANCIAL',
    categoryLabel: 'Financial',
    question: 'Would a buyer see that no single customer represents more than 10% of revenue?',
    rationale: 'Concentrated revenue is the first thing buyers flag. It directly reduces the multiple they\'ll pay.',
  },
  {
    id: 'transferability-1',
    category: 'TRANSFERABILITY',
    categoryLabel: 'Transferability',
    question: 'Could you show a buyer that the business has run profitably without you for 30+ days?',
    rationale: 'Buyers need proof, not promises. If it hasn\'t been tested, they assume it can\'t be done.',
  },
  {
    id: 'transferability-2',
    category: 'TRANSFERABILITY',
    categoryLabel: 'Transferability',
    question: 'Would a buyer meet someone who could step into your role within 90 days?',
    rationale: 'No clear successor means earnouts, lower offers, or no deal at all.',
  },
  {
    id: 'operational-1',
    category: 'OPERATIONAL',
    categoryLabel: 'Operations',
    question: 'Could a buyer\'s new hire learn your core operations from written documentation alone?',
    rationale: 'Tribal knowledge doesn\'t transfer. Buyers discount what they can\'t systematize.',
  },
  {
    id: 'legal-1',
    category: 'LEGAL_TAX',
    categoryLabel: 'Legal',
    question: 'Would a buyer find signed contracts governing all key customer and vendor relationships?',
    rationale: 'Handshake deals create legal risk. Buyers see gaps as hidden liabilities that reduce price.',
  },
  {
    id: 'market-1',
    category: 'MARKET',
    categoryLabel: 'Market',
    question: 'Would a buyer see that more than half your revenue is recurring or contracted for 12+ months?',
    rationale: 'Predictable revenue commands premium multiples. Project-based revenue resets to zero each year.',
  },
]

interface RiskAssessmentStepProps {
  riskAnswers: Record<string, boolean>
  updateState: (updates: { riskAnswers: Record<string, boolean> }) => void
}

export function RiskAssessmentStep({
  riskAnswers,
  updateState,
}: RiskAssessmentStepProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start at first unanswered question or last question
    const answeredCount = Object.keys(riskAnswers).length
    return Math.min(answeredCount, RISK_QUESTIONS.length - 1)
  })

  const currentQuestion = RISK_QUESTIONS[currentIndex]
  const progress = (Object.keys(riskAnswers).length / RISK_QUESTIONS.length) * 100
  const isComplete = Object.keys(riskAnswers).length === RISK_QUESTIONS.length

  const handleAnswer = (isYes: boolean) => {
    const newAnswers = { ...riskAnswers, [currentQuestion.id]: isYes }
    updateState({ riskAnswers: newAnswers })

    // Move to next question after brief delay
    setTimeout(() => {
      if (currentIndex < RISK_QUESTIONS.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }, 300)
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleQuestionClick = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
          {Object.keys(riskAnswers).length} of {RISK_QUESTIONS.length}
        </span>
      </div>

      {/* Question Navigator - Dots */}
      <div className="flex items-center justify-center gap-2">
        {RISK_QUESTIONS.map((q, index) => (
          <button
            key={q.id}
            onClick={() => handleQuestionClick(index)}
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
            aria-label={`Go to question ${index + 1}`}
          >
            {riskAnswers[q.id] !== undefined ? (
              <CheckCircle2
                className={`w-6 h-6 transition-colors ${
                  index === currentIndex ? 'text-primary' : 'text-primary/60'
                }`}
              />
            ) : (
              <Circle
                className={`w-6 h-6 transition-colors ${
                  index === currentIndex ? 'text-primary' : 'text-muted-foreground/40'
                }`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg"
        >
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Most strong businesses answer &quot;No&quot; to more than half of these.
            That&apos;s normal—and exactly why value gaps exist.
          </p>
        </motion.div>
      )}

      {/* Question Card */}
      {!isComplete ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-2xl border-2 border-border p-6 shadow-lg"
          >
            {/* Category Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {currentQuestion.categoryLabel}
              </span>
              <span className="text-sm text-muted-foreground">
                Question {currentIndex + 1}
              </span>
            </div>

            {/* Question */}
            <h3 className="text-xl font-semibold text-foreground mb-3 leading-snug">
              {currentQuestion.question}
            </h3>

            {/* Rationale */}
            <p className="text-sm text-muted-foreground italic mb-6 leading-relaxed">
              {currentQuestion.rationale}
            </p>

            {/* Answer Buttons */}
            <div className="flex gap-4 mb-4">
              <Button
                variant={riskAnswers[currentQuestion.id] === true ? 'default' : 'outline'}
                size="lg"
                className="flex-1 py-6 text-lg font-semibold"
                onClick={() => handleAnswer(true)}
              >
                Yes
              </Button>
              <Button
                variant={riskAnswers[currentQuestion.id] === false ? 'default' : 'outline'}
                size="lg"
                className="flex-1 py-6 text-lg font-semibold"
                onClick={() => handleAnswer(false)}
              >
                No
              </Button>
            </div>

            {/* Back button */}
            {currentIndex > 0 && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-muted-foreground"
                >
                  Back
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Completion State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border-2 border-primary p-8 shadow-lg text-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Assessment Complete
          </h3>
          <p className="text-muted-foreground mb-6">
            We&apos;ve identified where buyers will focus during diligence.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(RISK_QUESTIONS.length - 1)}
          >
            Review Answers
          </Button>
        </motion.div>
      )}
    </div>
  )
}
