import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

interface OnboardingPageProps {
  searchParams: Promise<{ step?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  const params = await searchParams
  const step = params.step ? parseInt(params.step, 10) : 1

  // If user has companies AND is on step 1, send to dashboard
  // Steps 2+ mean they're in the middle of onboarding flow
  if (step === 1) {
    const { count } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })

    if (count && count > 0) {
      redirect('/dashboard')
    }
  }

  return <OnboardingFlow userName={user?.user_metadata?.name} />
}
