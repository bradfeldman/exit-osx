import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingProviders } from '@/components/onboarding/OnboardingProviders'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  return (
    <OnboardingProviders>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {children}
      </div>
    </OnboardingProviders>
  )
}
