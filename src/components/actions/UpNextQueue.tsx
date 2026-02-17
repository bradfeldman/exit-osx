'use client'

import { QueueItemRow } from './QueueItemRow'
import { FreemiumGateCard } from './FreemiumGateCard'

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
  onUpgrade?: () => void
}

export function UpNextQueue({ tasks, otherActiveTasks = [], hasMore, totalQueueSize, onFocusTask, freeTaskLimit, onLockedTaskClick, onUpgrade }: UpNextQueueProps) {
  const hasItems = otherActiveTasks.length > 0 || tasks.length > 0

  if (!hasItems) return null

  // Calculate where the freemium gate should appear
  const gateIndex = freeTaskLimit !== undefined ? freeTaskLimit - otherActiveTasks.length : undefined
  const showGate = gateIndex !== undefined && gateIndex >= 0 && gateIndex < tasks.length

  // Calculate locked task stats
  const lockedTasks = showGate ? tasks.slice(gateIndex) : []
  const lockedValueTotal = lockedTasks.reduce((sum, t) => sum + t.normalizedValue, 0)

  // Split tasks into free and locked groups
  const freeTasks = showGate ? tasks.slice(0, gateIndex) : tasks
  const lockedTasksList = showGate ? tasks.slice(gateIndex) : []

  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">
        {otherActiveTasks.length > 0 ? 'Other Tasks' : 'Up Next'}
      </h2>

      <div className="space-y-3">
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
          {freeTasks.map(task => (
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
              onClick={() => onFocusTask?.(task.id)}
            />
          ))}
        </div>

        {/* Inline freemium gate */}
        {showGate && (
          <FreemiumGateCard
            lockedTaskCount={lockedTasksList.length}
            lockedValueTotal={lockedValueTotal}
            onUpgrade={() => {
              if (onUpgrade) {
                onUpgrade()
              } else if (onLockedTaskClick) {
                onLockedTaskClick(lockedValueTotal)
              }
            }}
          />
        )}

        {/* Locked tasks shown dimmed after gate */}
        {lockedTasksList.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30 opacity-60">
            {lockedTasksList.map(task => (
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
                locked={true}
                onClick={() => onLockedTaskClick?.(task.normalizedValue)}
              />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <p className="text-sm text-muted-foreground text-center mt-3 cursor-pointer hover:text-foreground transition-colors">
          See all {totalQueueSize} tasks in queue
        </p>
      )}
    </div>
  )
}
