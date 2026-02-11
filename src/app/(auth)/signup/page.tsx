'use client'

import { useState, Suspense, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { sendMagicLink } from '@/app/actions/auth'
import { getRedirectUrl, buildUrlWithRedirect, isInviteRedirect } from '@/lib/utils/redirect'
import { type PlanTier } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { useFormTracking, useScrollDepthTracking, useExitIntent } from '@/lib/analytics/hooks'

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageLoading />}>
      <SignupPageContent />
    </Suspense>
  )
}

function SignupPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
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
    } catch {
      setResendStatus('error')
    }
  }

  // SUCCESS STATE - Show "check your email" message
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal Header */}
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <a href="https://exitosx.com" className="inline-flex items-center gap-2">
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
            </a>
          </div>
        </header>

        <main className="flex items-center justify-center px-4 py-12 md:py-20">
          <div className="w-full max-w-lg space-y-8">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <span className="text-xs text-muted-foreground ml-1">Email</span>
              </div>
              <div className="w-8 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium animate-pulse">
                  2
                </div>
                <span className="text-xs text-foreground font-medium ml-1">Verify</span>
              </div>
              <div className="w-8 h-0.5 bg-border"></div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-xs text-muted-foreground ml-1">Set Password</span>
              </div>
              <div className="w-8 h-0.5 bg-border"></div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="text-xs text-muted-foreground ml-1">See Score</span>
              </div>
            </div>

            {/* Main Message */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MailIcon className="w-8 h-8 text-primary" />
              </div>

              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight">
                {isFromTaskInvite
                  ? 'Almost There -- Check Your Email'
                  : 'Check Your Email to Continue'}
              </h1>

              <p className="text-muted-foreground">
                We sent a verification link to
              </p>
              <p className="text-lg font-semibold text-foreground">{email}</p>
              <p className="text-foreground">
                Click the link in your email to set a password and start your exit readiness assessment.
              </p>
            </div>

            {/* Value Reinforcement */}
            {isFromTaskInvite ? (
              <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                <p className="font-medium text-foreground text-sm">
                  After verifying your email, you will be able to:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>View your assigned task and details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Track progress and upload evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Collaborate with your team</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                <p className="font-medium text-foreground text-sm">
                  Founders who complete this step typically uncover:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Hidden buyer risks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Valuation blind spots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Clear opportunities to increase exit leverage</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Primary CTA - Open email provider */}
            <div className="space-y-4">
              {(() => {
                const provider = getEmailProvider(email)
                return provider.url ? (
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
              <div className="text-center text-sm text-muted-foreground">
                {resendStatus === 'sent' ? (
                  <span className="text-emerald-700 font-medium">New email sent! Check your inbox.</span>
                ) : (
                  <>
                    <span>Didn&apos;t receive it? </span>
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                      disabled={resendStatus === 'sending'}
                      onClick={handleResendMagicLink}
                    >
                      {resendStatus === 'sending' ? 'Sending...' : 'Resend email'}
                    </button>
                    <span> &middot; </span>
                    <span>Check spam</span>
                  </>
                )}
                {resendStatus === 'error' && (
                  <p className="text-destructive mt-1">Failed to resend. Please try again.</p>
                )}
              </div>
            </div>

            {isFromInvite && (
              <div className="p-4 text-sm text-primary bg-primary/5 border border-primary/20 rounded-lg text-center">
                <p className="font-medium">After verifying, you will be redirected to accept your team invite.</p>
              </div>
            )}

            {/* Trust Footer */}
            <div className="text-center space-y-1 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">No sales calls. No obligation.</p>
              <p className="text-sm text-muted-foreground">Just clarity.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // SIGNUP FORM - Email-only, magic link
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="https://exitosx.com" className="inline-flex items-center gap-2">
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
          </a>
          <Link
            href={buildUrlWithRedirect('/login', redirectUrl)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Already have an account? <span className="text-primary font-medium">Log in</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column - Value Proposition */}
          <div className="space-y-8">
            {/* Headline */}
            <div className="space-y-4">
              {isFromTaskInvite ? (
                <>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display text-foreground tracking-tight leading-tight">
                    Create your account to get started on your assigned task
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {teamName ? `You've been invited to join the ${teamName} team on Exit OSx.` : "You've been invited to collaborate on Exit OSx."}
                  </p>
                  <p className="text-foreground">
                    Enter your email to create a free account and view your assigned task.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display text-foreground tracking-tight leading-tight">
                    See How Buyers Would Price Your Business Today
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Most founders don&apos;t lose money at exit because of revenue.
                    <br />
                    They lose it because of <span className="text-foreground font-medium">hidden risk</span>.
                  </p>
                  <p className="text-foreground">
                    Exit OSx shows you where buyers will discount your company -- and what to do about it -- in minutes.
                  </p>
                </>
              )}
            </div>

            {/* Value Anchor - The money math */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <p className="text-lg text-foreground">
                Even a <span className="font-semibold">0.3x multiple swing</span> on a $3M EBITDA business
              </p>
              <p className="text-2xl font-bold text-primary mt-1">= $900,000</p>
              <p className="text-muted-foreground mt-2">This assessment costs $0.</p>
            </div>

            {/* What You'll See - Below fold on mobile, visible on desktop */}
            <div className="hidden lg:block space-y-4">
              <h2 className="font-semibold text-foreground">What You&apos;ll See After Signup</h2>
              <p className="text-muted-foreground">Within minutes, you&apos;ll get:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>Your Exit Readiness Score</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>A breakdown of buyer risk categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>Where your valuation is most exposed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <span>What matters now vs later</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                No guessing. No jargon. No pressure to upgrade.
              </p>
            </div>

            {/* Objection Handling - Desktop only */}
            <div className="hidden lg:block space-y-4 pt-4 border-t border-border">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">&quot;I&apos;m not selling yet.&quot;</p>
                  <p className="text-sm text-muted-foreground">Perfect. This is when leverage is built.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">&quot;I already have an advisor.&quot;</p>
                  <p className="text-sm text-muted-foreground">Great. This helps you focus them where it counts.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">&quot;I&apos;ll do this later.&quot;</p>
                  <p className="text-sm text-muted-foreground">Later is when buyers decide for you.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Signup Form */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {isFromTaskInvite && teamName
                    ? `Create Account to Join ${teamName} Team`
                    : isFromInvite
                      ? 'Create Account to Join Team'
                      : 'Get Started Free'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we&apos;ll send you a link to get started.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
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
                  <p className="text-xs text-muted-foreground">We&apos;ll send a verification link to this address.</p>
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

                {/* Trust Microcopy */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Free plan. No credit card required.</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span>No sales calls. Ever.</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Your data is private and never shared.</span>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground pt-2">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="text-primary hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </form>
            </div>

            {/* Social Proof */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-center gap-6 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">500+</p>
                  <p className="text-xs text-muted-foreground">Assessments run</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-lg font-semibold text-foreground">$3.5M</p>
                  <p className="text-xs text-muted-foreground">Avg. value gap found</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-lg font-semibold text-foreground">2 min</p>
                  <p className="text-xs text-muted-foreground">To first insight</p>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Built for $1M-$100M businesses using real buyer diligence logic
              </p>
            </div>
          </div>
        </div>

        {/* Mobile: What You'll See section */}
        <div className="lg:hidden mt-12 space-y-6">
          <h2 className="font-semibold text-foreground text-lg">What You&apos;ll See After Signup</h2>
          <p className="text-muted-foreground">Within minutes, you&apos;ll get:</p>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>Your Exit Readiness Score</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>A breakdown of buyer risk categories</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>Where your valuation is most exposed</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <span>What matters now vs later</span>
            </li>
          </ul>

          {/* Mobile Objection Handling */}
          <div className="space-y-4 pt-6 border-t border-border">
            <div>
              <p className="font-medium text-foreground">&quot;I&apos;m not selling yet.&quot;</p>
              <p className="text-sm text-muted-foreground">Perfect. This is when leverage is built.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">&quot;I already have an advisor.&quot;</p>
              <p className="text-sm text-muted-foreground">Great. This helps you focus them where it counts.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">&quot;I&apos;ll do this later.&quot;</p>
              <p className="text-sm text-muted-foreground">Later is when buyers decide for you.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Microcopy */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Exit OSx is an operating system for exit readiness, not a sales funnel.
          </p>
          <p className="text-sm text-muted-foreground">
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
