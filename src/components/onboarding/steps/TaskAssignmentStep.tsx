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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">
          Creating your personalized action plan...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 dark:bg-red-950/30 dark:border-red-800/30 dark:text-red-400">
          <p className="font-medium">Unable to generate action plan</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <Button onClick={onComplete}>
          Continue to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Your Action Plan
        </h2>
        <p className="text-muted-foreground mt-2">
          {tasks.length} tasks to start improving {companyName}&apos;s value
        </p>
      </motion.div>

      {/* Value Impact Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-muted-foreground">Potential Value Impact</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(totalValueImprovement)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-muted-foreground">Time Investment</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ~{totalHours} hours
          </p>
        </div>
      </motion.div>

      {/* Task List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showTasks ? 1 : 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-foreground">This Week&apos;s Tasks</h3>

        <div className="space-y-3">
          {tasks.map((task, index) => {
            const Icon = CATEGORY_ICONS[task.category] || Settings
            const isRevealed = index < revealedTasks

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isRevealed ? 1 : 0, x: isRevealed ? 0 : -20 }}
                transition={{ duration: 0.3 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {CATEGORY_LABELS[task.category] || task.category}
                      </span>
                      {task.estimatedHours && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimatedHours}h
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-foreground">{task.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                    {task.estimatedValue > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +{formatCurrency(task.estimatedValue)} potential value
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
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
        className="bg-gradient-to-br from-primary/10 to-amber-500/10 rounded-2xl border border-primary/20 p-6 text-center"
      >
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-6 h-6 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Ready to Start Building Value?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your personalized action plan is waiting. Complete these tasks to start
          closing the value gap.
        </p>
        <Button onClick={onComplete} size="lg" className="gap-2">
          Go to Action Plan
          <Rocket className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  )
}
