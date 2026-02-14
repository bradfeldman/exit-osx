'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface EnrichmentBannerProps {
  alertId: string
  message: string
}

export function EnrichmentBanner({ alertId, message }: EnrichmentBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    // Mark alert as read via existing endpoint
    fetch(`/api/alerts/${alertId}/read`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 px-4 py-3 flex items-center justify-between">
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        {message}
      </p>
      <button
        onClick={handleDismiss}
        className="ml-3 shrink-0 rounded-md p-1 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
