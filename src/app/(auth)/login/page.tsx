'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, resetCaptcha } from '@/components/ui/captcha'
import { Eye, EyeOff, Shield as ShieldIcon } from 'lucide-react'
import { secureLogin } from '@/app/actions/auth'

export default function LoginPage() {
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

      router.push('/dashboard')
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
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.webp"
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
            <h1 className="text-4xl font-bold leading-tight">
              Build a Business<br />Buyers Want to Own
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Get your valuation estimate, Buyer Readiness Score, and a personalized roadmap to maximize your exit outcome.
            </p>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span>Real-time business valuation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span>Buyer Readiness Score across 6 dimensions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span>Prioritized value-building playbook</span>
              </div>
            </div>
          </div>

          <p className="text-sm opacity-70">
            A Pasadena Private product
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/logo.webp"
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
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to continue to your dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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
                    required
                    disabled={loading || isLocked}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading || isLocked}
                      className="h-12 pr-12"
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
            >
              {loading ? 'Signing in...' : requiresTwoFactor ? 'Verify' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create one for free
              </Link>
            </p>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">
              &larr; Back to home
            </Link>
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
