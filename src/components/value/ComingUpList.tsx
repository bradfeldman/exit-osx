'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/currency'

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

export function ComingUpList({ tasks }: ComingUpListProps) {
  const router = useRouter()

  if (tasks.length === 0) return null

  return (
    <div>
      <div className="border-t border-border my-4" />
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        COMING UP
      </p>
      {tasks.map(task => (
        <div
          key={task.id}
          className="flex justify-between items-center py-2 text-sm cursor-pointer hover:text-foreground transition-colors"
          onClick={() => router.push('/dashboard/actions')}
        >
          <span className="text-muted-foreground">
            {truncate(task.title, 40)}
          </span>
          <span className="text-muted-foreground/70 text-xs whitespace-nowrap ml-4">
            {task.estimatedHours ? formatTime(task.estimatedHours) : ''}
            {task.estimatedHours && task.rawImpact ? ' · ' : ''}
            {task.rawImpact ? `~${formatCurrency(task.rawImpact)}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
