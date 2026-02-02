'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { MessageCircleQuestion, Loader2 } from 'lucide-react'
import type { ClarifyingQuestion } from '@/lib/ai/types'

interface ClarifyingQuestionsStepProps {
  companyName: string
  businessDescription: string
  industry: string
  revenueRange: string
  onComplete: (answers: Record<string, string>, questions: ClarifyingQuestion[]) => void
  onSkip: () => void
}

export function ClarifyingQuestionsStep({
  companyName,
  businessDescription,
  industry,
  revenueRange,
  onComplete,
  onSkip,
}: ClarifyingQuestionsStepProps) {
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch clarifying questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/profile/clarifying-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessDescription,
            industry,
            revenueRange,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate questions')
        }

        const data = await response.json()
        setQuestions(data.questions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [businessDescription, industry, revenueRange])

  // Auto-proceed if no questions needed (must be before early returns)
  useEffect(() => {
    if (!isLoading && questions.length === 0 && !error) {
      onComplete({}, [])
    }
  }, [isLoading, questions.length, error, onComplete])

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const handleOtherTextChange = (questionId: string, text: string) => {
    setOtherText((prev) => ({ ...prev, [questionId]: text }))
  }

  const allQuestionsAnswered = questions.every((q) => {
    const answer = answers[q.id]
    if (!answer) return false
    // If they selected "other" option and it allows other, check for text
    const selectedOption = q.options.find((o) => o.id === answer)
    if (selectedOption?.text.toLowerCase().includes('something else') && q.allowsOther) {
      return !!otherText[q.id]?.trim()
    }
    return true
  })

  const handleContinue = () => {
    // Merge answers with "other" text where applicable
    const finalAnswers: Record<string, string> = {}
    for (const q of questions) {
      const answer = answers[q.id]
      const selectedOption = q.options.find((o) => o.id === answer)
      if (selectedOption?.text.toLowerCase().includes('something else') && otherText[q.id]) {
        finalAnswers[q.id] = `other:${otherText[q.id]}`
      } else {
        finalAnswers[q.id] = answer
      }
    }
    onComplete(finalAnswers, questions)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Analyzing your business...</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Generating personalized questions
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={onSkip}
          className="text-sm text-primary hover:text-primary/80"
        >
          Skip this step
        </button>
      </div>
    )
  }

  if (questions.length === 0 && !isLoading && !error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Great! We have everything we need.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <MessageCircleQuestion className="w-7 h-7 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground font-display">
          A few quick questions about {companyName}
        </h2>
        <p className="text-muted-foreground mt-2">
          This helps us create a personalized improvement plan.
        </p>
      </div>

      <div className="space-y-8">
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-3"
          >
            <p className="font-medium text-foreground">
              {index + 1}. {question.question}
            </p>
            <div className="space-y-2">
              {question.options.map((option) => {
                const isSelected = answers[question.id] === option.id
                const isOther = option.text.toLowerCase().includes('something else')

                return (
                  <div key={option.id}>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(question.id, option.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-primary' : 'border-muted-foreground/50'
                          }`}
                        >
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </span>
                        <span className="text-sm">{option.text}</span>
                      </span>
                    </button>

                    {/* Show text input if "other" is selected */}
                    {isSelected && isOther && question.allowsOther && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 ml-7"
                      >
                        <input
                          type="text"
                          value={otherText[question.id] || ''}
                          onChange={(e) =>
                            handleOtherTextChange(question.id, e.target.value)
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!allQuestionsAnswered}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            allQuestionsAnswered
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
