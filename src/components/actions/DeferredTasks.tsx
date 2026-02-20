'use client'

import { Calendar, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface DeferredTask {
  id: string
  title: string
  briCategory: string
  normalizedValue: number
  deferredUntil: string
  deferralReason: string | null
}

interface DeferredTasksProps {
  tasks: DeferredTask[]
  onResume: (taskId: string) => void
}

export function DeferredTasks({ tasks, onResume }: DeferredTasksProps) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">
        DEFERRED TASKS
      </h2>

      <div className="rounded-xl border border-orange/20 dark:border-orange-dark/50 bg-orange-light dark:bg-orange-dark/20 overflow-hidden divide-y divide-orange/20 dark:divide-orange-dark/30">
        {tasks.map(task => (
          <div key={task.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Calendar className="w-4 h-4 text-orange-dark dark:text-orange shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <p className="text-xs text-orange-dark dark:text-orange mt-1">
                    Deferred until {formatDate(task.deferredUntil)}
                    {task.deferralReason && (
                      <span className="text-muted-foreground"> · {task.deferralReason}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  ~{formatCurrency(task.normalizedValue)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onResume(task.id)}
                  className="h-8 px-2 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Resume
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
