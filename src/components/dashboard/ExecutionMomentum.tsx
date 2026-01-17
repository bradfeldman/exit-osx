'use client'

import Link from 'next/link'

interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  recoverableValue: number
  atRisk: number
}

interface SprintProgress {
  id: string
  name: string
  totalTasks: number
  completedTasks: number
  recoverableValue: number
}

interface ExecutionMomentumProps {
  taskStats: TaskStats
  sprintProgress: SprintProgress | null
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

export function ExecutionMomentum({ taskStats, sprintProgress }: ExecutionMomentumProps) {
  const hasActiveSprint = sprintProgress !== null
  const progressPercent = hasActiveSprint
    ? Math.round((sprintProgress.completedTasks / Math.max(sprintProgress.totalTasks, 1)) * 100)
    : Math.round((taskStats.completed / Math.max(taskStats.total, 1)) * 100)

  const totalTasks = hasActiveSprint ? sprintProgress.totalTasks : taskStats.total
  const completedTasks = hasActiveSprint ? sprintProgress.completedTasks : taskStats.completed
  const recoverable = hasActiveSprint ? sprintProgress.recoverableValue : taskStats.recoverableValue

  return (
    <div className="py-8 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {hasActiveSprint ? sprintProgress.name : 'Overall Progress'}
        </h3>
        <Link
          href="/dashboard/playbook"
          className="text-sm text-[#B87333] hover:underline font-medium"
        >
          View Playbook
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#B87333] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            <span className="font-semibold text-[#3D3D3D]">{completedTasks}</span>
            <span className="text-muted-foreground">/{totalTasks} tasks</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            <span className="font-semibold text-[#B87333]">{formatCurrency(recoverable)}</span>
            <span className="text-muted-foreground"> recoverable</span>
          </span>
        </div>

        {/* At Risk Warning */}
        {taskStats.atRisk > 0 && (
          <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-medium">{taskStats.atRisk} at risk</span>
          </div>
        )}
      </div>
    </div>
  )
}
