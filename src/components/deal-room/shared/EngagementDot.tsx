'use client'

import { cn } from '@/lib/utils'

const DOT_STYLES: Record<string, string> = {
  hot: 'bg-emerald-500 animate-pulse',
  warm: 'bg-amber-500',
  cold: 'bg-muted-foreground/30',
  none: 'hidden',
}

interface EngagementDotProps {
  level: 'hot' | 'warm' | 'cold' | 'none'
  className?: string
}

export function EngagementDot({ level, className }: EngagementDotProps) {
  if (level === 'none') return null

  return (
    <span
      className={cn('w-2 h-2 rounded-full', DOT_STYLES[level], className)}
      title={
        level === 'hot' ? 'High engagement'
          : level === 'warm' ? 'Active'
          : 'No recent activity'
      }
    />
  )
}
