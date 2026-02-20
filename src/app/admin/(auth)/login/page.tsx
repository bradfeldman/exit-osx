'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Captcha, resetCaptcha } from '@/components/ui/captcha'
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react'
import { secureLogin } from '@/app/actions/auth'
import styles from '@/components/admin/admin-auth.module.css'

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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginLoading />}>
      <AdminLoginContent />
    </Suspense>
  )
}

function AdminLoginLoading() {
  return (
    <div className={styles.authPageLoading}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function AdminLoginContent() {
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || '/admin'
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

      router.push(nextUrl)
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
    <div className={styles.authPage}>
      {/* Left side - Admin Branding */}
      <div className={styles.brandPanel}>
        <div className={styles.brandOverlay} />
        <div className={styles.brandBlobTop} />
        <div className={styles.brandBlobBottom} />
        <motion.div
          className={styles.brandContent}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.brandLogo}>
            <Shield className="h-8 w-8 text-primary" />
            <span className={styles.brandLogoText}>Exit OSx Admin</span>
          </div>

          <div className={styles.brandBody}>
            <h1 className={styles.brandHeadline}>
              Administration<br />Portal
            </h1>
            <p className={styles.brandSubtitle}>
              Manage users, organizations, support tickets, and system configuration.
            </p>
            <div className={styles.brandBadge}>
              <Shield className="h-4 w-4" />
              <span>Super admin access required</span>
            </div>
          </div>

          <p className={styles.brandFooter}>
            Restricted Access - Authorized Personnel Only
          </p>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className={styles.formPanel}>
        <motion.div
          className={styles.formInner}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile header */}
          <motion.div variants={fadeInUp} className={styles.mobileLogo}>
            <Shield className="h-8 w-8 text-primary" />
            <span className={styles.mobileLogoText}>Exit OSx Admin</span>
          </motion.div>

          <motion.div variants={fadeInUp} className={styles.heading}>
            <h2 className={styles.title}>Admin Sign In</h2>
            <p className={styles.subtitle}>
              Enter your credentials to access the admin portal
            </p>
          </motion.div>

          <motion.form variants={fadeInUp} onSubmit={handleLogin} className={styles.form}>
            {(error || getLockoutMessage()) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.errorBanner}
              >
                <p className={styles.errorMain}>{getLockoutMessage() || error}</p>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className={styles.errorSub}>
                    {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining before account lockout
                  </p>
                )}
              </motion.div>
            )}

            {!requiresTwoFactor ? (
              <>
                <div className={styles.field}>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@exitosx.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading || isLocked}
                    autoComplete="email"
                    className="h-12"
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldLabelRow}>
                    <Label htmlFor="password">Password</Label>
                    <Link href="/admin/forgot-password" className={styles.forgotLink}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className={styles.passwordWrapper}>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading || isLocked}
                      autoComplete="current-password"
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.passwordToggle}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {showCaptcha && (
                  <div className={styles.captchaField}>
                    <Captcha
                      onVerify={handleCaptchaVerify}
                      onExpire={handleCaptchaExpire}
                      onError={(err) => setError(err)}
                    />
                    {!captchaToken && (
                      <p className={styles.captchaHint}>
                        Please complete the verification above
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.twoFactor}>
                <div className={styles.twoFactorHeader}>
                  <div className={styles.twoFactorIcon}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <p className={styles.twoFactorHint}>
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className={styles.field}>
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
                  <p className={styles.twoFactorBackupHint}>
                    You can also use a backup code (format: XXXX-XXXX)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBackFromTwoFactor}
                  className={styles.backButton}
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
          </motion.form>

          <motion.div variants={fadeInUp} className={styles.footer}>
            <Link href="/" className={styles.footerLink}>
              &larr; Back to main site
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
