'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import styles from '@/components/onboarding/onboarding.module.css'

// 8 Binary Questions - Buyer-Neutral Framing
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
    riskOnNo: false, // Risk is on YES
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

interface QuickScanStepProps {
  companyId: string
  companyName: string
  onComplete: (results: QuickScanResults) => void
}

export interface QuickScanResults {
  answers: Record<string, boolean>
  risksIdentified: Array<{
    category: string
    categoryLabel: string
    question: string
    rationale: string
  }>
  briScore: number
  riskCount: number
}

export function QuickScanStep({
  companyName: _companyName,
  onComplete,
}: QuickScanStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [_canGoBack, _setCanGoBack] = useState(false)

  const currentQuestion = QUICK_SCAN_QUESTIONS[currentIndex]
  const progress = (Object.keys(answers).length / QUICK_SCAN_QUESTIONS.length) * 100
  const isComplete = Object.keys(answers).length === QUICK_SCAN_QUESTIONS.length

  const handleAnswer = (isYes: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: isYes,
    }))
    _setCanGoBack(true)

    // Move to next question after a brief delay
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
    const risksIdentified = QUICK_SCAN_QUESTIONS.filter(q => {
      const answer = answers[q.id]
      const isYes = answer === true
      return q.riskOnNo ? !isYes : isYes
    }).map(q => ({
      category: q.category,
      categoryLabel: q.categoryLabel,
      question: q.question,
      rationale: q.rationale,
    }))

    const riskCount = risksIdentified.length
    const briScore = Math.max(35, Math.round(100 - (riskCount * 8.5)))

    onComplete({
      answers,
      risksIdentified,
      briScore,
      riskCount,
    })
  }

  return (
    <div className={styles.quickScanContainer}>
      {/* Header */}
      <div className={styles.quickScanHeader}>
        <h2 className={styles.quickScanTitle}>
          Buyer Confidence Scan
        </h2>
        <p className={styles.quickScanSubtitle}>
          8 questions. Each one reflects how buyers actually evaluate businesses.
        </p>
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.quickScanDisclaimer}
      >
        <p className={styles.quickScanDisclaimerText}>
          <strong>Note:</strong> Most strong businesses answer &quot;No&quot; to more than half of these.
          That&apos;s normal — and exactly why value gaps exist.
        </p>
      </motion.div>

      {/* Progress Bar */}
      <div className={styles.quickScanProgressRow}>
        <div className={styles.quickScanProgressTrack}>
          <motion.div
            className={styles.quickScanProgressFill}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className={styles.quickScanProgressLabel}>
          {Object.keys(answers).length} of {QUICK_SCAN_QUESTIONS.length}
        </span>
      </div>

      {/* Question Card */}
      {!isComplete ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={styles.quickScanCard}
          >
            {/* Category Badge */}
            <div className={styles.quickScanCardTop}>
              <span className={styles.quickScanCategoryBadge}>
                {currentQuestion.categoryLabel}
              </span>
              <span className={styles.quickScanCardCounter}>
                {currentIndex + 1} of {QUICK_SCAN_QUESTIONS.length}
              </span>
            </div>

            {/* Question */}
            <h3 className={styles.quickScanQuestion}>
              {currentQuestion.question}
            </h3>

            {/* Rationale */}
            <p className={styles.quickScanRationale}>
              {currentQuestion.rationale}
            </p>

            {/* Answer Buttons */}
            <div className={styles.quickScanAnswerRow}>
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

            {/* Back button when not on first question */}
            {currentIndex > 0 && (
              <div className={styles.quickScanBackRow}>
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
        // Completion State
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.quickScanCompleteCard}
        >
          <div className={styles.quickScanCompleteIconWrap}>
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className={styles.quickScanCompleteTitle}>
            Scan Complete
          </h3>
          <p className={styles.quickScanCompleteSubtitle}>
            We&apos;ve identified where buyers will focus during diligence.
          </p>
          <div className={styles.quickScanCompleteActions}>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setCurrentIndex(QUICK_SCAN_QUESTIONS.length - 1)}
            >
              Back
            </Button>
            <Button
              size="lg"
              onClick={handleComplete}
              className="px-8"
            >
              See My Results
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
