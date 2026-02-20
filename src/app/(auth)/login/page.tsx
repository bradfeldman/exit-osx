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
import styles from '@/components/auth/auth.module.css'

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
  const [_isHydrated, setIsHydrated] = useState(false)

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

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    const baseUrl = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
      },
    })
  }

  return (
    <div className={styles.authPage}>
      {/* Left side - Branding */}
      <div className={styles.authBrandPanel}>
        <div className={styles.authBrandOverlay} />
        <div className={styles.authBrandBlobTop} />
        <div className={styles.authBrandBlobBottom} />
        <div className={styles.authBrandContent}>
          <a href="https://exitosx.com" className={styles.authBrandLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="Exit OSx" width={40} height={40} className={styles.authBrandLogoIcon} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wordmark.svg" alt="Exit OSx" width={120} height={34} className={styles.authBrandLogoWordmark} />
          </a>

          <div className={styles.authBrandBody}>
            <h1 className={styles.authBrandHeadline}>
              Build a Business<br />Buyers Want to Own
            </h1>
            <p className={styles.authBrandSubtitle}>
              Get your valuation estimate, Buyer Readiness Index, and a personalized roadmap to maximize your exit outcome.
            </p>
            <div className={styles.authBrandFeatures}>
              {[
                'Real-time business valuation',
                'Buyer Readiness Index across 6 dimensions',
                'Prioritized value-building playbook'
              ].map((text) => (
                <div key={text} className={styles.authBrandFeatureItem}>
                  <div className={styles.authBrandFeatureCheck}>
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
      <div className={styles.authFormPanel}>
        <div className={styles.authFormInner}>
          {/* Mobile logo */}
          <div className={styles.authMobileLogo}>
            <a href="https://exitosx.com" className={styles.authMobileLogoLink}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="Exit OSx" width={32} height={32} className={styles.authMobileLogoIcon} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wordmark.svg" alt="Exit OSx" width={100} height={28} className={styles.authMobileLogoWordmark} />
            </a>
          </div>

          <div className={styles.authCardHeader}>
            <h2 className={styles.authTitle}>
              {isFromInvite ? 'Sign in to accept your invite' : 'Welcome back'}
            </h2>
            <p className={styles.authSubtitle}>
              {isFromInvite
                ? 'Log in to your account to join the team'
                : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          {isTimeout && (
            <div className={styles.authAlertWarning}>
              <Clock className="h-5 w-5" />
              <p>You were signed out due to inactivity. Please sign in again.</p>
            </div>
          )}

          {isExpiredLink && (
            <div className={styles.authAlertExpired}>
              <div className={styles.authAlertExpiredRow}>
                <Clock className="h-5 w-5" />
                <p>Your confirmation link has expired. Enter your email below and resend it.</p>
              </div>
              {resendStatus === 'sent' ? (
                <p className={styles.authResendSuccess}>New confirmation email sent! Check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={!email || resendStatus === 'sending'}
                  className={styles.authResendButton}
                >
                  {resendStatus === 'sending' ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}
              {resendStatus === 'error' && (
                <p className={styles.authResendError}>Failed to resend. Try signing up again.</p>
              )}
            </div>
          )}

          {authError && !isExpiredLink && (
            <div className={styles.authAlertError}>
              <p>{authError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.authForm}>
            {/* Error message container */}
            {(error || getLockoutMessage()) && (
              <div className={styles.authError}>
                <p className={styles.authErrorMain}>{getLockoutMessage() || error}</p>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className={styles.authErrorSub}>
                    {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining before account lockout
                  </p>
                )}
              </div>
            )}

            {!requiresTwoFactor ? (
              <>
                <div className={styles.authField}>
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

                <div className={styles.authField}>
                  <div className={styles.authFieldLabelRow}>
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className={styles.authLinkPrimary} style={{ fontSize: '14px' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className={styles.authPasswordWrapper}>
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
                      className={styles.authPasswordToggle}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {showCaptcha && (
                  <div className={styles.authCaptcha}>
                    <Captcha
                      onVerify={handleCaptchaVerify}
                      onExpire={handleCaptchaExpire}
                      onError={(err) => setError(err)}
                    />
                    {!captchaToken && (
                      <p className={styles.authCaptchaHint}>
                        Please complete the verification above
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.authTwoFactor}>
                <div className={styles.authTwoFactorHeader}>
                  <div className={styles.authTwoFactorIcon}>
                    <ShieldIcon className="w-6 h-6" />
                  </div>
                  <p className={styles.authTwoFactorHint}>
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className={styles.authField}>
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
                  <p className={styles.authFieldHint} style={{ textAlign: 'center' }}>
                    You can also use a backup code (format: XXXX-XXXX)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBackFromTwoFactor}
                  className={styles.authBackButton}
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

          {/* OR divider + Google */}
          <div className={styles.authSocial}>
            <div className={styles.authDivider}>
              <div className={styles.authDividerLine} />
              <span className={styles.authDividerLabel}>OR</span>
              <div className={styles.authDividerLine} />
            </div>
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-base font-medium"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className={styles.authFooter}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/assess" className={styles.authLinkPrimary}>
                Create one for free
              </Link>
            </p>
            <a href="https://exitosx.com" className={styles.authLink}>
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
