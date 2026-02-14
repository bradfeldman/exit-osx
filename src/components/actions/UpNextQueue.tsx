'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QueueItemRow } from './QueueItemRow'

interface UpNextTask {
  id: string
  title: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  estimatedMinutes: number | null
  effortLevel: string
  priorityRank: number
  prerequisiteHint: string | null
  outputHint: string | null
  assignee: { name: string; role: string | null } | null
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
  onStartTask: (taskId: string) => void
  onFocusTask?: (taskId: string) => void
  disabled?: boolean
  autoExpandFirst?: boolean
}

export function UpNextQueue({ tasks, otherActiveTasks = [], hasMore, totalQueueSize, onStartTask, onFocusTask, disabled = false, autoExpandFirst = false }: UpNextQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    autoExpandFirst && tasks.length > 0 ? tasks[0].id : null
  )

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
        {tasks.map(task => (
          <div key={task.id}>
            {expandedId === task.id ? (
              <div className="p-4">
                <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {task.categoryLabel} · ~${Math.round(task.normalizedValue / 1000)}K impact
                  {task.estimatedMinutes && ` · ${task.estimatedMinutes} min`}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" onClick={() => onStartTask(task.id)} disabled={disabled}>
                    Start This Task
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(null)}
                  >
                    Collapse
                  </Button>
                </div>
              </div>
            ) : (
              <QueueItemRow
                title={task.title}
                categoryLabel={task.categoryLabel}
                briCategory={task.briCategory}
                normalizedValue={task.normalizedValue}
                estimatedMinutes={task.estimatedMinutes}
                prerequisiteHint={task.prerequisiteHint}
                outputHint={task.outputHint}
                assignee={task.assignee}
                onClick={() => setExpandedId(task.id)}
              />
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <p className="text-sm text-muted-foreground text-center mt-3 cursor-pointer hover:text-foreground transition-colors">
          See all {totalQueueSize} tasks in queue
        </p>
      )}
    </div>
  )
}
