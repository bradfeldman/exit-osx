'use client'

import Link from 'next/link'
import { Link2, CheckCircle2 } from 'lucide-react'

interface QuickBooksStatusProps {
  isConnected: boolean
  lastSyncedAt?: string | null
}

export function QuickBooksStatus({ isConnected, lastSyncedAt }: QuickBooksStatusProps) {
  const formattedDate = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  if (isConnected) {
    return (
      <Link
        href="/dashboard/financials"
        className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition-colors"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="font-medium">QuickBooks Connected</span>
        {formattedDate && (
          <span className="text-green-600">· Last sync: {formattedDate}</span>
        )}
      </Link>
    )
  }

  return (
    <Link
      href="/dashboard/financials"
      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
    >
      <Link2 className="h-4 w-4" />
      <span className="font-medium">Connect to QuickBooks</span>
    </Link>
  )
}
