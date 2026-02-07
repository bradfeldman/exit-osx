import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { LandingPage } from '@/components/landing-page'

// Prevent ISR caching — this page must run on every request
// so the hostname check and auth redirect work correctly
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  // On the app subdomain, unauthenticated users go to login (not landing page).
  // This is defense-in-depth alongside the middleware redirect.
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  if (hostname === 'app.exitosx.com') {
    redirect('/login')
  }

  return <LandingPage />
}
