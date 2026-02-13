'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
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
 * without any redirect chain.
 *
 * IMPORTANT: 'magiclink' type is deprecated in Supabase verifyOtp().
 * We now use 'email' type instead. The URL param type=email is set by the
 * server action that generates the magic link.
 *
 * Anti-prefetch: Email security scanners can pre-fetch links and consume OTP
 * tokens before the real user clicks. We require a user-initiated click to
 * verify, preventing automated scanners from consuming the token.
 */

function ConfirmContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'ready' | 'verifying' | 'expired' | 'error'>('ready')

  const tokenHash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  // Default to 'email' — 'magiclink' and 'signup' are deprecated in verifyOtp()
  const rawType = searchParams.get('type') ?? 'email'
  // Map deprecated types to 'email'
  const type = (rawType === 'magiclink' || rawType === 'signup') ? 'email' : rawType
  const next = searchParams.get('next') ?? '/activate'

  const hasToken = !!(token || tokenHash)

  // Sanitize redirect
  const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
    ? next
    : '/activate'

  const verify = useCallback(async () => {
    if (!hasToken) return
    setStatus('verifying')

    const supabase = createClient()

    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email' | 'recovery' | 'invite' | 'email_change',
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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        setStatus('error')
        return
      }

      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`
      const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(callbackUrl)}`
      window.location.href = verifyUrl
    }
  }, [hasToken, tokenHash, token, type, sanitizedNext])

  // Auto-verify if user interacted (clicked from email = page is fresh)
  // We use a brief delay so the page renders the "confirm" button first,
  // but for a human user the experience is near-instant.
  useEffect(() => {
    if (!hasToken || status !== 'ready') return

    // Check if this is likely a real user click (not a prefetch).
    // navigator.userActivation is available in modern browsers and tells
    // us if the page load was triggered by a user gesture (clicking a link).
    // If supported and active, auto-verify immediately.
    if (typeof navigator !== 'undefined' && 'userActivation' in navigator) {
      const activation = (navigator as { userActivation: { isActive: boolean } }).userActivation
      if (activation.isActive) {
        verify()
        return
      }
    }

    // For browsers without userActivation, or if it's not active (prefetch),
    // wait for the user to click the button. Don't auto-verify.
  }, [hasToken, status, verify])

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

  if (status === 'verifying') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Confirming your account...</p>
        </div>
      </div>
    )
  }

  // status === 'ready' — show confirm button (anti-prefetch protection)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Confirm your account</h1>
          <p className="text-sm text-muted-foreground">Click below to complete your sign-in.</p>
        </div>
        <button
          onClick={verify}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Confirm &amp; Continue
        </button>
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
