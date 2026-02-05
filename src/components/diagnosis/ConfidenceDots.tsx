'use client'

import { cn } from '@/lib/utils'

interface ConfidenceDotsProps {
  dots: number  // 0-4
  label: string
  className?: string
}

export function ConfidenceDots({ dots, label, className }: ConfidenceDotsProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} title={`Confidence: ${label}`}>
      <span className="text-xs text-muted-foreground mr-1">Confidence:</span>
      {[0, 1, 2, 3].map(i => (
        <span
          key={i}
          className={cn(
            'text-sm',
            i < dots ? 'text-primary' : 'text-muted-foreground/30'
          )}
        >
          {i < dots ? '●' : '○'}
        </span>
      ))}
    </div>
  )
}
