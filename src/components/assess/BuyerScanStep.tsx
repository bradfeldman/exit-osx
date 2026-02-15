'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const QUICK_SCAN_QUESTIONS = [
  {
    id: 'financial-1',
    category: 'FINANCIAL',
    categoryLabel: 'Financial',
    question: 'Would a buyer receive third-party-verified financials without asking for them?',
    rationale: 'Buyers expect CPA-reviewed or audited statements. Without them, due diligence stalls and discounts follow.',
    riskOnNo: true,
  },
  {
    id: 'financial-2',
    category: 'FINANCIAL',
    categoryLabel: 'Financial',
    question: 'Would a buyer see that any single customer represents more than 10% of revenue?',
    rationale: 'Concentrated revenue is the first thing buyers flag. It directly reduces the multiple they\'ll pay.',
    riskOnNo: false,
  },
  {
    id: 'transferability-1',
    category: 'TRANSFERABILITY',
    categoryLabel: 'Transferability',
    question: 'Could you show a buyer that the business has run profitably without you for 30+ days?',
    rationale: 'Buyers need proof, not promises. If it hasn\'t been tested, they assume it can\'t be done.',
    riskOnNo: true,
  },
  {
    id: 'transferability-2',
    category: 'TRANSFERABILITY',
    categoryLabel: 'Transferability',
    question: 'Would a buyer meet someone who could step into your role within 90 days?',
    rationale: 'No clear successor means earnouts, lower offers, or no deal at all.',
    riskOnNo: true,
  },
  {
    id: 'operational-1',
    category: 'OPERATIONAL',
    categoryLabel: 'Operations',
    question: 'Could a buyer\'s new hire learn your core operations from written documentation alone?',
    rationale: 'Tribal knowledge doesn\'t transfer. Buyers discount what they can\'t systematize.',
    riskOnNo: true,
  },
  {
    id: 'legal-1',
    category: 'LEGAL_TAX',
    categoryLabel: 'Legal',
    question: 'Would a buyer find signed contracts governing all key customer and vendor relationships?',
    rationale: 'Handshake deals create legal risk. Buyers see gaps as hidden liabilities that reduce price.',
    riskOnNo: true,
  },
  {
    id: 'market-1',
    category: 'MARKET',
    categoryLabel: 'Market',
    question: 'Would a buyer see that more than half your revenue is recurring or contracted for 12+ months?',
    rationale: 'Predictable revenue commands premium multiples. Project-based revenue resets to zero each year.',
    riskOnNo: true,
  },
  {
    id: 'personal-1',
    category: 'PERSONAL',
    categoryLabel: 'Personal',
    question: 'If a buyer asked, could you credibly commit to exiting within 6 months?',
    rationale: 'Hesitation kills deals. Buyers need confident, committed sellers to close.',
    riskOnNo: true,
  },
]

export interface BuyerScanData {
  answers: Record<string, boolean>
  riskCount: number
  briScore: number
}

interface BuyerScanStepProps {
  initialData: BuyerScanData | null
  onComplete: (data: BuyerScanData) => void
  onBack: () => void
}

export function BuyerScanStep({ initialData, onComplete, onBack }: BuyerScanStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, boolean>>(initialData?.answers || {})

  const currentQuestion = QUICK_SCAN_QUESTIONS[currentIndex]
  const progress = (Object.keys(answers).length / QUICK_SCAN_QUESTIONS.length) * 100
  const isComplete = Object.keys(answers).length === QUICK_SCAN_QUESTIONS.length

  const handleAnswer = (isYes: boolean) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: isYes }))

    setTimeout(() => {
      if (currentIndex < QUICK_SCAN_QUESTIONS.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }, 300)
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleComplete = () => {
    const riskCount = QUICK_SCAN_QUESTIONS.filter(q => {
      const answer = answers[q.id]
      return q.riskOnNo ? answer !== true : answer === true
    }).length

    const briScore = Math.max(35, Math.round(100 - (riskCount * 8.5)))

    onComplete({ answers, riskCount, briScore })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Buyer Confidence Scan
        </h2>
        <p className="text-muted-foreground">
          8 questions. Each one reflects how buyers actually evaluate businesses.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg"
      >
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> Most strong businesses answer &quot;No&quot; to more than half.
          That&apos;s normal — and exactly why value gaps exist.
        </p>
      </motion.div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {Object.keys(answers).length} of {QUICK_SCAN_QUESTIONS.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {currentQuestion.categoryLabel}
            </span>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {QUICK_SCAN_QUESTIONS.length}
            </span>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {currentQuestion.question}
          </h3>

          <p className="text-sm text-muted-foreground italic mb-6">
            {currentQuestion.rationale}
          </p>

          <div className="flex gap-4">
            <Button
              variant={answers[currentQuestion.id] === true ? 'default' : 'outline'}
              size="lg"
              className="flex-1 py-6 text-lg font-semibold"
              onClick={() => handleAnswer(true)}
            >
              Yes
            </Button>
            <Button
              variant={answers[currentQuestion.id] === false ? 'default' : 'outline'}
              size="lg"
              className="flex-1 py-6 text-lg font-semibold"
              onClick={() => handleAnswer(false)}
            >
              No
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            {currentIndex > 0 ? (
              <Button variant="ghost" onClick={handleBack} className="text-muted-foreground">
                Previous
              </Button>
            ) : <div />}
            {currentIndex < QUICK_SCAN_QUESTIONS.length - 1 && answers[currentQuestion.id] !== undefined && (
              <Button variant="ghost" onClick={() => setCurrentIndex(currentIndex + 1)} className="text-muted-foreground">
                Next
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button size="lg" onClick={handleComplete} className="px-8 h-12 text-base font-medium">
            Continue
          </Button>
        </motion.div>
      )}

      <div className="flex justify-start">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Profile
        </Button>
      </div>
    </div>
  )
}
