import { ActionsPage } from '@/components/actions/ActionsPage'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function ActionsRoute() {
  return (
    <>
      <TrackPageView page="/dashboard/actions" />
      <ActionsPage />
    </>
  )
}
