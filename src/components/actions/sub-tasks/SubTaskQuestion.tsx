'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionOption {
  label: string
  value: string
}

interface SubTaskQuestionProps {
  stepId: string
  title: string
  completed: boolean
  responseJson: unknown
  questionOptions: unknown
  onUpdate: (stepId: string, data: { responseJson: unknown; completed: boolean }) => void
}

function parseOptions(questionOptions: unknown): QuestionOption[] {
  if (!questionOptions) return []
  if (Array.isArray(questionOptions)) {
    return questionOptions.map((opt) => {
      if (typeof opt === 'string') return { label: opt, value: opt }
      if (typeof opt === 'object' && opt !== null) {
        const o = opt as Record<string, unknown>
        return { label: String(o.label || o.value || ''), value: String(o.value || o.label || '') }
      }
      return { label: String(opt), value: String(opt) }
    })
  }
  return []
}

export function SubTaskQuestion({ stepId, title, completed, responseJson, questionOptions, onUpdate }: SubTaskQuestionProps) {
  const options = parseOptions(questionOptions)
  const selectedValue = typeof responseJson === 'object' && responseJson !== null
    ? (responseJson as Record<string, unknown>).selected as string | undefined
    : undefined

  const [selected, setSelected] = useState<string | undefined>(selectedValue)

  const handleSelect = (value: string) => {
    setSelected(value)
    onUpdate(stepId, { responseJson: { selected: value }, completed: true })
  }

  if (completed && selected) {
    const selectedLabel = options.find(o => o.value === selected)?.label || selected
    return (
      <div className="flex items-start gap-3 py-2">
        <Check className="w-4 h-4 mt-0.5 text-[var(--burnt-orange)] shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground line-through">{title}</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Answer: {selectedLabel}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      <p className="text-sm text-foreground mb-2">{title}</p>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg border text-sm transition-all',
              selected === opt.value
                ? 'border-[var(--burnt-orange)] bg-[var(--burnt-orange)]/5 text-foreground'
                : 'border-border/50 hover:border-muted-foreground/50 hover:bg-muted/30 text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleSelect('not_sure')}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg border text-sm transition-all',
            selected === 'not_sure'
              ? 'border-[var(--burnt-orange)] bg-[var(--burnt-orange)]/5 text-foreground'
              : 'border-border/50 hover:border-muted-foreground/50 hover:bg-muted/30 text-muted-foreground'
          )}
        >
          Not sure
        </button>
      </div>
    </div>
  )
}
