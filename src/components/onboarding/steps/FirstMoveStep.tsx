'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  Loader2,
  ArrowRight,
} from 'lucide-react'
import styles from '@/components/onboarding/onboarding.module.css'

interface GeneratedTask {
  id: string
  title: string
  description: string
  category: string
  estimatedValue: number
  estimatedHours?: number
}

interface FirstMoveStepProps {
  companyId: string
  companyName: string
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
    currentValue: number
    potentialValue: number
    valueGap: number
  }
  onComplete: (taskId?: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

export function FirstMoveStep({
  companyId,
  riskResults,
  onComplete,
}: FirstMoveStepProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstTask, setFirstTask] = useState<GeneratedTask | null>(null)

  // Generate tasks and get the first (highest impact) one
  useEffect(() => {
    async function generateTasks() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            riskResults: {
              briScore: riskResults.briScore,
              categoryScores: riskResults.categoryScores,
              valueGapByCategory: riskResults.valueGapByCategory,
            },
            riskQuestionAnswers: {},
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate tasks')
        }

        const data = await response.json()
        const tasks = data.tasks || []

        // Get the first (highest impact) task
        if (tasks.length > 0) {
          setFirstTask(tasks[0])
        }
      } catch (err) {
        console.error('Error generating tasks:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate tasks')
      } finally {
        setLoading(false)
      }
    }

    generateTasks()
  }, [companyId, riskResults])

  // Loading state with animation
  if (loading) {
    return (
      <div className={styles.firstMoveLoadingState}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.firstMoveLoadingInner}
        >
          <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p className={styles.firstMoveLoadingText}>
            Creating your personalized action plan...
          </p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error || !firstTask) {
    return (
      <div className={styles.firstMoveErrorState}>
        <div className={styles.firstMoveErrorBanner}>
          <p className={styles.firstMoveErrorTitle}>Unable to generate action plan</p>
          <p className={styles.firstMoveErrorDetail}>{error || 'No tasks available'}</p>
        </div>
        <Button onClick={() => onComplete()}>
          Continue to Dashboard
        </Button>
      </div>
    )
  }

  const estimatedMinutes = (firstTask.estimatedHours || 1) * 60
  const _briChange = Math.min(100, riskResults.briScore + 6)

  return (
    <div className={styles.firstMoveRoot}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.firstMoveHeader}
      >
        <h2 className={styles.firstMoveTitle}>
          Your First Move
        </h2>
        <p className={styles.firstMoveSubtitle}>
          If you do nothing else, do this.
        </p>
      </motion.div>

      {/* Single Task Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className={styles.firstMoveCard}
      >
        {/* Badge */}
        <div className={styles.firstMoveBadgeWrap}>
          <span className={styles.firstMoveBadge}>
            Highest Impact
          </span>
        </div>

        {/* Task Content */}
        <div className={styles.firstMoveCardBody}>
          <h3 className={styles.firstMoveTaskTitle}>
            {firstTask.title}
          </h3>
          <p className={styles.firstMoveTaskDesc}>
            {firstTask.description}
          </p>

          {/* Task Metrics */}
          <div className={styles.firstMoveMetrics}>
            <div className={styles.firstMoveMetric}>
              <p className={styles.firstMoveMetricValueGreen}>
                +{formatCurrency(firstTask.estimatedValue)}
              </p>
              <p className={styles.firstMoveMetricLabel}>
                Value Impact
              </p>
            </div>
            <div className={styles.firstMoveMetric}>
              <p className={styles.firstMoveMetricValue}>
                {estimatedMinutes} min
              </p>
              <p className={styles.firstMoveMetricLabel}>
                Est. Time
              </p>
            </div>
            <div className={styles.firstMoveMetric}>
              <p className={styles.firstMoveMetricValue}>
                {CATEGORY_LABELS[firstTask.category] || firstTask.category}
              </p>
              <p className={styles.firstMoveMetricLabel}>
                Risk Addressed
              </p>
            </div>
          </div>

          {/* Unlock Note */}
          <p className={styles.firstMoveUnlockNote}>
            Completing this unlocks the next highest-impact task.
          </p>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={() => onComplete(firstTask.id)}
        >
          Start This Task
          <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
        </Button>
      </motion.div>

      {/* Back to Results */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={styles.firstMoveBackWrap}
      >
        <button
          onClick={() => window.history.back()}
          className={styles.firstMoveBackBtn}
        >
          Back to Results
        </button>
      </motion.div>
    </div>
  )
}
