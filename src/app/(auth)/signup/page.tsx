'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { secureSignup } from '@/app/actions/auth'
import { getRedirectUrl, buildUrlWithRedirect, isInviteRedirect } from '@/lib/utils/redirect'
import { PRICING_PLANS, type PlanTier } from '@/lib/pricing'

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
  const selectedPlanId = searchParams.get('plan') as PlanTier | null
  const selectedPlan = selectedPlanId ? PRICING_PLANS.find(p => p.id === selectedPlanId) : null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setWarning(null)
    setLoading(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const result = await secureSignup(name, email, password, redirectUrl, selectedPlanId || undefined)

      if (!result.success) {
        setError(result.error || 'Unable to create account')
        return
      }

      if (result.passwordWarning) {
        setWarning(result.passwordWarning)
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
              <h1 className="text-4xl font-bold font-display leading-tight tracking-tight">
                You&apos;re Almost There
              </h1>
              <p className="text-lg opacity-90 max-w-md">
                Just one more step to start your exit planning journey.
              </p>
            </div>

            <p className="text-sm opacity-70">
              A Pasadena Private product
            </p>
          </motion.div>
        </div>

        {/* Right side - Success Message */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
          <motion.div
            className="w-full max-w-md space-y-8 text-center"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Mobile logo */}
            <motion.div variants={fadeInUp} className="lg:hidden">
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
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"
            >
              <MailIcon className="w-8 h-8 text-green-600" />
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">Check your email</h2>
              <p className="mt-4 text-muted-foreground">
                We&apos;ve sent a confirmation link to
              </p>
              <p className="font-medium text-foreground mt-1">{email}</p>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-sm text-muted-foreground">
              Click the link in the email to verify your account and complete signup.
              Don&apos;t see it? Check your spam folder.
            </motion.p>

            {isFromInvite && (
              <motion.div variants={fadeInUp} className="p-4 text-sm text-primary bg-primary/5 border border-primary/20 rounded-lg">
                <p className="font-medium">After verifying your email, you&apos;ll be redirected to accept your team invite.</p>
              </motion.div>
            )}

            {warning && (
              <motion.div variants={fadeInUp} className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Security Recommendation</p>
                  <p className="mt-1 text-amber-600">{warning}</p>
                  <p className="mt-2 text-xs">Consider changing your password after verifying your account.</p>
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeInUp}>
              <Link href="/login">
                <Button variant="outline" className="w-full h-12 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                  Back to Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

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
            <h1 className="text-4xl font-bold font-display leading-tight tracking-tight">
              Start Building Your<br />Exit Strategy Today
            </h1>
            <p className="text-lg opacity-90 max-w-md">
              Join business owners who are taking control of their exit outcomes with data-driven insights and actionable playbooks.
            </p>
            <motion.div
              className="space-y-4 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {[
                'Free to start, no credit card required',
                '14-day free trial on paid features',
                'Cancel or downgrade anytime'
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
            A Pasadena Private product
          </p>
        </motion.div>
      </div>

      {/* Right side - Signup Form */}
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
          </motion.div>

          <motion.div variants={fadeInUp} className="text-center">
            <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">
              {isFromInvite ? 'Create an account to join' : 'Create your account'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isFromInvite
                ? 'Sign up to accept your team invitation'
                : 'Get started with Exit OSx in minutes'}
            </p>
          </motion.div>

          {/* Selected Plan Banner */}
          {selectedPlan && !isFromInvite && (
            <motion.div
              variants={fadeInUp}
              className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {selectedPlan.name} Plan
                  {selectedPlan.monthlyPrice > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      14-day free trial
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.monthlyPrice === 0
                    ? 'Free forever'
                    : `Then $${selectedPlan.annualPrice}/mo billed annually`}
                </p>
              </div>
              <Link
                href="/pricing"
                className="text-sm text-primary hover:underline"
              >
                Change
              </Link>
            </motion.div>
          )}

          <motion.form variants={fadeInUp} onSubmit={handleSignup} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-12 transition-all duration-200 focus:scale-[1.01]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 transition-all duration-200 focus:scale-[1.01]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 pr-12 transition-all duration-200 focus:scale-[1.01]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </motion.form>

          <motion.div variants={fadeInUp} className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href={buildUrlWithRedirect('/login', redirectUrl)} className="font-medium text-primary hover:underline">
                Sign in
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

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}
