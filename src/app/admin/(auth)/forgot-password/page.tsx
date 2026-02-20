'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, ArrowLeft, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

export default function AdminForgotPasswordPage() {
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
          </div>

          <p className={styles.brandFooter}>
            Restricted Access - Authorized Personnel Only
          </p>
        </motion.div>
      </div>

      {/* Right side - Form */}
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

          {!success ? (
            <>
              <motion.div variants={fadeInUp} className={styles.heading}>
                <h2 className={styles.title}>Reset your password</h2>
                <p className={styles.subtitle}>
                  Enter your email and we&apos;ll send you a link to reset your password
                </p>
              </motion.div>

              <motion.form variants={fadeInUp} onSubmit={handleSubmit} className={styles.form}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.errorBanner}
                  >
                    <p className={styles.errorMain}>{error}</p>
                  </motion.div>
                )}

                <div className={styles.field}>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@exitosx.com"
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
              </motion.form>
            </>
          ) : (
            <motion.div variants={fadeInUp} className={styles.success}>
              <div className={styles.successIcon}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className={styles.successBody}>
                <h2 className={styles.successTitle}>Check your email</h2>
                <p className={styles.successText}>
                  We&apos;ve sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
              <p className={styles.successNote}>
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className={styles.tryAgainButton}
                >
                  try again
                </button>
              </p>
            </motion.div>
          )}

          <motion.div variants={fadeInUp} className={styles.footer}>
            <Link
              href="/admin/login"
              className={`${styles.footerLink} ${styles.footerLinkInline}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to admin sign in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
