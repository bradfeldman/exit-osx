'use client'

import { useState, useCallback, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, resetCaptcha } from '@/components/ui/captcha'
import { Eye, EyeOff, Shield as ShieldIcon, Loader2 } from 'lucide-react'
import { secureLogin } from '@/app/actions/auth'
import { getRedirectUrl, buildUrlWithRedirect, isInviteRedirect } from '@/lib/utils/redirect'
import { analytics } from '@/lib/analytics'
import { useFormTracking } from '@/lib/analytics/hooks'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const redirectUrl = getRedirectUrl(searchParams)
  const isFromInvite = isInviteRedirect(redirectUrl)
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
  const router = useRouter()

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
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
      analytics.track('signup_submit', {
        success: true,
        timeToSubmit: Date.now() - pageLoadTime.current,
      })

      router.push(redirectUrl)
      router.refresh()
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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <motion.div
          className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="Exit OSx"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <Image
              src="/wordmark.svg"
              alt="Exit OSx"
              width={120}
              height={34}
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold font-display leading-tight tracking-tight">
              Build a Business<br />Buyers Want to Own
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Get your valuation estimate, Buyer Readiness Score, and a personalized roadmap to maximize your exit outcome.
            </p>
            <motion.div
              className="space-y-4 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {[
                'Real-time business valuation',
                'Buyer Readiness Score across 6 dimensions',
                'Prioritized value-building playbook'
              ].map((text, i) => (
                <motion.div
                  key={text}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                  <span>{text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <p className="text-sm opacity-70">
            A Pasadena Private Financial Group Company
          </p>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <motion.div
          className="w-full max-w-md space-y-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo */}
          <motion.div variants={fadeInUp} className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/logo-icon.png"
                alt="Exit OSx"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <Image
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className="h-6 w-auto"
              />
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp} className="text-center">
            <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">
              {isFromInvite ? 'Sign in to accept your invite' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isFromInvite
                ? 'Log in to your account to join the team'
                : 'Sign in to continue to your dashboard'}
            </p>
          </motion.div>

          <motion.form variants={fadeInUp} onSubmit={handleLogin} className="space-y-6">
            {(error || getLockoutMessage()) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg space-y-1"
              >
                <p>{getLockoutMessage() || error}</p>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="text-xs text-red-500">
                    {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining before account lockout
                  </p>
                )}
              </motion.div>
            )}

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
                    className="h-12 transition-all duration-200 focus:scale-[1.01]"
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
                      className="h-12 pr-12 transition-all duration-200 focus:scale-[1.01]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
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
                    className="h-12 text-center text-lg tracking-widest font-mono transition-all duration-200 focus:scale-[1.01]"
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
              className="w-full h-12 text-base transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
              disabled={loading || isLocked || (showCaptcha && !captchaToken) || (requiresTwoFactor && twoFactorCode.length < 6)}
            >
              {loading ? 'Signing in...' : requiresTwoFactor ? 'Verify' : 'Sign In'}
            </Button>
          </motion.form>

          <motion.div variants={fadeInUp} className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={buildUrlWithRedirect('/signup', redirectUrl)} className="font-medium text-primary hover:underline">
                Create one for free
              </Link>
            </p>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">
              &larr; Back to home
            </Link>
          </motion.div>
        </motion.div>
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
