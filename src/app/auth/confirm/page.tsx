'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

/**
 * Client-side magic link confirmation page.
 *
 * Email links point to app.exitosx.com/auth/confirm to avoid Gmail spam filters
 * (domain mismatch between sender and link). This page runs in the browser
 * (link scanners don't execute JS) and redirects to Supabase's own /auth/v1/verify
 * endpoint which handles all token types (including PKCE). Supabase then redirects
 * to /auth/callback with a session code.
 */

function ConfirmContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') ?? 'magiclink'
    const next = searchParams.get('next') ?? '/activate'

    // Sanitize redirect
    const sanitizedNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://'))
      ? next
      : '/activate'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      setError('Configuration error. Please contact support.')
      return
    }

    // Build the callback URL that Supabase will redirect to after verification
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`

    if (token) {
      // New flow: redirect to Supabase's verify endpoint with the raw token.
      // Supabase handles verification (including PKCE) and redirects to our callback.
      const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(callbackUrl)}`
      window.location.href = verifyUrl
      return
    }

    if (tokenHash) {
      // Legacy flow: redirect to Supabase's verify endpoint with token_hash
      const verifyUrl = `${supabaseUrl}/auth/v1/verify?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(callbackUrl)}`
      window.location.href = verifyUrl
      return
    }

    // No token provided
    setError('Invalid confirmation link.')
  }, [searchParams])

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
