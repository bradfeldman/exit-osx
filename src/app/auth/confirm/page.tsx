'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completeAuthCallback, handleEmailVerification } from '@/app/actions/auth'

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

const screenStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--background)',
  padding: '0 16px',
}

const innerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '448px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
}

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
        await handleEmailVerification()
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
      <div style={screenStyle}>
        <div style={innerStyle}>
          <p style={{ fontWeight: 500, color: 'var(--destructive)', margin: 0 }}>
            Invalid confirmation link.
          </p>
          <Link href="/login" style={{ fontSize: '14px', color: 'var(--primary)', textDecoration: 'none' }}>
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div style={screenStyle}>
        <div style={innerStyle}>
          <p style={{ fontWeight: 500, color: 'var(--destructive)', margin: 0 }}>
            This verification link has expired.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: 0 }}>
            Your account is still active. You can log in with your email and password.
          </p>
          <Link href="/login" style={{ fontSize: '14px', color: 'var(--primary)', textDecoration: 'none' }}>
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={screenStyle}>
        <div style={innerStyle}>
          <p style={{ fontWeight: 500, color: 'var(--destructive)', margin: 0 }}>
            This verification link is no longer valid.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: 0 }}>
            Your account is still active. You can log in with your email and password.
          </p>
          <Link href="/login" style={{ fontSize: '14px', color: 'var(--primary)', textDecoration: 'none' }}>
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={screenStyle}>
      <div style={innerStyle}>
        <Loader2 style={{ width: 32, height: 32, color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: 0 }}>
          Verifying your email...
        </p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div style={screenStyle}>
          <div style={innerStyle}>
            <Loader2 style={{ width: 32, height: 32, color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: 0 }}>
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
