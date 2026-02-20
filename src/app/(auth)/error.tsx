'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto w-12 h-12 bg-red-light rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-dark" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-2">
          Authentication Error
        </h2>

        <p className="text-muted-foreground mb-6 text-sm">
          We encountered an issue. Please try again.
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary transition-colors w-full"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  )
}
