import { NextResponse } from 'next/server'

/**
 * Handles magic link verification via our own domain.
 *
 * Email links point to app.exitosx.com/auth/confirm (our domain) to avoid
 * domain mismatch with our sender email which triggers Gmail spam filters.
 *
 * This route redirects to Supabase's /auth/v1/verify endpoint with the token,
 * which verifies the OTP and redirects back to /auth/callback with a session code.
 * The /auth/callback handler then exchanges the code for a session.
 *
 * Supports both:
 * - `token` param (new): raw token from action_link, redirects through Supabase verify
 * - `token_hash` param (legacy): hashed token, tries server-side verifyOtp
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'signup' | 'email'
  const next = searchParams.get('next') ?? '/activate'

  if ((!token && !tokenHash) || !type) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  // Sanitize redirect to prevent open redirects
  const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
    ? next
    : '/activate'

  // New approach: redirect to Supabase's verify endpoint with the raw token.
  // Supabase verifies the token, then redirects to /auth/callback with a session code.
  // This is more reliable than server-side verifyOtp (which can fail with PKCE).
  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('[Auth Confirm] NEXT_PUBLIC_SUPABASE_URL not configured')
      return NextResponse.redirect(`${origin}/login?error=auth_error`)
    }

    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(callbackUrl)}`

    return NextResponse.redirect(verifyUrl)
  }

  // Legacy fallback: server-side verifyOtp with token_hash
  // Keep this for any old emails that were sent with token_hash links
  if (tokenHash) {
    const { createClient } = await import('@/lib/supabase/server')
    const { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } = await import('@/lib/security/constants')

    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) {
      console.error('[Auth Confirm] verifyOtp failed:', error.message, error)
      const isExpired = error.message?.includes('expired') || error.message?.includes('invalid')
      return NextResponse.redirect(
        `${origin}/login?error=${isExpired ? 'link_expired' : 'auth_error'}`
      )
    }

    const response = NextResponse.redirect(`${origin}${sanitizedNext}`)
    response.cookies.set(SESSION_COOKIE_NAME, String(Date.now()), {
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
