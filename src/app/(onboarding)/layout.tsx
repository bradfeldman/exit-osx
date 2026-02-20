import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingProviders } from '@/components/onboarding/OnboardingProviders'
import styles from '@/components/onboarding/onboarding.module.css'

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
      <div className={styles.obShell}>
        {children}
      </div>
    </OnboardingProviders>
  )
}
