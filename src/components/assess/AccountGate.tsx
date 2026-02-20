'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Check } from 'lucide-react'
import type { BusinessBasicsData } from './BusinessBasicsStep'
import type { BusinessProfileData } from './BusinessProfileStep'
import type { BuyerScanData } from './BuyerScanStep'
import type { AssessmentResults } from './ResultsReveal'

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

interface AccountGateProps {
  prefillEmail: string | null
  results: AssessmentResults
  basics: BusinessBasicsData
  profile: BusinessProfileData
  scan: BuyerScanData
  onAccountCreated: () => void
}

function getPasswordStrength(pw: string): { label: string; color: string; width: number } {
  if (pw.length === 0) return { label: '', color: '', width: 0 }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 2) return { label: 'Weak', color: 'var(--red)', width: 33 }
  if (score <= 3) return { label: 'Fair', color: 'var(--orange)', width: 66 }
  return { label: 'Strong', color: 'var(--green)', width: 100 }
}

export function AccountGate({
  prefillEmail,
  results,
  basics,
  profile,
  scan,
  onAccountCreated,
}: AccountGateProps) {
  const router = useRouter()
  const gateRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState(prefillEmail || '')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const strength = getPasswordStrength(password)

  const handleCreateAccount = async () => {
    if (password.length < 8) {
      setSaveError('Password must be at least 8 characters')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const res = await fetch('/api/assess/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          basics: {
            ...basics,
            companyName: fullName ? `${basics.companyName}` : basics.companyName,
          },
          profile,
          scan,
          results,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create account')
      }

      // Auto-sign in
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('[assess] Auto sign-in failed:', signInError.message)
      }

      onAccountCreated()
      window.location.href = '/dashboard'
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    const baseUrl = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    })
  }

  return (
    <div ref={gateRef}>
      {/* Gate divider */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap px-2">
          Create a free account to unlock your full results
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Blurred category preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-border p-5 mb-6"
        style={{ filter: 'blur(8px)', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div className="space-y-3">
          {Object.entries(results.categoryBreakdown).map(([cat, score]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-28 shrink-0">
                {CATEGORY_LABELS[cat] || cat}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    score >= 0.75 ? 'bg-green' : score >= 0.5 ? 'bg-orange' : 'bg-red'
                  }`}
                  style={{ width: `${Math.max(8, score * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Account creation card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-8 sm:p-10 shadow-lg"
      >
        <div className="text-center mb-6">
          <h3 className="text-xl sm:text-[22px] font-bold text-foreground">
            Your full exit readiness report is ready
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left max-w-sm mx-auto">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-dark mt-0.5 shrink-0" />
              <span>Detailed risk breakdown across 6 buyer confidence factors</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-dark mt-0.5 shrink-0" />
              <span>Prioritized action plan with estimated value impact</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-dark mt-0.5 shrink-0" />
              <span>Track your progress and improve your score over time</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          {/* Email */}
          <div>
            <Label htmlFor="gate-email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="gate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-12 text-[15px]"
              autoComplete="email"
            />
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="gate-name" className="text-xs text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="gate-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="h-12 text-[15px]"
              autoComplete="name"
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="gate-password" className="text-xs text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="gate-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-12 text-[15px] pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors w-10 h-10 flex items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-primary outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${strength.width}%`,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-red">{saveError}</p>
          )}

          {/* Create Account button */}
          <Button
            onClick={handleCreateAccount}
            disabled={isSaving || !email || !password || password.length < 8}
            className="w-full h-12 text-base font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            className="w-full h-12 text-base font-medium"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Terms + Sign in link */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
