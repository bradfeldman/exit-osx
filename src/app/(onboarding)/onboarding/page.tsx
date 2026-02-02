import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  // Note: We don't redirect users with companies to dashboard here.
  // The OnboardingFlow component handles that case by showing appropriate UI.
  // This prevents redirect loops between dashboard and onboarding.

  return <OnboardingFlow userName={user?.user_metadata?.name} />
}
