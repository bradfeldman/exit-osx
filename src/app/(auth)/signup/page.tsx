'use client'

import { useState, Suspense, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { sendMagicLink } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { getRedirectUrl, buildUrlWithRedirect, isInviteRedirect } from '@/lib/utils/redirect'
import { type PlanTier } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { useFormTracking, useScrollDepthTracking, useExitIntent } from '@/lib/analytics/hooks'
import styles from '@/components/auth/auth-signup.module.css'

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageLoading />}>
      <SignupPageContent />
    </Suspense>
  )
}

function SignupPageLoading() {
  return (
    <div className={styles.signupLoading}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function SignupPageContent() {
  const searchParams = useSearchParams()
  const redirectUrl = getRedirectUrl(searchParams)
  const isFromInvite = isInviteRedirect(redirectUrl)
  const isFromTaskInvite = redirectUrl?.includes('/invite/task/') ?? false
  const prefilledEmail = searchParams.get('email') || ''
  const teamName = searchParams.get('team') || ''
  const selectedPlanId = searchParams.get('plan') as PlanTier | null
  const [email, setEmail] = useState(prefilledEmail)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Analytics: Page load time reference
  const pageLoadTime = useRef(Date.now())

  // Analytics: Form tracking
  const {
    handleFieldFocus,
    handleFieldBlur,
    handleFieldError,
    markSubmitted,
  } = useFormTracking({ formId: 'signup' })

  // Analytics: Track scroll depth
  useScrollDepthTracking()

  // Analytics: Track exit intent
  useExitIntent()

  // Analytics: Track page view on mount
  useEffect(() => {
    analytics.trackPageView('signup', {
      entryPoint: document.referrer || 'direct',
      planPreselected: selectedPlanId || undefined,
      isFromInvite,
    })

    analytics.startTimer('signup_page')
  }, [selectedPlanId, isFromInvite])

  // Analytics: Track success state
  useEffect(() => {
    if (success) {
      const timeToSubmit = Date.now() - pageLoadTime.current
      analytics.track('signup_complete', {
        method: 'magic_link',
      })

      analytics.track('signup_submit', {
        success: true,
        timeToSubmit,
      })
    }
  }, [success])

  // Analytics: Track errors
  const _trackError = useCallback((errorMessage: string, fieldName?: string) => {
    if (fieldName) {
      handleFieldError(fieldName, 'validation', errorMessage)
    }
    analytics.track('form_field_error', {
      formId: 'signup',
      fieldName: fieldName || 'form',
      errorType: 'validation',
      errorMessage,
    })
  }, [handleFieldError])

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    const baseUrl = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectUrl || '/dashboard')}`,
      },
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    markSubmitted()

    try {
      const result = await sendMagicLink(email, selectedPlanId || undefined)

      if (!result.success) {
        const errorMsg = result.error || 'Unable to send verification email'
        setError(errorMsg)

        analytics.track('signup_submit', {
          success: false,
          timeToSubmit: Date.now() - pageLoadTime.current,
          errorType: errorMsg,
        })
        return
      }

      setSuccess(true)
    } catch {
      const errorMsg = 'An unexpected error occurred'
      setError(errorMsg)
      analytics.track('signup_submit', {
        success: false,
        timeToSubmit: Date.now() - pageLoadTime.current,
        errorType: 'unexpected_error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendMagicLink = async () => {
    if (!email) return
    setResendStatus('sending')
    try {
      const result = await sendMagicLink(email, selectedPlanId || undefined)
      setResendStatus(result.success ? 'sent' : 'error')
      // Auto-reset after 5 seconds so they can resend again if needed
      if (result.success) {
        setTimeout(() => setResendStatus('idle'), 5000)
      }
    } catch {
      setResendStatus('error')
    }
  }

  // SUCCESS STATE - Show "check your email" message
  if (success) {
    return (
      <div className={styles.signupSuccessPage}>
        {/* Minimal Header */}
        <header className={styles.signupHeader}>
          <div className={styles.signupHeaderInner}>
            <a href="https://exitosx.com" className={styles.signupLogo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.webp"
                alt="Exit OSx"
                width={32}
                height={32}
                className={styles.signupLogoImg}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wordmark.svg"
                alt="Exit OSx"
                width={100}
                height={28}
                className={styles.signupWordmark}
              />
            </a>
          </div>
        </header>

        <main className={styles.signupSuccessMain}>
          <div className={styles.signupSuccessContent}>
            {/* Progress Indicator */}
            <div className={styles.signupSteps}>
              <div className={styles.signupStep}>
                <div className={`${styles.signupStepCircle} ${styles.signupStepCircleDone}`}>
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span className={`${styles.signupStepLabel} ${styles.signupStepLabelDone}`}>Email</span>
              </div>
              <div className={`${styles.signupStepConnector} ${styles.signupStepConnectorDone}`} />
              <div className={styles.signupStep}>
                <div className={`${styles.signupStepCircle} ${styles.signupStepCircleActive}`}>
                  2
                </div>
                <span className={`${styles.signupStepLabel} ${styles.signupStepLabelActive}`}>Verify</span>
              </div>
              <div className={`${styles.signupStepConnector} ${styles.signupStepConnectorInactive}`} />
              <div className={styles.signupStep}>
                <div className={`${styles.signupStepCircle} ${styles.signupStepCircleInactive}`}>
                  3
                </div>
                <span className={`${styles.signupStepLabel} ${styles.signupStepLabelInactive}`}>Set Password</span>
              </div>
              <div className={`${styles.signupStepConnector} ${styles.signupStepConnectorInactive}`} />
              <div className={styles.signupStep}>
                <div className={`${styles.signupStepCircle} ${styles.signupStepCircleInactive}`}>
                  4
                </div>
                <span className={`${styles.signupStepLabel} ${styles.signupStepLabelInactive}`}>See Score</span>
              </div>
            </div>

            {/* Main Message */}
            <div className={styles.signupSuccessMessage}>
              <div className={styles.signupSuccessIconWrap}>
                <MailIcon className="w-8 h-8 text-primary" />
              </div>

              <h1 className={styles.signupSuccessTitle}>
                {isFromTaskInvite
                  ? 'Almost There -- Check Your Email'
                  : 'Check Your Email to Continue'}
              </h1>

              <p className={styles.signupSuccessIntro}>
                We sent a verification link to
              </p>
              <p className={styles.signupSuccessEmail}>{email}</p>
              <p className={styles.signupSuccessBody}>
                Click the link in your email to set a password and start your exit readiness assessment.
              </p>
            </div>

            {/* Value Reinforcement */}
            {isFromTaskInvite ? (
              <div className={styles.signupSuccessBox}>
                <p className={styles.signupSuccessBoxTitle}>
                  After verifying your email, you will be able to:
                </p>
                <ul className={styles.signupSuccessBoxList}>
                  <li className={styles.signupSuccessBoxItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>View your assigned task and details</span>
                  </li>
                  <li className={styles.signupSuccessBoxItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Track progress and upload evidence</span>
                  </li>
                  <li className={styles.signupSuccessBoxItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Collaborate with your team</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className={styles.signupSuccessBox}>
                <p className={styles.signupSuccessBoxTitle}>
                  Founders who complete this step typically uncover:
                </p>
                <ul className={styles.signupSuccessBoxList}>
                  <li className={styles.signupSuccessBoxItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Hidden buyer risks</span>
                  </li>
                  <li className={styles.signupSuccessBoxItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Valuation blind spots</span>
                  </li>
                  <li className={styles.signupSuccessBoxItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Clear opportunities to increase exit leverage</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Primary CTA - Open email provider */}
            <div className={styles.signupSuccessActions}>
              {(() => {
                const provider = getEmailProvider(email)
                return provider.url ? (
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.signupSuccessEmailLink}
                  >
                    <Button className="w-full h-12 text-base font-medium">
                      <MailIcon className="w-5 h-5 mr-2" />
                      Open {provider.name}
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full h-12 text-base font-medium" disabled variant="secondary">
                    <MailIcon className="w-5 h-5 mr-2" />
                    Check Your Email
                  </Button>
                )
              })()}

              {/* Secondary Action - Resend */}
              <div className={styles.signupResend}>
                {resendStatus === 'sent' ? (
                  <span className={styles.signupResendSuccess}>
                    <CheckIcon className="w-4 h-4" />
                    New email sent! Check your inbox.
                  </span>
                ) : (
                  <>
                    <span>Didn&apos;t receive it? </span>
                    <button
                      type="button"
                      className={styles.signupResendButton}
                      disabled={resendStatus === 'sending'}
                      onClick={handleResendMagicLink}
                    >
                      {resendStatus === 'sending' ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Sending...
                        </>
                      ) : 'Resend email'}
                    </button>
                    <span> &middot; </span>
                    <span>Check spam</span>
                  </>
                )}
                {resendStatus === 'error' && (
                  <p className={styles.signupResendError}>Failed to resend. Please try again.</p>
                )}
              </div>
            </div>

            {isFromInvite && (
              <div className={styles.signupInviteBanner}>
                <p className={styles.signupInviteBannerText}>After verifying, you will be redirected to accept your team invite.</p>
              </div>
            )}

            {/* Trust Footer */}
            <div className={styles.signupTrustFooter}>
              <p className={styles.signupTrustFooterText}>No sales calls. No obligation.</p>
              <p className={styles.signupTrustFooterText}>Just clarity.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // SIGNUP FORM - Email-only, magic link
  return (
    <div className={styles.signupPage}>
      {/* Minimal Header */}
      <header className={styles.signupHeader}>
        <div className={styles.signupHeaderInner}>
          <a href="https://exitosx.com" className={styles.signupLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Exit OSx"
              width={32}
              height={32}
              className={styles.signupLogoImg}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wordmark.svg"
              alt="Exit OSx"
              width={100}
              height={28}
              className={styles.signupWordmark}
            />
          </a>
          <Link
            href={buildUrlWithRedirect('/login', redirectUrl)}
            className={styles.signupHeaderLink}
          >
            Already have an account? <span className={styles.signupHeaderLinkAccent}>Log in</span>
          </Link>
        </div>
      </header>

      <main className={styles.signupMain}>
        <div className={styles.signupGrid}>
          {/* Left Column - Value Proposition */}
          <div className={styles.signupValueProp}>
            {/* Headline */}
            <div className={styles.signupHeadline}>
              {isFromTaskInvite ? (
                <>
                  <h1 className={styles.signupTitle}>
                    Create your account to get started on your assigned task
                  </h1>
                  <p className={styles.signupSubtitle}>
                    {teamName ? `You've been invited to join the ${teamName} team on Exit OSx.` : "You've been invited to collaborate on Exit OSx."}
                  </p>
                  <p className={styles.signupBodyText}>
                    Enter your email to create a free account and view your assigned task.
                  </p>
                </>
              ) : (
                <>
                  <h1 className={styles.signupTitle}>
                    See How Buyers Would Price Your Business Today
                  </h1>
                  <p className={styles.signupSubtitle}>
                    Most founders don&apos;t lose money at exit because of revenue.
                    <br />
                    They lose it because of <strong>hidden risk</strong>.
                  </p>
                  <p className={styles.signupBodyText}>
                    Exit OSx shows you where buyers will discount your company -- and what to do about it -- in minutes.
                  </p>
                </>
              )}
            </div>

            {/* Value Anchor - The money math */}
            <div className={styles.signupValueAnchor}>
              <p className={styles.signupValueAnchorText}>
                Even a <strong>0.3x multiple swing</strong> on a $3M EBITDA business
              </p>
              <p className={styles.signupValueAnchorAmount}>= $900,000</p>
              <p className={styles.signupValueAnchorNote}>This assessment costs $0.</p>
            </div>

            {/* What You'll See - Desktop only */}
            <div className={styles.signupBenefitsDesktop}>
              <h2 className={styles.signupBenefitsTitle}>What You&apos;ll See After Signup</h2>
              <p className={styles.signupBenefitsIntro}>Within minutes, you&apos;ll get:</p>
              <ul className={styles.signupBenefitsList}>
                <li className={styles.signupBenefitsItem}>
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>Your Buyer Readiness Index</span>
                </li>
                <li className={styles.signupBenefitsItem}>
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>A breakdown of buyer risk categories</span>
                </li>
                <li className={styles.signupBenefitsItem}>
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>Where your valuation is most exposed</span>
                </li>
                <li className={styles.signupBenefitsItem}>
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>What matters now vs later</span>
                </li>
              </ul>
              <p className={styles.signupBenefitsNote}>
                No guessing. No jargon. No pressure to upgrade.
              </p>
            </div>

            {/* Objection Handling - Desktop only */}
            <div className={styles.signupObjectionsDesktop}>
              <div className={styles.signupObjectionList}>
                <div>
                  <p className={styles.signupObjectionQ}>&quot;I&apos;m not selling yet.&quot;</p>
                  <p className={styles.signupObjectionA}>Perfect. This is when leverage is built.</p>
                </div>
                <div>
                  <p className={styles.signupObjectionQ}>&quot;I already have an advisor.&quot;</p>
                  <p className={styles.signupObjectionA}>Great. This helps you focus them where it counts.</p>
                </div>
                <div>
                  <p className={styles.signupObjectionQ}>&quot;I&apos;ll do this later.&quot;</p>
                  <p className={styles.signupObjectionA}>Later is when buyers decide for you.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Signup Form */}
          <div className={styles.signupFormColumn}>
            <div className={styles.signupCard}>
              <div className={styles.signupCardHeader}>
                <h2 className={styles.signupCardTitle}>
                  {isFromTaskInvite && teamName
                    ? `Create Account to Join ${teamName} Team`
                    : isFromInvite
                      ? 'Create Account to Join Team'
                      : 'Get Started Free'}
                </h2>
                <p className={styles.signupCardSubtitle}>
                  Enter your email and we&apos;ll send you a link to get started.
                </p>
              </div>

              <form onSubmit={handleSignup} className={styles.signupForm}>
                {error && (
                  <div className={styles.signupErrorAlert}>
                    {error}
                  </div>
                )}

                <div className={styles.signupField}>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => handleFieldFocus('email')}
                    onBlur={() => handleFieldBlur('email')}
                    required
                    disabled={loading}
                    readOnly={!!prefilledEmail && isFromTaskInvite}
                    className={`h-12 ${prefilledEmail && isFromTaskInvite ? 'bg-muted' : ''}`}
                    autoComplete="email"
                    autoFocus={!prefilledEmail}
                  />
                  <p className={styles.signupFieldHint}>We&apos;ll send a verification link to this address.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium mt-2"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : isFromTaskInvite ? (
                    'Send Verification Link'
                  ) : (
                    'Get My Exit Risk Profile'
                  )}
                </Button>

                {/* OR divider + Google */}
                <div className={styles.signupDivider}>
                  <div className={styles.signupDividerLine} />
                  <span className={styles.signupDividerText}>OR</span>
                  <div className={styles.signupDividerLine} />
                </div>
                <Button
                  type="button"
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

                {/* Trust Microcopy */}
                <div className={styles.signupTrustList}>
                  <div className={styles.signupTrustItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Free plan. No credit card required.</span>
                  </div>
                  <div className={styles.signupTrustItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span>No sales calls. Ever.</span>
                  </div>
                  <div className={styles.signupTrustItem}>
                    <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Your data is private and never shared.</span>
                  </div>
                </div>

                <p className={styles.signupTerms}>
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className={styles.signupTermsLink}>Terms</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className={styles.signupTermsLink}>Privacy Policy</Link>
                </p>
              </form>
            </div>

            {/* Social Proof */}
            <div className={styles.signupSocialProof}>
              <div className={styles.signupStats}>
                <div className={styles.signupStat}>
                  <p className={styles.signupStatValue}>500+</p>
                  <p className={styles.signupStatLabel}>Assessments run</p>
                </div>
                <div className={styles.signupStatDivider} />
                <div className={styles.signupStat}>
                  <p className={styles.signupStatValue}>$3.5M</p>
                  <p className={styles.signupStatLabel}>Avg. value gap found</p>
                </div>
                <div className={styles.signupStatDivider} />
                <div className={styles.signupStat}>
                  <p className={styles.signupStatValue}>2 min</p>
                  <p className={styles.signupStatLabel}>To first insight</p>
                </div>
              </div>
              <p className={styles.signupSocialProofNote}>
                Built for $1M-$100M businesses using real buyer diligence logic
              </p>
            </div>
          </div>
        </div>

        {/* Mobile: What You'll See section */}
        <div className={styles.signupBenefitsMobile}>
          <h2 className={styles.signupBenefitsTitle} style={{ fontSize: '18px' }}>What You&apos;ll See After Signup</h2>
          <p className={styles.signupBenefitsIntro}>Within minutes, you&apos;ll get:</p>
          <ul className={styles.signupBenefitsList}>
            <li className={styles.signupBenefitsItem} style={{ gap: '12px' }}>
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>Your Buyer Readiness Index</span>
            </li>
            <li className={styles.signupBenefitsItem} style={{ gap: '12px' }}>
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>A breakdown of buyer risk categories</span>
            </li>
            <li className={styles.signupBenefitsItem} style={{ gap: '12px' }}>
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>Where your valuation is most exposed</span>
            </li>
            <li className={styles.signupBenefitsItem} style={{ gap: '12px' }}>
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>What matters now vs later</span>
            </li>
          </ul>

          {/* Mobile Objection Handling */}
          <div className={styles.signupObjectionsMobile}>
            <div>
              <p className={styles.signupObjectionQ}>&quot;I&apos;m not selling yet.&quot;</p>
              <p className={styles.signupObjectionA}>Perfect. This is when leverage is built.</p>
            </div>
            <div>
              <p className={styles.signupObjectionQ}>&quot;I already have an advisor.&quot;</p>
              <p className={styles.signupObjectionA}>Great. This helps you focus them where it counts.</p>
            </div>
            <div>
              <p className={styles.signupObjectionQ}>&quot;I&apos;ll do this later.&quot;</p>
              <p className={styles.signupObjectionA}>Later is when buyers decide for you.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Microcopy */}
      <footer className={styles.signupFooter}>
        <div className={styles.signupFooterInner}>
          <p className={styles.signupFooterText}>
            Exit OSx is an operating system for exit readiness, not a sales funnel.
          </p>
          <p className={styles.signupFooterText}>
            Start free. Upgrade only when it makes sense.
          </p>
        </div>
      </footer>
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

function getEmailProvider(email: string): { name: string; url: string | null } {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return { name: 'Email', url: null }

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#search/from%3Aexitosx+in%3Aanywhere' }
  }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
    return { name: 'Outlook', url: 'https://outlook.live.com/mail/' }
  }
  if (domain === 'yahoo.com' || domain === 'ymail.com') {
    return { name: 'Yahoo Mail', url: 'https://mail.yahoo.com/' }
  }
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return { name: 'iCloud Mail', url: 'https://www.icloud.com/mail/' }
  }
  if (domain === 'protonmail.com' || domain === 'proton.me' || domain === 'pm.me') {
    return { name: 'Proton Mail', url: 'https://mail.proton.me/' }
  }

  return { name: 'Email', url: null }
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}
