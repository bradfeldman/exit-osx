import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  // If user has companies, send to dashboard
  const { count } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })

  if (count && count > 0) {
    redirect('/dashboard')
  }

  return <OnboardingFlow userName={user?.user_metadata?.name} />
}
