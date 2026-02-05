'use client'

import { Check } from 'lucide-react'

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
}

export function CompletedTaskRow({ title, completedValue, completedAt }: CompletedTaskRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/20 cursor-pointer">
      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <span className="text-sm font-medium text-emerald-600">
          +{formatCurrency(completedValue)} recovered
        </span>
        <span className="text-xs text-muted-foreground">{formatShortDate(completedAt)}</span>
      </div>
    </div>
  )
}
