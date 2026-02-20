'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { setPasswordForMagicLink } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import styles from '@/components/auth/auth-signup.module.css'

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
    <div className={`${styles.activateRequirement} ${met ? styles.activateRequirementMet : styles.activateRequirementUnmet}`}>
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-dark shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
      )}
      <span>{label}</span>
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
      <div className={styles.activateChecking}>
        <div className={styles.activateCheckingContent}>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className={styles.activateCheckingText}>Verifying your link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.activatePage}>
      {/* Left side - Branding */}
      <div className={styles.activateBranding}>
        <div className={styles.activateBrandingGradient} />
        {/* Decorative elements */}
        <div className={styles.activateBrandingOrb1} />
        <div className={styles.activateBrandingOrb2} />
        <div className={styles.activateBrandingContent}>
          <a href="https://exitosx.com" className={styles.activateBrandingLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="Exit OSx"
              width={40}
              height={40}
              className={styles.activateBrandingLogoImg}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wordmark.svg"
              alt="Exit OSx"
              width={120}
              height={34}
              className={styles.activateBrandingWordmark}
            />
          </a>

          <div className={styles.activateBrandingBody}>
            <h1 className={styles.activateBrandingTitle}>
              You&apos;re Almost There
            </h1>
            <p className={styles.activateBrandingTagline}>
              Set a password to secure your account, then discover your exit readiness score in minutes.
            </p>
            <div className={styles.activateBrandingFeatures}>
              {[
                'Real-time business valuation',
                'Buyer Readiness Index across 6 dimensions',
                'Prioritized value-building playbook'
              ].map((text) => (
                <div key={text} className={styles.activateBrandingFeature}>
                  <div className={styles.activateBrandingFeatureIcon}>
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
      <div className={styles.activateFormPanel}>
        <div className={styles.activateFormContent}>
          {/* Mobile logo */}
          <div className={styles.activateMobileLogo}>
            <a href="https://exitosx.com" className={styles.activateMobileLogoLink}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-icon.png"
                alt="Exit OSx"
                width={32}
                height={32}
                className={styles.activateMobileLogoImg}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className={styles.activateMobileWordmark}
              />
            </a>
          </div>

          {!hasValidSession ? (
            // Invalid/expired session state
            <div className={styles.activateError}>
              <div className={styles.activateErrorIconWrap}>
                <AlertTriangle className="w-8 h-8 text-orange-dark" />
              </div>
              <div>
                <h2 className={styles.activateErrorTitle}>Link Expired</h2>
                <p className={styles.activateErrorText}>
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
              <div className={styles.activateFormHeader}>
                <h2 className={styles.activateFormTitle}>
                  Set your password
                </h2>
                <p className={styles.activateFormSubtitle}>
                  Create a password to secure your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.activateForm}>
                {error && (
                  <div className={styles.activateAlertError}>
                    {error}
                  </div>
                )}

                {warning && (
                  <div className={styles.activateAlertWarning}>
                    <AlertTriangle className={`h-5 w-5 ${styles.activateAlertWarningIcon}`} />
                    <div className={styles.activateAlertWarningBody}>
                      <p className={styles.activateAlertWarningTitle}>Security Recommendation</p>
                      <p className={styles.activateAlertWarningText}>{warning}</p>
                    </div>
                  </div>
                )}

                {/* Email field - locked/disabled */}
                <div className={styles.activateField}>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email || ''}
                    disabled
                    className="h-12 bg-muted"
                  />
                  <p className={styles.activateFieldHint}>
                    Verified via your signup link.
                  </p>
                </div>

                {/* Password field */}
                <div className={styles.activateField}>
                  <Label htmlFor="password">Create password</Label>
                  <div className={styles.activatePasswordWrap}>
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
                      className={styles.activatePasswordToggle}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Password requirements - visible while typing */}
                  {password.length > 0 && (
                    <div className={styles.activateRequirements}>
                      <PasswordRequirement met={passwordChecks.length} label="At least 8 characters" />
                      <PasswordRequirement met={passwordChecks.uppercase} label="One uppercase letter" />
                      <PasswordRequirement met={passwordChecks.lowercase} label="One lowercase letter" />
                      <PasswordRequirement met={passwordChecks.number} label="One number" />
                    </div>
                  )}
                </div>

                {/* Confirm password field */}
                <div className={styles.activateField}>
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
                    <p className={styles.activateMatchError}>Passwords do not match.</p>
                  )}
                  {passwordsMatch && (
                    <p className={styles.activateMatchSuccess}>Passwords match.</p>
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
              <div className={styles.activateTrustFooter}>
                <p className={styles.activateTrustFooterText}>
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
