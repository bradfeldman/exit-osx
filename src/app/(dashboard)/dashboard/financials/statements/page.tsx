'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function StatementsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodId = searchParams.get('periodId')
  const tab = searchParams.get('tab') || 'pnl'

  useEffect(() => {
    if (periodId) {
      // Redirect to the new dynamic route with period
      router.replace(`/dashboard/financials/statements/${periodId}?tab=${tab}`)
    } else {
      // Redirect to the main financials overview
      router.replace('/dashboard/financials')
    }
  }, [periodId, tab, router])

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
