'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/components/auth/auth.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()

      // Supabase automatically handles the token from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        setError('Invalid or expired reset link. Please request a new one.')
        setHasValidSession(false)
      } else {
        setHasValidSession(true)
      }
      setChecking(false)
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking session
  if (checking) {
    return (
      <div className={styles.authPageCentered}>
        <div className={styles.authPageCenteredInner}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p>Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.authPage}>
      {/* Left side - Branding */}
      <div className={styles.authBrandPanel}>
        <div className={styles.authBrandOverlay} />
        <div className={styles.authBrandContent}>
          <Link href="/" className={styles.authBrandLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="Exit OSx"
              width={40}
              height={40}
              className={styles.authBrandLogoIcon}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wordmark.svg"
              alt="Exit OSx"
              width={120}
              height={34}
              className={styles.authBrandLogoWordmark}
            />
          </Link>

          <div className={styles.authBrandBody}>
            <h1 className={styles.authBrandHeadline}>
              Build a Business<br />Buyers Want to Own
            </h1>
            <p className={styles.authBrandSubtitle}>
              Get your valuation estimate, Buyer Readiness Index, and a personalized roadmap to maximize your exit outcome.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className={styles.authFormPanel}>
        <div className={styles.authFormInner}>
          {/* Mobile logo */}
          <div className={styles.authMobileLogo}>
            <Link href="/" className={styles.authMobileLogoLink}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-icon.png"
                alt="Exit OSx"
                width={32}
                height={32}
                className={styles.authMobileLogoIcon}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className={styles.authMobileLogoWordmark}
              />
            </Link>
          </div>

          {!hasValidSession ? (
            // Invalid/expired link state
            <div className={styles.authSuccess}>
              <div className={`${styles.authSuccessIcon} ${styles.authSuccessIconAmber}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className={styles.authSuccessBody}>
                <h2 className={styles.authSuccessTitle}>Link Expired</h2>
                <p className={styles.authSuccessText}>
                  This password reset link is invalid or has expired.
                </p>
              </div>
              <Button asChild className="w-full h-12">
                <Link href="/forgot-password">Request New Link</Link>
              </Button>
              <Link href="/login" className={styles.authLink}>
                Back to sign in
              </Link>
            </div>
          ) : success ? (
            // Success state
            <div className={styles.authSuccess}>
              <div className={`${styles.authSuccessIcon} ${styles.authSuccessIconGreen}`}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className={styles.authSuccessBody}>
                <h2 className={styles.authSuccessTitle}>Password Updated</h2>
                <p className={styles.authSuccessText}>
                  Your password has been successfully reset. Redirecting you to your dashboard...
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : (
            // Password reset form
            <>
              <div className={styles.authCardHeader}>
                <h2 className={styles.authTitle}>Set new password</h2>
                <p className={styles.authSubtitle}>
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.authForm}>
                {error && (
                  <div className={styles.authError}>
                    <p className={styles.authErrorMain}>{error}</p>
                  </div>
                )}

                <div className={styles.authField}>
                  <Label htmlFor="password">New password</Label>
                  <div className={styles.authPasswordWrapper}>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 pr-12"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.authPasswordToggle}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className={styles.authFieldHint}>Must be at least 8 characters</p>
                </div>

                <div className={styles.authField}>
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
