'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { HeroSummaryBar } from './HeroSummaryBar'
import { ActiveTaskCard } from './ActiveTaskCard'
import { UpNextQueue } from './UpNextQueue'
import { CompletedThisMonth } from './CompletedThisMonth'
import { WaitingOnOthers } from './WaitingOnOthers'
import { DeferredTasks } from './DeferredTasks'
import { EmptyState } from './EmptyState'
import { AllCompletedState } from './AllCompletedState'
import { ActionsLoading } from './ActionsLoading'
import { ActionsError } from './ActionsError'
import { TaskCompletionDialog } from './TaskCompletionDialog'

interface SubStep {
  id: string
  title: string
  completed: boolean
}

interface ActiveTask {
  id: string
  title: string
  description: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  estimatedMinutes: number | null
  effortLevel: string
  status: string
  startedAt: string | null
  daysInProgress: number | null
  priorityRank: number
  buyerConsequence: string | null
  buyerRisk: {
    mainQuestion: string
    consequences: string[]
    conclusion: string
  } | null
  subSteps: SubStep[]
  subStepProgress: {
    completed: number
    total: number
  }
  successCriteria: {
    overview: string
    outcomes: string[]
  } | null
  outputFormat: {
    description: string
    formats: string[]
    guidance: string
  } | null
  assignee: {
    id: string
    name: string
    email: string
    role: string | null
  } | null
  isAssignedToCurrentUser: boolean
  pendingInvite: { email: string; sentAt: string } | null
  proofDocuments: { id: string; name: string; uploadedAt: string }[]
}

interface UpNextTask extends ActiveTask {
  prerequisiteHint: string | null
  outputHint: string | null
}

interface CompletedTask {
  id: string
  title: string
  completedValue: number
  completedAt: string
  briCategory: string
  completionNotes: string | null
  hasEvidence: boolean
}

interface WaitingTask {
  id: string
  title: string
  briCategory: string
  normalizedValue: number
  assignee: { name: string; email: string; role: string | null }
  assignedAt: string
  lastUpdated: string | null
}

interface DeferredTask {
  id: string
  title: string
  briCategory: string
  normalizedValue: number
  deferredUntil: string
  deferralReason: string | null
}

interface ActionsData {
  summary: {
    totalTasks: number
    activeTasks: number
    deferredTasks: number
    completedThisMonth: number
    valueRecoveredThisMonth: number
  }
  activeTasks: ActiveTask[]
  upNext: UpNextTask[]
  completedThisMonth: CompletedTask[]
  waitingOnOthers: WaitingTask[]
  deferredTasks: DeferredTask[]
  hasMoreInQueue: boolean
  totalQueueSize: number
}

