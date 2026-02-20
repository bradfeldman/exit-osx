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
    border: 'border-orange/30',
    bg: 'bg-gradient-to-br from-orange-light/80 to-orange-light/50',
    icon: 'bg-orange-light text-orange-dark',
    text: 'text-orange-dark',
  },
  medium: {
    border: 'border-primary/20',
    bg: 'bg-gradient-to-br from-primary/5 to-primary/3',
    icon: 'bg-primary/10 text-primary',
    text: 'text-primary',
  },
  low: {
    border: 'border-border',
    bg: 'bg-gradient-to-br from-muted/50 to-muted/30',
    icon: 'bg-muted text-muted-foreground',
    text: 'text-foreground',
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
