'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubStep {
  id: string
  title: string
  completed: boolean
}

interface SubStepChecklistProps {
  steps: SubStep[]
  progress: { completed: number; total: number }
  onToggle: (stepId: string, completed: boolean) => void
}

export function SubStepChecklist({ steps, progress, onToggle }: SubStepChecklistProps) {
  if (steps.length === 0) return null

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0

  return (
    <div className="mt-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--burnt-orange)] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {progress.completed} of {progress.total} steps
        </span>
      </div>

      {/* Checklist */}
      <div className="mt-3 space-y-2">
        {steps.map(step => (
          <label
            key={step.id}
            className="flex items-start gap-3 cursor-pointer group"
          >
            <button
              type="button"
              onClick={() => onToggle(step.id, !step.completed)}
              className={cn(
                'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                step.completed
                  ? 'border-[var(--burnt-orange)] bg-[var(--burnt-orange)]'
                  : 'border-border group-hover:border-muted-foreground'
              )}
            >
              {step.completed && <Check className="h-3 w-3 text-white" />}
            </button>
            <span
              className={cn(
                'text-sm transition-colors',
                step.completed
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
            >
              {step.title}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
