import { SettingsPage } from '@/components/settings/SettingsPage'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function SettingsPageRoute() {
  return (
    <>
      <TrackPageView page="/dashboard/settings" />
      <SettingsPage />
    </>
  )
}
