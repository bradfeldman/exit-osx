import { createClient } from '@/lib/supabase/server'
import { ValueHome } from '@/components/value/ValueHome'

export default async function DashboardPage() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  return <ValueHome />
}
