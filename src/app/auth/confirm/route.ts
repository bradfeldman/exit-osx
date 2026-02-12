import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/security/constants'

/**
 * Handles magic link verification via our own domain.
 *
 * Instead of linking to Supabase's /auth/v1/verify (which causes domain
 * mismatch with our sender email and triggers Gmail spam filters), we
 * route through this endpoint. It verifies the token server-side using
 * Supabase's verifyOtp, establishes the session, and redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'signup' | 'email'
  const next = searchParams.get('next') ?? '/activate'

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    console.error('[Auth Confirm] verifyOtp failed:', error.message)
    const isExpired = error.message?.includes('expired') || error.message?.includes('invalid')
    return NextResponse.redirect(
      `${origin}/login?error=${isExpired ? 'link_expired' : 'auth_error'}`
    )
  }

  // Sanitize redirect to prevent open redirects
  const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
    ? next
    : '/activate'

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
