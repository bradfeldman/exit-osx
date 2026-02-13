'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completeAuthCallback } from '@/app/actions/auth'

/**
 * Client-side magic link confirmation page.
 *
 * Email links point to app.exitosx.com/auth/confirm to avoid Gmail spam filters
 * (domain mismatch between sender and link). This page uses verifyOtp() to
 * verify the token directly with Supabase on the client, establishing a session
 * without any redirect chain. This avoids the implicit flow issue where Supabase
 * returns tokens in URL hash fragments that server-side routes can't read.
 */

function ConfirmContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'expired' | 'error'>('loading')

  const tokenHash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  const type = searchParams.get('type') ?? 'magiclink'
  const next = searchParams.get('next') ?? '/activate'

  const hasToken = !!(token || tokenHash)

  useEffect(() => {
    if (!hasToken) return

    // Sanitize redirect
    const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
      ? next
      : '/activate'

    async function verify() {
      const supabase = createClient()

      if (tokenHash) {
        // Preferred flow: verify the hashed token directly via Supabase client.
        // This POSTs to Supabase and returns session data in the response body,
        // avoiding the redirect-based implicit flow entirely.
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'magiclink' | 'signup' | 'email',
        })

        if (error) {
          console.error('[Auth Confirm] verifyOtp failed:', error.message)
          if (error.message?.includes('expired') || error.message?.includes('invalid')) {
            setStatus('expired')
          } else {
            setStatus('error')
          }
          return
        }

        // Session established — set activity cookie so middleware doesn't
        // treat this as a stale session on the next navigation
        await completeAuthCallback()
        window.location.href = sanitizedNext
        return
      }

      if (token) {
        // Legacy fallback: raw token from older email links.
        // Redirect to Supabase's verify endpoint which handles verification
        // and redirects to /auth/callback. The callback page handles both
        // PKCE (code in query) and implicit (tokens in hash) flows.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
          setStatus('error')
          return
        }

        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`
        const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(callbackUrl)}`
        window.location.href = verifyUrl
      }
    }

    verify()
  }, [token, tokenHash, type, next, hasToken])

  if (!hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-destructive font-medium">Invalid confirmation link.</p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-destructive font-medium">This link has expired.</p>
          <p className="text-sm text-muted-foreground">Please request a new signup link.</p>
          <Link href="/signup" className="text-sm text-primary hover:underline">
            Go to signup
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-destructive font-medium">Authentication failed. Please try again.</p>
          <Link href="/signup" className="text-sm text-primary hover:underline">
            Go to signup
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Confirming your account...</p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
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
      <ConfirmContent />
    </Suspense>
  )
}
