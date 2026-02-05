import { createClient } from '@/lib/supabase/server'
import { DealRoomPage } from '@/components/deal-room/DealRoomPage'

export default async function DealRoomRoute() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  return <DealRoomPage />
}
