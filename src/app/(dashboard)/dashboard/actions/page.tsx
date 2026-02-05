import { createClient } from '@/lib/supabase/server'
import { ActionsPage } from '@/components/actions/ActionsPage'

export default async function ActionsRoute() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  return <ActionsPage />
}
