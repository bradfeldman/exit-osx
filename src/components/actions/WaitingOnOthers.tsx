'use client'

import { Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

interface WaitingTask {
  id: string
  title: string
  briCategory: string
  normalizedValue: number
  assignee: { name: string; email: string; role: string | null }
  assignedAt: string
  lastUpdated: string | null
}

interface WaitingOnOthersProps {
  tasks: WaitingTask[]
}

export function WaitingOnOthers({ tasks }: WaitingOnOthersProps) {
  if (tasks.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">
        WAITING ON OTHERS
      </h2>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
        {tasks.map(task => (
          <div key={task.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigned to {task.assignee.name}
                  {task.assignee.role && ` (${task.assignee.role})`}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap ml-4">
              ~{formatCurrency(task.normalizedValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