export function ActionsPage() {
  const { selectedCompanyId } = useCompany()
  const searchParams = useSearchParams()
  const highlightTaskId = searchParams.get('taskId')
  const scrolledRef = useRef(false)
  const generationFiredRef = useRef(false)
  const [data, setData] = useState<ActionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completingTask, setCompletingTask] = useState<ActiveTask | null>(null)
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/actions`)
      if (!response.ok) throw new Error('Failed to fetch actions data')
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Scroll to highlighted task from query param (e.g. after onboarding)
  useEffect(() => {
    if (highlightTaskId && data && !scrolledRef.current) {
      scrolledRef.current = true
      // Small delay to let animations render
      setTimeout(() => {
        const el = document.getElementById(`task-${highlightTaskId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
    }
  }, [highlightTaskId, data])

  // Auto-trigger AI question generation when all tasks are completed
  const allTasksCompleted = data
    ? data.activeTasks.length === 0 && data.upNext.length === 0 && data.waitingOnOthers.length === 0
    : false

  useEffect(() => {
    if (allTasksCompleted && selectedCompanyId && !generationFiredRef.current) {
      generationFiredRef.current = true
      fetch(`/api/companies/${selectedCompanyId}/dossier/generate-questions`, {
        method: 'POST',
      }).catch(() => {})
    }
  }, [allTasksCompleted, selectedCompanyId])

  const handleSubStepToggle = async (taskId: string, stepId: string, completed: boolean) => {
    if (!data) return

    // Optimistic update
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        activeTasks: prev.activeTasks.map(task => {
          if (task.id !== taskId) return task
          const newSubSteps = task.subSteps.map(s =>
            s.id === stepId ? { ...s, completed } : s
          )
          const completedCount = newSubSteps.filter(s => s.completed).length
          return {
            ...task,
            subSteps: newSubSteps,
            subStepProgress: { completed: completedCount, total: newSubSteps.length },
          }
        }),
      }
    })

    // Persist to server
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subStepId: stepId, subStepCompleted: completed }),
      })
    } catch {
      // Revert on error
      fetchData()
    }
  }

  const handleStartTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        console.error('Start task failed:', response.status, err)
        alert(err.message || `Failed to start task (${response.status})`)
        return
      }
      setFocusedTaskId(taskId)
      fetchData()
    } catch (err) {
      console.error('Start task error:', err)
      alert('Could not start task. Please check your connection.')
    }
  }

  const handleCompleteTask = (task: ActiveTask) => {
    setCompletingTask(task)
  }

  const handleCompletionConfirm = async (taskId: string, notes: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionNotes: notes }),
      })
      setCompletingTask(null)
      fetchData()
    } catch {
      // Keep dialog open on error
    }
  }

  const handleBlockTask = async (taskId: string, reason: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'BLOCKED', blockedReason: reason }),
      })
      fetchData()
    } catch {
      // Silently fail
    }
  }

  const handleDeferTask = async (taskId: string, deferredUntil: string, reason: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DEFERRED',
          deferredUntil,
          deferralReason: reason || 'Deferred',
        }),
      })
      fetchData()
    } catch {
      // Silently fail
    }
  }

  const handleResumeTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING',
          deferredUntil: null,
        }),
      })
      fetchData()
    } catch {
      // Silently fail
    }
  }

  if (isLoading) return <ActionsLoading />
  if (error || !data) return <ActionsError onRetry={fetchData} />

  const hasNoTasks = data.summary.totalTasks === 0 && data.completedThisMonth.length === 0

  if (hasNoTasks) return <EmptyState />

  // Determine which task is focused (shown as big card)
  // Check both active and upNext lists; default to first active, then first upNext
  const allFocusable = [...data.activeTasks, ...data.upNext]
  const effectiveFocusedId = (() => {
    if (focusedTaskId && allFocusable.some(t => t.id === focusedTaskId)) {
      return focusedTaskId
    }
    if (data.activeTasks.length > 0) return data.activeTasks[0].id
    if (data.upNext.length > 0) return data.upNext[0].id
    return null
  })()

  const focusedTask = effectiveFocusedId
    ? allFocusable.find(t => t.id === effectiveFocusedId) ?? null
    : null

  const isFocusedPending = focusedTask?.status === 'PENDING'

  const otherActiveTasks = data.activeTasks.filter(t => t.id !== effectiveFocusedId)
  const remainingUpNext = data.upNext.filter(t => t.id !== effectiveFocusedId)

  // Map other active tasks to the shape UpNextQueue expects
  const otherActiveForQueue = otherActiveTasks.map(t => ({
    id: t.id,
    title: t.title,
    briCategory: t.briCategory,
    categoryLabel: t.categoryLabel,
    normalizedValue: t.normalizedValue,
    estimatedMinutes: t.estimatedMinutes,
    assignee: t.assignee ? { name: t.assignee.name, role: t.assignee.role } : null,
  }))

  const showQueue = otherActiveTasks.length > 0 || remainingUpNext.length > 0

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      <AnimatedStagger className="space-y-6" staggerDelay={0.1}>
        <AnimatedItem>
          <HeroSummaryBar
            totalTasks={data.summary.totalTasks}
            activeTasks={data.summary.activeTasks}
            deferredTasks={data.summary.deferredTasks}
            completedThisMonth={data.summary.completedThisMonth}
            valueRecoveredThisMonth={data.summary.valueRecoveredThisMonth}
          />
        </AnimatedItem>

        {allTasksCompleted && (
          <AnimatedItem>
            <AllCompletedState
              completedCount={data.summary.completedThisMonth}
              valueRecovered={data.summary.valueRecoveredThisMonth}
            />
          </AnimatedItem>
        )}

        {focusedTask && (
          <AnimatedItem key={focusedTask.id}>
            <div id={`task-${focusedTask.id}`}>
              <ActiveTaskCard
                task={focusedTask}
                onSubStepToggle={handleSubStepToggle}
                onComplete={() => handleCompleteTask(focusedTask)}
                onStart={isFocusedPending ? () => handleStartTask(focusedTask.id) : undefined}
                onBlock={handleBlockTask}
                onDefer={handleDeferTask}
                onRefresh={fetchData}
              />
            </div>
          </AnimatedItem>
        )}

        {showQueue && (
          <AnimatedItem>
            <UpNextQueue
              tasks={remainingUpNext}
              otherActiveTasks={otherActiveForQueue}
              hasMore={data.hasMoreInQueue}
              totalQueueSize={data.totalQueueSize}
              onFocusTask={(taskId) => setFocusedTaskId(taskId)}
            />
          </AnimatedItem>
        )}

        {data.waitingOnOthers.length > 0 && (
          <AnimatedItem>
            <WaitingOnOthers tasks={data.waitingOnOthers} />
          </AnimatedItem>
        )}

        {data.deferredTasks && data.deferredTasks.length > 0 && (
          <AnimatedItem>
            <DeferredTasks tasks={data.deferredTasks} onResume={handleResumeTask} />
          </AnimatedItem>
        )}

        {data.completedThisMonth.length > 0 && (
          <AnimatedItem>
            <CompletedThisMonth
              tasks={data.completedThisMonth}
              totalValue={data.summary.valueRecoveredThisMonth}
            />
          </AnimatedItem>
        )}
      </AnimatedStagger>

      {completingTask && (
        <TaskCompletionDialog
          task={completingTask}
          onConfirm={handleCompletionConfirm}
          onCancel={() => setCompletingTask(null)}
        />
      )}
    </div>
  )
}
