'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

/**
 * Client-side magic link confirmation page.
 *
 * Email links point to app.exitosx.com/auth/confirm (our domain) to avoid
 * domain mismatch that triggers Gmail spam filters. The actual OTP verification
 * happens client-side via JavaScript so that email link scanners (which only
 * make GET requests and don't execute JS) cannot consume the token before
 * the real user clicks it.
 */

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'magiclink' | 'signup' | 'email' | null
    const next = searchParams.get('next') ?? '/activate'

    if (!tokenHash || !type) {
      router.replace('/login?error=auth_error')
      return
    }

    // Sanitize redirect
    const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
      ? next
      : '/activate'

    async function verify() {
      const supabase = createClient()

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type!,
      })

      if (verifyError) {
        console.error('[Auth Confirm] verifyOtp failed:', verifyError.message)
        const isExpired = verifyError.message?.includes('expired') || verifyError.message?.includes('invalid')
        if (isExpired) {
          router.replace('/login?error=link_expired')
        } else {
          setError(verifyError.message || 'Verification failed')
        }
        return
      }

      // Success — session is now set in browser cookies by Supabase client.
      // Use full page navigation (not router.replace) so middleware runs
      // on a fresh document request and properly sets the activity cookie.
      window.location.href = sanitizedNext
    }

    verify()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-destructive font-medium">{error}</p>
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
