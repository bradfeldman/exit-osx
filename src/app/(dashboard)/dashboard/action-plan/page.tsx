import { createClient } from '@/lib/supabase/server'
import { ActionPlanContent } from '@/components/action-plan/ActionPlanContent'

export default async function ActionPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <ActionPlanContent userName={user?.user_metadata?.name} />
}
