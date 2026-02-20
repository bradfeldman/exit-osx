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
    <div className="rounded-lg bg-green-light dark:bg-green-dark/20 border border-green/20 dark:border-green-dark/30 px-4 py-3 flex items-center justify-between">
      <p className="text-sm text-green-dark dark:text-green">
        {message}
      </p>
      <button
        onClick={handleDismiss}
        className="ml-3 shrink-0 rounded-md p-1 text-green hover:text-green-dark dark:hover:text-green hover:bg-green-light dark:hover:bg-green-dark/30 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
