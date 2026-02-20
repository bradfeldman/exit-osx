'use client'

import { CoachPage } from '@/components/ai-coach/CoachPage'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function CoachRoute() {
  return (
    <>
      <TrackPageView page="ai_coach" />
      <CoachPage />
    </>
  )
}
