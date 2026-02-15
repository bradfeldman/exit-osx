'use client'

import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { getBRICategoryColor } from '@/lib/constants/bri-categories'
import { formatCurrency } from '@/lib/utils/currency'

interface QueueItemRowProps {
  title: string
  categoryLabel: string
  briCategory: string
  normalizedValue: number
  estimatedMinutes: number | null
  prerequisiteHint: string | null
  outputHint: string | null
  assignee: { name: string; role: string | null } | null
  onClick: () => void
  status?: 'IN_PROGRESS' | 'PENDING'
}

export function QueueItemRow({
  title,
  categoryLabel,
  briCategory,
  normalizedValue,
  estimatedMinutes,
  prerequisiteHint,
  outputHint,
  assignee,
  onClick,
  status,
}: QueueItemRowProps) {
  const metaParts = [categoryLabel, `~${formatCurrency(normalizedValue)}`]
  if (estimatedMinutes) metaParts.push(`${estimatedMinutes} min`)
  if (prerequisiteHint) metaParts.push(prerequisiteHint)
  else if (outputHint) metaParts.push(outputHint)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors text-left"
    >
      <div>
        <div className="flex items-center gap-2">
          {status === 'IN_PROGRESS' ? (
            <span className="w-3 h-3 rounded-full bg-[var(--burnt-orange)] shrink-0 animate-pulse" />
          ) : (
            <span className="w-3 h-3 rounded-full border-2 border-border shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground">{title}</span>
          {status === 'IN_PROGRESS' && (
            <span className="text-[10px] font-semibold tracking-wider text-[var(--burnt-orange)] uppercase">In Progress</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-5">
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {i === 0 ? (
                <span className={cn('font-medium', getBRICategoryColor(briCategory).split(' ').pop())}>
                  {part}
                </span>
              ) : (
                part
              )}
            </span>
          ))}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        {assignee && (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[10px] font-medium text-muted-foreground">
              {assignee.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      </div>
    </button>
  )
}
