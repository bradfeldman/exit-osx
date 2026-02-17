import { DealRoomPage } from '@/components/deal-room/DealRoomPage'
import { FeatureGate } from '@/components/subscription'

export default function DealRoomRoute() {
  return (
    <FeatureGate feature="data-room" featureDisplayName="Deal Room">
      <DealRoomPage />
    </FeatureGate>
  )
}
