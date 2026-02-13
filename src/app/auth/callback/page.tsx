'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completeAuthCallback } from '@/app/actions/auth'

/**
 * Auth callback page — handles the redirect from Supabase after email verification.
 *
 * This is a CLIENT-SIDE page (not a route handler) because:
 * - Supabase's implicit flow returns tokens in URL hash fragments (#access_token=...)
 * - Server-side route handlers NEVER see hash fragments (browsers don't send them)
 * - A client-side page can read both query params (?code=...) and hash fragments
 *
 * Handles two flows:
 * 1. PKCE flow: Supabase sends ?code=CODE → exchangeCodeForSession()
 * 2. Implicit flow: Supabase sends #access_token=...&refresh_token=... → setSession()
 */

function CallbackContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'
    const errorCode = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Sanitize redirect
    const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
      ? next
      : '/dashboard'

    // Handle Supabase error redirects (e.g. expired OTP links)
    if (errorCode) {
      const isExpired = errorCode === 'access_denied' &&
        (errorDescription?.includes('expired') || errorDescription?.includes('OTP'))
      window.location.href = isExpired ? '/login?error=link_expired' : '/login?error=auth_error'
      return
    }

    async function handleAuth() {
      const supabase = createClient()

      // Flow 1: PKCE code exchange (from password signup email confirmation)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          await completeAuthCallback()
          window.location.href = sanitizedNext
          return
        }
        console.error('[Auth Callback] Code exchange failed:', error.message)
        // Fall through to check hash fragment as fallback
      }

      // Flow 2: Implicit flow — tokens in hash fragment
      // This handles the case where Supabase couldn't use PKCE (no code_verifier)
      // and returned tokens directly in the URL hash.
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            await completeAuthCallback()
            window.location.href = sanitizedNext
            return
          }
          console.error('[Auth Callback] setSession failed:', error.message)
        }
      }

      // Neither flow succeeded
      setError('auth_error')
    }

    handleAuth()
  }, [searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-destructive font-medium">Authentication failed. Please try again.</p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
