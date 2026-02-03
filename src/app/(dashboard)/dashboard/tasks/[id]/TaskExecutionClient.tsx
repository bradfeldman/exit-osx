'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  briCategory: string
  rawImpact: number
  estimatedHours: number | null
  status: string
  companyId: string
}

interface TaskExecutionClientProps {
  taskId: string
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`
  }
  return `$${value.toLocaleString()}`
}

function formatRiskLabel(category: string): string {
  const labels: Record<string, string> = {
    FINANCIAL: 'Financial opacity',
    TRANSFERABILITY: 'Founder dependency',
    OPERATIONAL: 'Operational gaps',
    MARKET: 'Market position',
    LEGAL_TAX: 'Legal exposure',
    PERSONAL: 'Transition readiness',
  }
  return labels[category] || category
}

export function TaskExecutionClient({ taskId }: TaskExecutionClientProps) {
  const router = useRouter()
  const { selectedCompanyId } = useCompany()
  const { refetch: refetchProgression } = useProgression()
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTask = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/tasks/${taskId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Task not found')
          } else {
            setError('Failed to load task')
          }
          return
        }

        const data = await response.json()
        setTask(data.task)

        // Verify task belongs to selected company
        if (selectedCompanyId && data.task.companyId !== selectedCompanyId) {
          setError('Task does not belong to selected company')
        }
      } catch (err) {
        console.error('Error fetching task:', err)
        setError('Failed to load task')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [taskId, selectedCompanyId])

  const handleComplete = async () => {
    if (!task) return

    setIsCompleting(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }

      // Refresh progression to reflect completed task
      await refetchProgression()

      // Navigate back to Value Builder with success indication and value
      const taskValue = task.rawImpact ? Math.round(Number(task.rawImpact)) : 0
      router.push(`/dashboard/value-builder?completed=true&value=${taskValue}`)
    } catch (err) {
      console.error('Error completing task:', err)
      setError('Failed to complete task')
    } finally {
      setIsCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {error || 'Task not found'}
          </h2>
          <p className="text-muted-foreground mb-6">
            The task you&apos;re looking for could not be loaded.
          </p>
          <Button onClick={() => router.push('/dashboard/value-builder')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Value Builder
          </Button>
        </div>
      </div>
    )
  }

  const isCompleted = task.status === 'COMPLETED'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-8 shadow-lg"
      >
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard/value-builder')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Value Builder
        </button>

        {/* Task header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {task.title}
          </h1>

          {/* Task metadata */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Buyer risk removed:</span>
              <span className="font-medium text-foreground">{formatRiskLabel(task.briCategory)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Estimated value impact: +{formatCurrency(Number(task.rawImpact))}
              </span>
            </span>
          </div>

          {task.estimatedHours && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <Clock className="w-4 h-4" />
              <span>Estimated time: ~{task.estimatedHours * 60} minutes</span>
            </div>
          )}
        </div>

        {/* Task description */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            What to do
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        </div>

        {/* Why this matters */}
        <div className="bg-muted/50 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-foreground mb-2">
            Why buyers care about this
          </h3>
          <p className="text-sm text-muted-foreground">
            {task.briCategory === 'TRANSFERABILITY' && (
              <>
                Buyers want to see that the business can operate without you. Documenting key relationships
                and processes reduces their perceived risk and increases what they&apos;re willing to pay.
              </>
            )}
            {task.briCategory === 'FINANCIAL' && (
              <>
                Financial transparency builds buyer confidence. Clear, organized financial data reduces
                due diligence friction and prevents last-minute price negotiations.
              </>
            )}
            {task.briCategory === 'OPERATIONAL' && (
              <>
                Strong operations signal a well-run business. Buyers pay premiums for companies
                with documented processes that can scale without the founder.
              </>
            )}
            {task.briCategory === 'MARKET' && (
              <>
                Market position affects valuation multiples. Demonstrating competitive advantages
                and customer loyalty justifies higher asking prices.
              </>
            )}
            {task.briCategory === 'LEGAL_TAX' && (
              <>
                Legal and tax compliance reduces deal risk. Clean records accelerate due diligence
                and prevent deal-killing surprises.
              </>
            )}
            {task.briCategory === 'PERSONAL' && (
              <>
                Your personal readiness affects the transaction timeline and structure.
                Prepared owners negotiate better deals and smoother transitions.
              </>
            )}
          </p>
        </div>

        {/* Action buttons */}
        {isCompleted ? (
          <div className="flex items-center justify-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-emerald-700 dark:text-emerald-300">
              Task completed
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Complete
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Mark this task as complete once you&apos;ve finished the work described above.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
