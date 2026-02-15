'use client'

import { QueueItemRow } from './QueueItemRow'

interface UpNextTask {
  id: string
  title: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  estimatedMinutes: number | null
  prerequisiteHint?: string | null
  outputHint?: string | null
  assignee: { name: string; role: string | null; [key: string]: unknown } | null
}

interface OtherActiveTask {
  id: string
  title: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  estimatedMinutes: number | null
  assignee: { name: string; role: string | null } | null
}

interface UpNextQueueProps {
  tasks: UpNextTask[]
  otherActiveTasks?: OtherActiveTask[]
  hasMore: boolean
  totalQueueSize: number
  onFocusTask?: (taskId: string) => void
  freeTaskLimit?: number
  onLockedTaskClick?: (taskValue: number) => void
}

export function UpNextQueue({ tasks, otherActiveTasks = [], hasMore, totalQueueSize, onFocusTask, freeTaskLimit, onLockedTaskClick }: UpNextQueueProps) {
  const hasItems = otherActiveTasks.length > 0 || tasks.length > 0

  if (!hasItems) return null

  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">
        {otherActiveTasks.length > 0 ? 'Other Tasks' : 'Up Next'}
      </h2>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
        {otherActiveTasks.map(task => (
          <QueueItemRow
            key={task.id}
            title={task.title}
            categoryLabel={task.categoryLabel}
            briCategory={task.briCategory}
            normalizedValue={task.normalizedValue}
            estimatedMinutes={task.estimatedMinutes}
            prerequisiteHint={null}
            outputHint={null}
            assignee={task.assignee}
            status="IN_PROGRESS"
            onClick={() => onFocusTask?.(task.id)}
          />
        ))}
        {tasks.map((task, i) => {
          // If freeTaskLimit is set, lock tasks beyond the limit
          // Account for otherActiveTasks taking up slots
          const isLocked = freeTaskLimit !== undefined && (otherActiveTasks.length + i) >= freeTaskLimit
          return (
            <QueueItemRow
              key={task.id}
              title={task.title}
              categoryLabel={task.categoryLabel}
              briCategory={task.briCategory}
              normalizedValue={task.normalizedValue}
              estimatedMinutes={task.estimatedMinutes}
              prerequisiteHint={task.prerequisiteHint ?? null}
              outputHint={task.outputHint ?? null}
              assignee={task.assignee ? { name: task.assignee.name, role: task.assignee.role } : null}
              locked={isLocked}
              onClick={() => {
                if (isLocked) {
                  onLockedTaskClick?.(task.normalizedValue)
                } else {
                  onFocusTask?.(task.id)
                }
              }}
            />
          )
        })}
      </div>

      {hasMore && (
        <p className="text-sm text-muted-foreground text-center mt-3 cursor-pointer hover:text-foreground transition-colors">
          See all {totalQueueSize} tasks in queue
        </p>
      )}
    </div>
  )
}
