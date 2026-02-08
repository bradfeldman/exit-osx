import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { serverAnalytics } from '@/lib/analytics/server'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/security/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Track email verification (non-blocking)
      serverAnalytics.auth.emailVerified({
        userId: data.user.id,
        email: data.user.email || '',
      }).catch(() => {})

      // Sync user to database (deferred to first dashboard load to avoid build issues)
      // The user sync will happen when they first access the dashboard
      const response = NextResponse.redirect(`${origin}${next}`)
      response.cookies.set(SESSION_COOKIE_NAME, String(Date.now()), {
        path: '/',
        maxAge: SESSION_COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
