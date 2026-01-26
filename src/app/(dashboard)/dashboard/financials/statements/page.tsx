'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function StatementsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodId = searchParams.get('periodId')
  const tab = searchParams.get('tab') || 'pnl'
  const qbConnected = searchParams.get('qb_connected')
  const qbError = searchParams.get('qb_error')

  useEffect(() => {
    if (periodId) {
      // Redirect to the new dynamic route with period
      router.replace(`/dashboard/financials/statements/${periodId}?tab=${tab}`)
    } else {
      // Redirect to the main financials overview, preserving OAuth callback params
      const params = new URLSearchParams()
      if (qbConnected) params.set('qb_connected', qbConnected)
      if (qbError) params.set('qb_error', qbError)
      const queryString = params.toString()
      router.replace(`/dashboard/financials${queryString ? `?${queryString}` : ''}`)
    }
  }, [periodId, tab, qbConnected, qbError, router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

export default function StatementsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <StatementsRedirect />
    </Suspense>
  )
}
