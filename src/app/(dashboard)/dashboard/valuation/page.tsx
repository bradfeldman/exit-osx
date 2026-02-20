'use client'

import { ValuationOverview } from '@/components/valuation/ValuationOverview'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function ValuationPage() {
  return (
    <>
      <TrackPageView page="/dashboard/valuation" />
      <ValuationOverview />
    </>
  )
}
