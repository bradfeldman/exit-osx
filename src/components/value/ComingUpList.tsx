'use client'

import { useRouter } from 'next/navigation'

interface ComingUpTask {
  id: string
  title: string
  estimatedHours: number | null
  rawImpact: number
  briCategory: string
}

interface ComingUpListProps {
  tasks: ComingUpTask[]
}

function formatTime(hours: number | null): string {
  if (!hours) return ''
  if (hours < 2) return `${Math.round(hours * 60)} min`
  return `${hours} hours`
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

function getImpactIndicator(rawImpact: number): { color: string; label: string } {
  if (rawImpact >= 100000) return { color: 'bg-emerald-500', label: 'High' }
  if (rawImpact >= 25000) return { color: 'bg-blue-500', label: 'Med' }
  return { color: 'bg-muted-foreground/40', label: 'Low' }
}

export function ComingUpList({ tasks }: ComingUpListProps) {
  const router = useRouter()

  if (tasks.length === 0) return null

  return (
    <div>
      <div className="border-t border-border my-4" />
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        COMING UP
      </p>
      {tasks.map(task => {
        const impact = getImpactIndicator(task.rawImpact)
        return (
          <div
            key={task.id}
            className="flex items-center py-2 text-sm cursor-pointer hover:text-foreground transition-colors"
            onClick={() => router.push('/dashboard/action-center')}
          >
            <span className={`w-2 h-2 rounded-full ${impact.color} flex-shrink-0 mr-2.5`} />
            <span className="text-muted-foreground flex-1 min-w-0 truncate">
              {truncate(task.title, 40)}
            </span>
            {task.estimatedHours ? (
              <span className="text-muted-foreground/70 text-xs whitespace-nowrap ml-4">
                {formatTime(task.estimatedHours)}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
