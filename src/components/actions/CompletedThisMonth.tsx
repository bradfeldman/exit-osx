'use client'

import { CompletedTaskRow } from './CompletedTaskRow'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
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

interface CompletedThisMonthProps {
  tasks: CompletedTask[]
  totalValue: number
}

export function CompletedThisMonth({ tasks, totalValue }: CompletedThisMonthProps) {
  if (tasks.length === 0) return null

  return (
    <div>
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap">
          COMPLETED THIS MONTH ({tasks.length})
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Completed rows */}
      <div className="space-y-1 mt-3">
        {tasks.map(task => (
          <CompletedTaskRow
            key={task.id}
            title={task.title}
            completedValue={task.completedValue}
            completedAt={task.completedAt}
            completionNotes={task.completionNotes}
            hasEvidence={task.hasEvidence}
          />
        ))}
      </div>

      {/* Running total */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <p className="text-sm text-muted-foreground">
          Total value recovered this month:{' '}
          <span className="text-lg font-bold text-[var(--burnt-orange)]">
            {formatCurrency(totalValue)}
          </span>
        </p>
      </div>
    </div>
  )
}
