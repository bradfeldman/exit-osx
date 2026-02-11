'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { setPasswordForMagicLink } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

// Password requirement checks
function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      )}
      <span className={met ? 'text-green-700' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  )
}

export default function ActivatePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [hasValidSession, setHasValidSession] = useState(false)

  // Check for valid magic-link session on mount
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Your activation link has expired or is invalid. Please request a new one.')
        setHasValidSession(false)
      } else {
        setEmail(user.email || null)
        setHasValidSession(true)
      }
      setChecking(false)
    }

    checkSession()
  }, [])

  const passwordChecks = getPasswordChecks(password)
  const allChecksPassed = Object.values(passwordChecks).every(Boolean)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setWarning(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!allChecksPassed) {
      setError('Please meet all password requirements.')
      return
    }

    setLoading(true)

    try {
      const result = await setPasswordForMagicLink(password)

      if (!result.success) {
        setError(result.error || 'Failed to set password. Please try again.')
        return
      }

      if (result.passwordWarning) {
        setWarning(result.passwordWarning)
      }

      // Redirect to onboarding (company setup is deferred to onboarding)
      router.push('/onboarding')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while verifying session
  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <a href="https://exitosx.com" className="flex items-center gap-3">
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
          </a>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold font-display leading-tight tracking-tight">
              You&apos;re Almost There
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Set a password to secure your account, then discover your exit readiness score in minutes.
            </p>
            <div className="space-y-4 pt-4">
              {[
                'Real-time business valuation',
                'Buyer Readiness Score across 6 dimensions',
                'Prioritized value-building playbook'
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
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

      {/* Right side - Activation Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <a href="https://exitosx.com" className="inline-flex items-center gap-2">
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
            </a>
          </div>

          {!hasValidSession ? (
            // Invalid/expired session state
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Link Expired</h2>
                <p className="mt-2 text-muted-foreground">
                  This activation link is invalid or has expired. Please sign up again to receive a new link.
                </p>
              </div>
              <Button
                onClick={() => router.push('/signup')}
                className="w-full h-12"
              >
                Back to Sign Up
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">
                  Set your password
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Create a password to secure your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                {warning && (
                  <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Security Recommendation</p>
                      <p className="mt-1 text-amber-600">{warning}</p>
                    </div>
                  </div>
                )}

                {/* Email field - locked/disabled */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email || ''}
                    disabled
                    className="h-12 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Verified via your signup link.
                  </p>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Create password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
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

                  {/* Password requirements - visible while typing */}
                  {password.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <PasswordRequirement met={passwordChecks.length} label="At least 8 characters" />
                      <PasswordRequirement met={passwordChecks.uppercase} label="One uppercase letter" />
                      <PasswordRequirement met={passwordChecks.lowercase} label="One lowercase letter" />
                      <PasswordRequirement met={passwordChecks.number} label="One number" />
                    </div>
                  )}
                </div>

                {/* Confirm password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-12"
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-500">Passwords do not match.</p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-green-600">Passwords match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loading || !allChecksPassed || !passwordsMatch}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up your account...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </form>

              {/* Trust microcopy */}
              <div className="text-center space-y-1 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Your data is encrypted and never shared. Free plan, no credit card required.
                </p>
              </div>
            </>
          )}
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
