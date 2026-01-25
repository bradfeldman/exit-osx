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
        <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Unable to load this page
        </h2>

        <p className="text-gray-600 mb-6 text-sm">
          Something went wrong while loading this content. Please try again.
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
