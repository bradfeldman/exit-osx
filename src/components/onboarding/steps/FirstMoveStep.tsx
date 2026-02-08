'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toFixed(0)}`
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
      <div className="flex flex-col items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            Creating your personalized action plan...
          </p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error || !firstTask) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 dark:bg-red-950/30 dark:border-red-800/30 dark:text-red-400">
          <p className="font-medium">Unable to generate action plan</p>
          <p className="text-sm mt-1">{error || 'No tasks available'}</p>
        </div>
        <Button onClick={() => onComplete()}>
          Continue to Dashboard
        </Button>
      </div>
    )
  }

  const estimatedMinutes = (firstTask.estimatedHours || 1) * 60
  const briChange = Math.min(100, riskResults.briScore + 6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Your First Move
        </h2>
        <p className="text-muted-foreground mt-2">
          If you do nothing else, do this.
        </p>
      </motion.div>

      {/* Single Task Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative bg-card rounded-2xl border-2 border-primary p-6"
      >
        {/* Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground uppercase tracking-wider">
            Highest Impact
          </span>
        </div>

        {/* Task Content */}
        <div className="mt-4">
          <h3 className="text-xl font-bold text-foreground mb-2">
            {firstTask.title}
          </h3>
          <p className="text-muted-foreground mb-6">
            {firstTask.description}
          </p>

          {/* Task Metrics */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(firstTask.estimatedValue)}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Value Impact
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {estimatedMinutes} min
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Est. Time
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {CATEGORY_LABELS[firstTask.category] || firstTask.category}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Risk Addressed
              </p>
            </div>
          </div>

          {/* Unlock Note */}
          <p className="text-sm text-muted-foreground text-center mt-4">
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
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Back to Results */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <button
          onClick={() => window.history.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Results
        </button>
      </motion.div>
    </div>
  )
}
