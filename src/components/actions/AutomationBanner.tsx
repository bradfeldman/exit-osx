'use client'

import { useState } from 'react'
import { X, Zap } from 'lucide-react'

interface AutomationBannerProps {
  briCategory: string
  hasFileUploadSubTasks: boolean
}

export function AutomationBanner({ briCategory, hasFileUploadSubTasks }: AutomationBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  // Only show for financial tasks with file upload sub-tasks
  if (briCategory !== 'FINANCIAL' || !hasFileUploadSubTasks || dismissed) {
    return null
  }

  // Check sessionStorage for dismissal
  if (typeof window !== 'undefined') {
    const key = 'qb-banner-dismissed'
    if (sessionStorage.getItem(key)) return null
  }

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('qb-banner-dismissed', '1')
    }
    setDismissed(true)
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Skip the uploads &mdash; connect QuickBooks
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-import your financials and complete these tasks instantly.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Connect QuickBooks
              <span className="text-blue-200 ml-1">(Coming soon)</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
