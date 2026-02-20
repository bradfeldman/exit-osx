'use client'

import { cn } from '@/lib/utils'

interface Activity {
  id: string
  type: string
  buyerName: string | null
  buyerId: string | null
  contactName: string | null
  description: string
  metadata: Record<string, unknown>
  timestamp: string
  engagementSignal: 'positive' | 'neutral' | 'warning' | null
}

const TYPE_COLORS: Record<string, string> = {
  stage_change: 'bg-primary',
  document_view: 'bg-green',
  document_download: 'bg-purple',
  question_asked: 'bg-orange',
  question_answered: 'bg-orange',
  meeting: 'bg-primary',
  offer: 'bg-[var(--burnt-orange)]',
  access_change: 'bg-muted-foreground',
  note: 'bg-muted-foreground',
}

const SIGNAL_STYLES: Record<string, string> = {
  positive: 'bg-green-light/50 dark:bg-green-dark/10 border-l-2 border-green',
  warning: 'bg-orange-light/50 dark:bg-orange-dark/10 border-l-2 border-orange',
}

interface ActivityItemProps {
  activity: Activity
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className={cn(
      'flex gap-3 py-2 px-2 rounded',
      activity.engagementSignal && SIGNAL_STYLES[activity.engagementSignal]
        ? SIGNAL_STYLES[activity.engagementSignal]
        : 'hover:bg-muted/20'
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full mt-2 flex-shrink-0',
        TYPE_COLORS[activity.type] ?? 'bg-muted-foreground'
      )} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {activity.buyerName && (
            <span className="font-semibold">{activity.buyerName}</span>
          )}
          {activity.buyerName && ' '}
          {activity.description.replace(activity.buyerName ?? '', '').trim() || activity.description}
        </p>
      </div>

      <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">
        {time}
      </span>
    </div>
  )
}
