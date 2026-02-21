'use client'

import { ValueHome } from '@/components/value/ValueHome'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function DashboardPage() {
  return (
    <>
      <TrackPageView page="/dashboard" />
      <ValueHome />
    </>
  )
}
