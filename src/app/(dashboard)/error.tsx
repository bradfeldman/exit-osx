'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 bg-red-light rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-red-dark" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Unable to load this page
        </h2>

        <p className="text-muted-foreground mb-6 text-sm">
          Something went wrong while loading this content. Please try again.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
