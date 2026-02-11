'use client'

import { useState } from 'react'
import { Check, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface CompletedTaskRowProps {
  title: string
  completedValue: number
  completedAt: string
  completionNotes?: string | null
  hasEvidence?: boolean
}

export function CompletedTaskRow({ title, completedValue, completedAt, completionNotes, hasEvidence = false }: CompletedTaskRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasNotes = completionNotes && completionNotes.trim().length > 0

  return (
    <div className="rounded">
      <div
        className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/20 cursor-pointer"
        onClick={() => hasNotes && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-sm text-muted-foreground truncate">{title}</span>
          {hasNotes && (
            <div className="flex items-center gap-1 shrink-0">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <span className="text-sm font-medium text-emerald-600">
            +{formatCurrency(completedValue)} recovered
          </span>
          <span className="text-xs text-muted-foreground">{formatShortDate(completedAt)}</span>
        </div>
      </div>

      {isExpanded && hasNotes && (
        <div className="pl-7 pr-1 pb-2">
          <div className="bg-muted/30 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap">
            {completionNotes}
          </div>
        </div>
      )}
    </div>
  )
}
