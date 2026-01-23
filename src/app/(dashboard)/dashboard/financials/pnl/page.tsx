'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PnLRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new consolidated financials page
    router.replace('/dashboard/financials')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
