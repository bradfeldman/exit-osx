'use client'

import { HomePage } from '@/components/home/HomePage'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function DashboardPage() {
  return (
    <>
      <TrackPageView page="/dashboard" />
      <HomePage />
    </>
  )
}
