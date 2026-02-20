'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/components/auth/auth.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Get the base URL for the redirect
      const baseUrl = window.location.origin

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      {/* Left side - Branding */}
      <div className={styles.authBrandPanel}>
        <div className={styles.authBrandOverlay} />
        <div className={styles.authBrandContent}>
          <a href="https://exitosx.com" className={styles.authBrandLogo}>
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
          </a>

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

          {!success ? (
            <>
              <div className={styles.authCardHeader}>
                <h2 className={styles.authTitle}>Reset your password</h2>
                <p className={styles.authSubtitle}>
                  Enter your email and we&apos;ll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.authForm}>
                {error && (
                  <div className={styles.authError}>
                    <p className={styles.authErrorMain}>{error}</p>
                  </div>
                )}

                <div className={styles.authField}>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className={styles.authSuccess}>
              <div className={`${styles.authSuccessIcon} ${styles.authSuccessIconGreen}`}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className={styles.authSuccessBody}>
                <h2 className={styles.authSuccessTitle}>Check your email</h2>
                <p className={styles.authSuccessText}>
                  We&apos;ve sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
              <p className={styles.authSuccessNote}>
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className={styles.authLinkButton}
                >
                  try again
                </button>
              </p>
            </div>
          )}

          <div className={styles.authFooter}>
            <Link
              href="/login"
              className={styles.authLinkInline}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
