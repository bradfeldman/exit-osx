'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Rocket,
  DollarSign,
  Users,
  Settings,
  Target,
  Scale,
  User,
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

interface TaskAssignmentStepProps {
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
  riskQuestionAnswers: Record<string, string>
  onComplete: () => void
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FINANCIAL: DollarSign,
  TRANSFERABILITY: Users,
  OPERATIONAL: Settings,
  MARKET: Target,
  LEGAL_TAX: Scale,
  PERSONAL: User,
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

export function TaskAssignmentStep({
  companyId,
  companyName,
  riskResults,
  riskQuestionAnswers,
  onComplete,
}: TaskAssignmentStepProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<GeneratedTask[]>([])
  const [showTasks, setShowTasks] = useState(false)
  const [revealedTasks, setRevealedTasks] = useState(0)

  // Generate tasks based on risk results and question answers
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
            riskQuestionAnswers,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate tasks')
        }

        const data = await response.json()
        setTasks(data.tasks || [])
      } catch (err) {
        console.error('Error generating tasks:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate tasks')
      } finally {
        setLoading(false)
      }
    }

    generateTasks()
  }, [companyId, riskResults, riskQuestionAnswers])

  // Animate task reveal
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const timer = setTimeout(() => setShowTasks(true), 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tasks.length])

  useEffect(() => {
    if (showTasks && tasks.length > 0) {
      const interval = setInterval(() => {
        setRevealedTasks(prev => {
          if (prev >= tasks.length) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 300)
      return () => clearInterval(interval)
    }
  }, [showTasks, tasks.length])

  // Calculate total potential value improvement
  const totalValueImprovement = tasks.reduce((sum, task) => sum + (task.estimatedValue || 0), 0)
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 2), 0)

  // Loading state
  if (loading) {
    return (
      <div className={styles.taskAssignLoadingState}>
        <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p className={styles.taskAssignLoadingText}>
          Creating your personalized action plan...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.taskAssignErrorState}>
        <div className={styles.taskAssignErrorBanner}>
          <p className={styles.taskAssignErrorTitle}>Unable to generate action plan</p>
          <p className={styles.taskAssignErrorDetail}>{error}</p>
        </div>
        <Button onClick={onComplete}>
          Continue to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.taskAssignRoot}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.taskAssignHeader}
      >
        <h2 className={styles.taskAssignTitle}>
          Your Action Plan
        </h2>
        <p className={styles.taskAssignSubtitle}>
          {tasks.length} tasks to start improving {companyName}&apos;s value
        </p>
      </motion.div>

      {/* Value Impact Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className={styles.taskAssignSummaryGrid}
      >
        <div className={styles.taskAssignSummaryCardGreen}>
          <div className={styles.taskAssignSummaryIconRow}>
            <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
            <span className={styles.taskAssignSummaryLabel}>Potential Value Impact</span>
          </div>
          <p className={styles.taskAssignSummaryValueGreen}>
            +{formatCurrency(totalValueImprovement)}
          </p>
        </div>

        <div className={styles.taskAssignSummaryCardBlue}>
          <div className={styles.taskAssignSummaryIconRow}>
            <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#2563EB' }} />
            <span className={styles.taskAssignSummaryLabel}>Time Investment</span>
          </div>
          <p className={styles.taskAssignSummaryValueBlue}>
            ~{totalHours} hours
          </p>
        </div>
      </motion.div>

      {/* Task List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showTasks ? 1 : 0 }}
        transition={{ delay: 0.4 }}
        className={styles.taskAssignListSection}
      >
        <h3 className={styles.taskAssignListTitle}>This Week&apos;s Tasks</h3>

        <div className={styles.taskAssignList}>
          {tasks.map((task, index) => {
            const Icon = CATEGORY_ICONS[task.category] || Settings
            const isRevealed = index < revealedTasks

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isRevealed ? 1 : 0, x: isRevealed ? 0 : -20 }}
                transition={{ duration: 0.3 }}
                className={styles.taskAssignCard}
              >
                <div className={styles.taskAssignCardInner}>
                  <div className={styles.taskAssignIconWrap}>
                    <Icon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary)' }} />
                  </div>
                  <div className={styles.taskAssignCardBody}>
                    <div className={styles.taskAssignCardMeta}>
                      <span className={styles.taskAssignCategoryBadge}>
                        {CATEGORY_LABELS[task.category] || task.category}
                      </span>
                      {task.estimatedHours && (
                        <span className={styles.taskAssignTimeBadge}>
                          <Clock style={{ width: '0.75rem', height: '0.75rem' }} />
                          {task.estimatedHours}h
                        </span>
                      )}
                    </div>
                    <h4 className={styles.taskAssignCardTitle}>{task.title}</h4>
                    <p className={styles.taskAssignCardDesc}>
                      {task.description}
                    </p>
                    {task.estimatedValue > 0 && (
                      <p className={styles.taskAssignValueBadge}>
                        <TrendingUp style={{ width: '0.75rem', height: '0.75rem' }} />
                        +{formatCurrency(task.estimatedValue)} potential value
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className={styles.taskAssignCardCheck} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: revealedTasks >= tasks.length ? 1 : 0, y: revealedTasks >= tasks.length ? 0 : 20 }}
        transition={{ delay: 0.3 }}
        className={styles.taskAssignCta}
      >
        <div className={styles.taskAssignCtaIconWrap}>
          <Rocket style={{ width: '1.5rem', height: '1.5rem', color: '#FFFFFF' }} />
        </div>
        <h3 className={styles.taskAssignCtaTitle}>
          Ready to Start Building Value?
        </h3>
        <p className={styles.taskAssignCtaText}>
          Your personalized action plan is waiting. Complete these tasks to start
          closing the value gap.
        </p>
        <Button onClick={onComplete} size="lg" className="gap-2">
          Go to Action Plan
          <Rocket style={{ width: '1rem', height: '1rem' }} />
        </Button>
      </motion.div>
    </div>
  )
}
