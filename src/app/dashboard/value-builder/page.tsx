import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ValueBuilderClient } from './ValueBuilderClient'

export default async function ValueBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ValueBuilderClient userName={user?.user_metadata?.name} />
}
