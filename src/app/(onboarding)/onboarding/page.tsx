import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { prisma } from '@/lib/prisma'
import { trackProductEvent } from '@/lib/analytics/track-product-event'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/onboarding')
  }

  // Track onboarding_started (fire-and-forget)
  prisma.user.findUnique({
    where: { authId: user.id },
    select: { id: true },
  }).then((dbUser) => {
    if (dbUser) {
      trackProductEvent({
        userId: dbUser.id,
        eventName: 'onboarding_started',
        eventCategory: 'onboarding',
        page: '/onboarding',
      })
    }
  }).catch(() => {})

  return <OnboardingFlow userName={user?.user_metadata?.name} />
}
