import { DiagnosisPage } from '@/components/diagnosis/DiagnosisPage'
import { TrackPageView } from '@/components/tracking/TrackPageView'

export default function DiagnosisRoute() {
  return (
    <>
      <TrackPageView page="/dashboard/diagnosis" />
      <DiagnosisPage />
    </>
  )
}
