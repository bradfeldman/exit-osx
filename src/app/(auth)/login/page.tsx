'use client'

import { useState, useCallback, Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, resetCaptcha } from '@/components/ui/captcha'
import { Eye, EyeOff, Shield as ShieldIcon, Clock } from 'lucide-react'
import { secureLogin } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { getRedirectUrl, buildUrlWithRedirect, isInviteRedirect } from '@/lib/utils/redirect'
import { analytics } from '@/lib/analytics'
import { useFormTracking } from '@/lib/analytics/hooks'

// Tiny component that reads search params inside its own Suspense boundary.
// This isolates the BAILOUT_TO_CLIENT_SIDE_RENDERING so the rest of the
// login form can be server-rendered as real HTML.
function SearchParamsReader({ onChange }: {
  onChange: (data: { redirectUrl: string; isFromInvite: boolean; isTimeout: boolean; isExpiredLink: boolean; authError: string | null }) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirectUrl = getRedirectUrl(searchParams)
    const errorParam = searchParams.get('error')
    onChange({
      redirectUrl,
      isFromInvite: isInviteRedirect(redirectUrl),
      isTimeout: searchParams.get('reason') === 'timeout',
      isExpiredLink: errorParam === 'link_expired',
      authError: errorParam === 'auth_error' ? 'Authentication failed. Please try again.' : null,
    })
  }, [searchParams, onChange])

  return null
}

export default function LoginPage() {
  // Search params data — starts with defaults, updated once JS hydrates
  // Use useRef to prevent layout shift on first render
  const [redirectUrl, setRedirectUrl] = useState('/dashboard')
  const [isFromInvite, setIsFromInvite] = useState(false)
  const [isTimeout, setIsTimeout] = useState(false)
  const [isExpiredLink, setIsExpiredLink] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  const handleSearchParams = useCallback((data: { redirectUrl: string; isFromInvite: boolean; isTimeout: boolean; isExpiredLink: boolean; authError: string | null }) => {
    // Batch state updates to prevent multiple re-renders
    setRedirectUrl(data.redirectUrl)
    setIsFromInvite(data.isFromInvite)
    setIsTimeout(data.isTimeout)
    setIsExpiredLink(data.isExpiredLink)
    setAuthError(data.authError)
    setIsHydrated(true)
  }, [])

  return (
    <>
      {/* Search params reader in its own Suspense — bails out alone */}
      <Suspense fallback={null}>
        <SearchParamsReader onChange={handleSearchParams} />
      </Suspense>
      <LoginPageContent
        redirectUrl={redirectUrl}
        isFromInvite={isFromInvite}
        isTimeout={isTimeout}
        isExpiredLink={isExpiredLink}
        authError={authError}
      />
    </>
  )
}

interface LoginPageContentProps {
  redirectUrl: string
  isFromInvite: boolean
  isTimeout: boolean
  isExpiredLink: boolean
  authError: string | null
}

