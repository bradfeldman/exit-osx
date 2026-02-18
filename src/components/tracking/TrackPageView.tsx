'use client'

import { useEffect, useRef } from 'react'

interface TrackPageViewProps {
  page: string
}

/**
 * Client component that fires a page_view event on mount.
 * Renders nothing. Place it inside any page to track views.
 */
export function TrackPageView({ page }: TrackPageViewProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    }).catch(() => {})
  }, [page])

  return null
}
