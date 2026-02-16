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
 * without any redirect chain.
 *
 * IMPORTANT: 'magiclink' type is deprecated in Supabase verifyOtp().
 * We now use 'email' type instead. The URL param type=email is set by the
 * server action that generates the magic link.
 */

function ConfirmContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'expired' | 'error'>('loading')

  const tokenHash = searchParams.get('token_hash')
  const token = searchParams.get('token')
  // Default to 'email' — 'magiclink' and 'signup' are deprecated in verifyOtp()
  const rawType = searchParams.get('type') ?? 'email'
  // Map deprecated types to 'email'
  const type = (rawType === 'magiclink' || rawType === 'signup') ? 'email' : rawType
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

        await completeAuthCallback()
        window.location.href = sanitizedNext
        return
      }

      if (token) {
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
          <p className="text-destructive font-medium">This verification link has expired.</p>
          <p className="text-sm text-muted-foreground">Your account is still active. You can log in with your email and password.</p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-destructive font-medium">This verification link is no longer valid.</p>
          <p className="text-sm text-muted-foreground">Your account is still active. You can log in with your email and password.</p>
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
        <p className="text-muted-foreground">Verifying your email...</p>
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