function LoginPageContent({ redirectUrl, isFromInvite, isTimeout, isExpiredLink, authError }: LoginPageContentProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Analytics: Page load time reference
  const pageLoadTime = useRef(Date.now())

  // Analytics: Form tracking
  const { handleFieldFocus, handleFieldBlur, markSubmitted } = useFormTracking({ formId: 'login' })

  // Analytics: Track page view on mount
  useEffect(() => {
    analytics.trackPageView('login', {
      entryPoint: document.referrer || 'direct',
      isFromInvite,
    })
  }, [isFromInvite])

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null)
  }, [])

  const handleResendVerification = async () => {
    if (!email) return
    setResendStatus('sending')
    try {
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (resendError) {
        setResendStatus('error')
      } else {
        setResendStatus('sent')
      }
    } catch {
      setResendStatus('error')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent form from jumping by scrolling to top if needed
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Batch state updates to prevent layout shift
    setError(null)
    setAttemptsRemaining(null)
    setLoading(true)

    // Mark form as submitted for analytics
    markSubmitted()

    try {
      const result = await secureLogin(
        email,
        password,
        captchaToken || undefined,
        requiresTwoFactor ? twoFactorCode : undefined
      )

      if (!result.success) {
        // Handle 2FA requirement
        if (result.requiresTwoFactor) {
          setRequiresTwoFactor(true)
          if (result.error) {
            setError(result.error)
          }
          setTwoFactorCode('')
          return
        }

        // Track failed login attempt
        analytics.track('form_field_error', {
          formId: 'login',
          fieldName: 'form',
          errorType: result.lockedUntilMs ? 'account_locked' : 'auth_failure',
          errorMessage: result.error || 'Invalid credentials',
        })

        setError(result.error || 'Invalid email or password')
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining)
        }
        if (result.lockedUntilMs) {
          setLockedUntil(Date.now() + result.lockedUntilMs)
        }
        if (result.requiresCaptcha) {
          setShowCaptcha(true)
          setCaptchaToken(null)
          resetCaptcha()
        }
        return
      }

      // Track successful login
      analytics.track('login_success', {
        success: true,
        timeToSubmit: Date.now() - pageLoadTime.current,
      })

      // Hard navigation ensures cookies are fully propagated before
      // the dashboard loads (prevents race with session cookie propagation)
      window.location.href = redirectUrl
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBackFromTwoFactor = () => {
    setRequiresTwoFactor(false)
    setTwoFactorCode('')
    setPassword('')
    setError(null)
  }

  // Format lockout time remaining
  const getLockoutMessage = () => {
    if (!lockedUntil) return null
    const remaining = lockedUntil - Date.now()
    if (remaining <= 0) {
      setLockedUntil(null)
      return null
    }
    const minutes = Math.ceil(remaining / 60000)
    return `Account locked. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
  }

  const isLocked = !!lockedUntil && lockedUntil > Date.now()

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col p-12 text-primary-foreground">
          <a href="https://exitosx.com" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="Exit OSx" width={40} height={40} className="h-10 w-10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wordmark.svg" alt="Exit OSx" width={120} height={34} className="h-8 w-auto brightness-0 invert" />
          </a>

          <div className="space-y-6 mt-auto mb-auto">
            <h1 className="text-4xl font-bold font-display leading-tight tracking-tight">
              Build a Business<br />Buyers Want to Own
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Get your valuation estimate, Buyer Readiness Score, and a personalized roadmap to maximize your exit outcome.
            </p>
            <div className="space-y-4 pt-4">
              {[
                'Real-time business valuation',
                'Buyer Readiness Score across 6 dimensions',
                'Prioritized value-building playbook'
              ].map((text) => (
                <div
                  key={text}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background min-h-[100dvh] lg:min-h-0">
        <div className="w-full max-w-md space-y-8 py-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <a href="https://exitosx.com" className="inline-flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="Exit OSx" width={32} height={32} className="h-8 w-8" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wordmark.svg" alt="Exit OSx" width={100} height={28} className="h-6 w-auto" />
            </a>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">
              {isFromInvite ? 'Sign in to accept your invite' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isFromInvite
                ? 'Log in to your account to join the team'
                : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          {isTimeout && (
            <div className="flex items-center gap-3 p-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p>You were signed out due to inactivity. Please sign in again.</p>
            </div>
          )}

          {isExpiredLink && (
            <div className="p-4 text-sm bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center gap-3 text-amber-800">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <p>Your confirmation link has expired. Enter your email below and resend it.</p>
              </div>
              {resendStatus === 'sent' ? (
                <p className="text-sm text-emerald-700 font-medium">New confirmation email sent! Check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={!email || resendStatus === 'sending'}
                  className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {resendStatus === 'sending' ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}
              {resendStatus === 'error' && (
                <p className="text-sm text-destructive">Failed to resend. Try signing up again.</p>
              )}
            </div>
          )}

          {authError && !isExpiredLink && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg">
              <p>{authError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error message container with fixed min-height to prevent layout shift */}
            <div className="min-h-[4rem]">
              {(error || getLockoutMessage()) && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg space-y-1">
                  <p>{getLockoutMessage() || error}</p>
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <p className="text-xs text-red-500">
                      {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining before account lockout
                    </p>
                  )}
                </div>
              )}
            </div>

            {!requiresTwoFactor ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => handleFieldFocus('email')}
                    onBlur={() => handleFieldBlur('email')}
                    required
                    disabled={loading || isLocked}
                    autoComplete="email"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => handleFieldFocus('password')}
                      onBlur={() => handleFieldBlur('password')}
                      required
                      disabled={loading || isLocked}
                      autoComplete="current-password"
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors -m-2 p-2 rounded-md"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {showCaptcha && (
                  <div className="space-y-2">
                    <Captcha
                      onVerify={handleCaptchaVerify}
                      onExpire={handleCaptchaExpire}
                      onError={(err) => setError(err)}
                    />
                    {!captchaToken && (
                      <p className="text-xs text-muted-foreground text-center">
                        Please complete the verification above
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <ShieldIcon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">Verification code</Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9-]/g, ''))}
                    required
                    disabled={loading}
                    autoComplete="one-time-code"
                    className="h-12 text-center text-lg tracking-widest font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    You can also use a backup code (format: XXXX-XXXX)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBackFromTwoFactor}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  &larr; Back to login
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || isLocked || (showCaptcha && !captchaToken) || (requiresTwoFactor && twoFactorCode.length < 6)}
              animated={false}
            >
              {loading ? 'Signing in...' : requiresTwoFactor ? 'Verify' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={buildUrlWithRedirect('/signup', redirectUrl)} className="font-medium text-primary hover:underline">
                Create one for free
              </Link>
            </p>
            <a href="https://exitosx.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">
              &larr; Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
