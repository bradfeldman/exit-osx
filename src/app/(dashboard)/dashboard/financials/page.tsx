'use client'

import { FinancialsOverview } from '@/components/financials/FinancialsOverview'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function FinancialsPage() {
  return (
    <>
      <TrackPageView page="/dashboard/financials" />
      <FinancialsOverview />
    </>
  )
}
