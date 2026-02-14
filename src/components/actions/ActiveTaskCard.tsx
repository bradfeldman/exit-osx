'use client'

import { cn } from '@/lib/utils'
import { getBRICategoryColor } from '@/lib/constants/bri-categories'
import { SubStepChecklist } from './SubStepChecklist'
import { BuyerContextBlock } from './BuyerContextBlock'
import { TaskDetailsCollapsible } from './TaskDetailsCollapsible'
import { TaskStatusActions } from './TaskStatusActions'
import { TaskNotes } from './TaskNotes'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
  subStepProgress: { completed: number; total: number }
  successCriteria: { overview: string; outcomes: string[] } | null
  outputFormat: { description: string; formats: string[]; guidance: string } | null
  assignee: { id: string; name: string; email: string; role: string | null } | null
  isAssignedToCurrentUser: boolean
  pendingInvite: { email: string; sentAt: string } | null
  proofDocuments: { id: string; name: string; uploadedAt: string }[]
}

interface ActiveTaskCardProps {
  task: ActiveTask
  onSubStepToggle: (taskId: string, stepId: string, completed: boolean) => void
  onComplete: () => void
  onStart?: () => void
  onBlock: (taskId: string, reason: string) => void
  onDefer?: (taskId: string, deferredUntil: string, reason: string) => void
  onRefresh?: () => void
  disabled?: boolean
}

export function ActiveTaskCard({ task, onSubStepToggle, onComplete, onStart, onBlock, onDefer, onRefresh, disabled = false }: ActiveTaskCardProps) {
  const metaParts: string[] = []
  metaParts.push(`~${formatCurrency(task.normalizedValue)} impact`)
  if (task.estimatedMinutes) {
    metaParts.push(`${task.estimatedMinutes} min remaining`)
  }
  if (task.startedAt) {
    metaParts.push(`Started ${formatDate(task.startedAt)}`)
  }

  const isPending = task.status === 'PENDING'
  const showStaleNudge = !isPending && task.daysInProgress !== null && task.daysInProgress >= 14

  return (
    <div className={cn(
      'rounded-xl border-2 bg-card p-6 shadow-sm',
      isPending ? 'border-border/50' : 'border-[var(--burnt-orange)]/30',
      disabled && 'opacity-60 pointer-events-none'
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        {isPending ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            UP NEXT
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--burnt-orange)]">
            <span className="w-2 h-2 rounded-full bg-[var(--burnt-orange)] animate-pulse" />
            IN PROGRESS
          </div>
        )}
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getBRICategoryColor(task.briCategory))}>
          {task.categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mt-3">{task.title}</h2>

      {/* Meta line */}
      <p className="text-sm text-muted-foreground mt-1">
        {metaParts.map((part, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            {i === 0 ? <span className="font-medium text-foreground">{part}</span> : part}
          </span>
        ))}
      </p>

      {/* Stale nudge */}
      {showStaleNudge && (
        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Started {task.daysInProgress} days ago &mdash; still working on this?
          </p>
        </div>
      )}

      {/* Buyer context */}
      <BuyerContextBlock
        buyerConsequence={task.buyerConsequence}
        buyerRisk={task.buyerRisk}
      />

      {/* Sub-steps */}
      <SubStepChecklist
        steps={task.subSteps}
        progress={task.subStepProgress}
        onToggle={(stepId, completed) => onSubStepToggle(task.id, stepId, completed)}
      />

      {/* Status actions */}
      <TaskStatusActions
        taskId={task.id}
        onComplete={onComplete}
        onStart={onStart}
        onBlock={onBlock}
        onDefer={onDefer}
        assignee={task.assignee}
        isAssignedToCurrentUser={task.isAssignedToCurrentUser}
        pendingInvite={task.pendingInvite}
        onRefresh={onRefresh}
      />

      {/* Task notes */}
      <div className="mt-4">
        <TaskNotes taskId={task.id} taskTitle={task.title} disabled={disabled} />
      </div>

      {/* Collapsible details */}
      <TaskDetailsCollapsible
        successCriteria={task.successCriteria}
        outputFormat={task.outputFormat}
        description={task.description}
      />
    </div>
  )
}
