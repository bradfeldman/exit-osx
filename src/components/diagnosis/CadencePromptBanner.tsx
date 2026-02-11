'use client'

import { useState, useCallback } from 'react'
import { CalendarClock, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CadencePrompt {
  categoryId: string
  categoryLabel: string
  reason: string
  urgency: 'low' | 'medium' | 'high'
}

interface CadencePromptBannerProps {
  prompt: CadencePrompt
  companyId: string
  onExpand: (categoryId: string) => void
  onDismiss: () => void
}

const URGENCY_STYLES: Record<string, { border: string; bg: string; icon: string; text: string }> = {
  high: {
    border: 'border-amber-300',
    bg: 'bg-gradient-to-br from-amber-50/80 to-orange-50/50',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-800',
  },
  medium: {
    border: 'border-blue-200',
    bg: 'bg-gradient-to-br from-blue-50/50 to-indigo-50/30',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-800',
  },
  low: {
    border: 'border-gray-200',
    bg: 'bg-gradient-to-br from-gray-50/50 to-slate-50/30',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-700',
  },
}

export function CadencePromptBanner({
  prompt,
  companyId,
  onExpand,
  onDismiss,
}: CadencePromptBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const styles = URGENCY_STYLES[prompt.urgency] || URGENCY_STYLES.low

  const handleDismiss = useCallback(async () => {
    setDismissed(true)
    // Record that a prompt was shown (for weekly limit tracking)
    try {
      await fetch(`/api/companies/${companyId}/assessment-cadence`, {
        method: 'POST',
      })
    } catch {
      // Non-critical — don't block UI
    }
    onDismiss()
  }, [companyId, onDismiss])

  const handleReAssess = useCallback(() => {
    // Record prompt shown before expanding
    fetch(`/api/companies/${companyId}/assessment-cadence`, {
      method: 'POST',
    }).catch(() => {})
    onExpand(prompt.categoryId)
  }, [companyId, onExpand, prompt.categoryId])

  if (dismissed) return null

  return (
    <div className={cn('rounded-xl border p-4', styles.border, styles.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', styles.icon)}>
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <h3 className={cn('text-sm font-semibold', styles.text)}>
              {prompt.urgency === 'high'
                ? `Action needed: ${prompt.categoryLabel}`
                : `Time to re-assess: ${prompt.categoryLabel}`}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {prompt.reason}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={prompt.urgency === 'high' ? 'default' : 'outline'}
            onClick={handleReAssess}
            className="gap-1"
          >
            Re-Assess
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Dismiss prompt"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
