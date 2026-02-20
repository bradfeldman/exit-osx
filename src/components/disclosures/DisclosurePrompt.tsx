'use client'

import { useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { X, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Question {
  key: string
  text: string
  briCategory: string
  followUpText: string
  signalType: string
}

interface PromptSetData {
  id: string
  questions: Question[]
  responses: Array<{
    questionKey: string
    answer: boolean
    followUpAnswer: string | null
  }>
}

interface ResponseEntry {
  questionKey: string
  answer: boolean
  followUpAnswer?: string
}

interface DisclosurePromptProps {
  promptSet: PromptSetData
  onClose: () => void
  onComplete: () => void
}

export function DisclosurePrompt({ promptSet, onClose, onComplete }: DisclosurePromptProps) {
  const { selectedCompanyId } = useCompany()
  const answeredKeys = new Set(promptSet.responses.map((r) => r.questionKey))
  const unanswered = promptSet.questions.filter((q) => !answeredKeys.has(q.key))

  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<ResponseEntry[]>([])
  const [followUpText, setFollowUpText] = useState('')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [signalsCreated, setSignalsCreated] = useState(0)

  const currentQuestion = unanswered[currentIndex]
  const totalQuestions = unanswered.length
  const isLastQuestion = currentIndex === totalQuestions - 1

  const handleAnswer = (answer: boolean) => {
    if (answer) {
      setShowFollowUp(true)
    } else {
      addResponse({ questionKey: currentQuestion.key, answer: false })
      advance()
    }
  }

  const handleFollowUpSubmit = () => {
    addResponse({
      questionKey: currentQuestion.key,
      answer: true,
      followUpAnswer: followUpText || undefined,
    })
    setFollowUpText('')
    setShowFollowUp(false)
    advance()
  }

  const addResponse = (entry: ResponseEntry) => {
    setResponses((prev) => [...prev, entry])
  }

  const advance = () => {
    if (isLastQuestion) {
      submitAll()
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const submitAll = async () => {
    if (!selectedCompanyId) return
    setIsSubmitting(true)

    try {
      // Include the response being added now
      const allResponses = [...responses]
      // Last response was already added via addResponse before advance() calls submitAll

      const res = await fetch(
        `/api/companies/${selectedCompanyId}/disclosures/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promptSetId: promptSet.id,
            responses: allResponses,
            isComplete: true,
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setSignalsCreated(data.signalsCreated)
        setIsDone(true)
      }
    } catch {
      // Silently fail
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-white shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {isDone ? (
            /* Completion state */
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-light">
                <CheckCircle className="h-6 w-6 text-green-dark" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Check-in Complete</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {signalsCreated > 0
                  ? `${signalsCreated} signal${signalsCreated !== 1 ? 's' : ''} detected. We'll track the impact on your exit readiness.`
                  : 'No changes detected — your value story is up to date.'}
              </p>
              <Button
                onClick={onComplete}
                className="mt-6"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground">Quick Check</h3>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} of {totalQuestions}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              {currentQuestion && !showFollowUp && (
                <div className="space-y-6">
                  <div className="flex gap-3">
                    <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      currentQuestion.signalType === 'negative' ? 'text-orange' : 'text-green'
                    }`} />
                    <p className="text-base text-foreground leading-relaxed">
                      {currentQuestion.text}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleAnswer(true)}
                      className="flex-1"
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAnswer(false)}
                      className="flex-1"
                    >
                      No
                    </Button>
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {showFollowUp && currentQuestion && (
                <div className="space-y-4">
                  <p className="text-base text-foreground leading-relaxed">
                    {currentQuestion.followUpText}
                  </p>
                  <textarea
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="Brief description (optional)"
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFollowUpSubmit}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleFollowUpSubmit}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {isSubmitting && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground animate-pulse">Processing...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
