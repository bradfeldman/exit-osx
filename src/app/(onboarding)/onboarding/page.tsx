import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { StreamlinedOnboardingFlow } from '@/components/onboarding/StreamlinedOnboardingFlow'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ streamlined?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  // Feature flag: Use streamlined flow if ?streamlined=true
  const params = await searchParams
  const useStreamlined = params.streamlined === 'true'

  // Note: We don't redirect users with companies to dashboard here.
  // The OnboardingFlow component handles that case by showing appropriate UI.
  // This prevents redirect loops between dashboard and onboarding.

  if (useStreamlined) {
    return <StreamlinedOnboardingFlow userName={user?.user_metadata?.name} />
  }

  return <OnboardingFlow userName={user?.user_metadata?.name} />
}
