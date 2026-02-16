'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from '@/lib/motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, TrendingUp, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { BusinessBasicsData } from './BusinessBasicsStep'
import type { BusinessProfileData } from './BusinessProfileStep'
import type { BuyerScanData } from './BuyerScanStep'

export interface AssessmentResults {
  briScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  baseMultiple: number
  finalMultiple: number
  topTasks: Array<{
    title: string
    category: string
    estimatedImpact: number
  }>
  categoryBreakdown: Record<string, number>
  confidenceLevel?: 'high' | 'medium' | 'low'
}

interface ResultsRevealProps {
  results: AssessmentResults
  email: string
  basics: BusinessBasicsData
  profile: BusinessProfileData
  scan: BuyerScanData
}

function getBriColor(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function getBriLabel(score: number): string {
  if (score >= 80) return 'Strong'
  if (score >= 65) return 'Moderate'
  if (score >= 50) return 'Needs Work'
  return 'At Risk'
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

function getCategoryRiskLabel(score: number): string {
  if (score >= 0.75) return 'Low Risk'
  if (score >= 0.5) return 'Some Risk'
  if (score > 0) return 'High Risk'
  return 'At Risk'
}

function getCategoryBarWidth(score: number): number {
  // For the quick scan, avoid showing completely empty or completely full bars
  // when a category only has 1 question (which gives 0 or 1.0)
  if (score === 0) return 8 // show a sliver so it's not invisible
  if (score === 1) return 92 // leave a little room so it doesn't look like "perfect"
  return score * 100
}

export function ResultsReveal({ results, email, basics, profile, scan }: ResultsRevealProps) {
  const router = useRouter()
  const [phase, setPhase] = useState(0) // 0=BRI, 1=categories, 2=valuation, 3=tasks, 4=CTA
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Phased reveal animation
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 2400),
      setTimeout(() => setPhase(3), 3600),
      setTimeout(() => setPhase(4), 4800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleSaveResults = async () => {
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
          basics,
          profile,
          scan,
          results,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save results')
      }

      // Auto-sign in with the password they just set
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Sign-in failed — fall back to showing "Go to Login"
        console.error('[assess] Auto sign-in failed:', signInError.message)
        setSaved(true)
        return
      }

      // Full page navigation so middleware sets the activity cookie
      window.location.href = '/dashboard'
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* BRI Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Buyer Readiness Index
        </p>
        <div className={`text-7xl sm:text-8xl font-bold tabular-nums ${getBriColor(results.briScore)}`}>
          {results.briScore}
        </div>
        <p className={`text-lg font-medium mt-1 ${getBriColor(results.briScore)}`}>
          {getBriLabel(results.briScore)}
        </p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          This score reflects how a buyer would evaluate your business today.
          Higher scores command higher multiples.
        </p>
      </motion.div>

      {/* Category Breakdown */}
      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Risk Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(results.categoryBreakdown).map(([cat, score]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      score >= 0.75 ? 'bg-green-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${getCategoryBarWidth(score)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
                <span className={`text-xs font-medium w-20 text-right ${
                  score >= 0.75 ? 'text-green-600' : score >= 0.5 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {getCategoryRiskLabel(score)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Valuation */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Valuation Estimate
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Current</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(results.currentValue)}</p>
              <p className="text-xs text-muted-foreground">{results.finalMultiple.toFixed(1)}x</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(results.potentialValue)}</p>
              <p className="text-xs text-muted-foreground">{results.baseMultiple.toFixed(1)}x</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gap</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(results.valueGap)}</p>
              <p className="text-xs text-muted-foreground">recoverable</p>
            </div>
          </div>
          {results.currentValue === 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Your reported expenses may exceed revenue. Accurate financials will improve this estimate.
            </p>
          )}
          {results.confidenceLevel === 'medium' && results.currentValue > 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Based on available market data for your industry.
            </p>
          )}
          {results.confidenceLevel === 'low' && results.currentValue > 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              As you add more details about your business — especially financials — we&apos;ll be able to provide a more precise estimate of enterprise value.
            </p>
          )}
        </motion.div>
      )}

      {/* Top Tasks — show #1 fully, tease #2 and #3 */}
      {phase >= 3 && results.topTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-5"
        >
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Your #1 Priority
          </h3>
          {/* Task #1 — fully visible */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{results.topTasks[0].title}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[results.topTasks[0].category] || results.topTasks[0].category}
                {results.topTasks[0].estimatedImpact > 0 && ` · ${formatCurrency(results.topTasks[0].estimatedImpact)} potential impact`}
              </p>
            </div>
          </div>
          {/* Tasks #2+ — teased, locked */}
          {results.topTasks.length > 1 && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground text-center">
                + {results.topTasks.length - 1} more prioritized action{results.topTasks.length > 2 ? 's' : ''} identified.{' '}
                <span className="font-medium text-foreground">Create a free account</span> to see your full action plan.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Save / Create Account CTA */}
      {phase >= 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-6"
        >
          {saved ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Account Created!</h3>
              <p className="text-muted-foreground">
                Log in with the email and password you just set.
              </p>
              <Button asChild size="lg" className="mt-2">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground">
                  Save Your Results
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a free account to save your assessment, track progress, and get your full action plan.
                </p>
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                <div>
                  <Label htmlFor="save-email" className="text-xs text-muted-foreground">Email</Label>
                  <Input id="save-email" value={email} disabled className="h-10 bg-muted" />
                </div>
                <div>
                  <Label htmlFor="save-password">Set a Password</Label>
                  <div className="relative">
                    <Input
                      id="save-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <p className="text-sm text-red-500">{saveError}</p>
                )}

                <Button
                  className="w-full h-11 text-base font-medium"
                  onClick={handleSaveResults}
                  disabled={isSaving || !password}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Free Account'
                  )}
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Free plan. No credit card required.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
