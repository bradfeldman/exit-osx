import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { serverAnalytics } from '@/lib/analytics/server'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/security/constants'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorCode = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle Supabase error redirects (e.g. expired OTP links)
  if (errorCode) {
    const isExpired = errorCode === 'access_denied' &&
      (errorDescription?.includes('expired') || errorDescription?.includes('OTP'))
    if (isExpired) {
      return NextResponse.redirect(`${origin}/login?error=link_expired`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

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

    // exchangeCodeForSession failed — check if it's an expiration
    if (error?.message?.includes('expired') || error?.code === 'otp_expired') {
      return NextResponse.redirect(`${origin}/login?error=link_expired`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
