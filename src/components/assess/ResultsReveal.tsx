'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { motion } from '@/lib/motion'
import { TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { ScoreGauge } from './ScoreGauge'
import { SoftEmailCapture } from './SoftEmailCapture'
import { AccountGate } from './AccountGate'
import { MethodologyPanel } from './MethodologyPanel'
import type { BusinessBasicsData } from './BusinessBasicsStep'
import type { BusinessProfileData } from './BusinessProfileStep'
import type { BuyerScanData } from './BuyerScanStep'

// ---------------------------------------------------------------------------
// Types (exported for use by AccountGate and AssessmentFlow)
// ---------------------------------------------------------------------------

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
  basics: BusinessBasicsData
  profile: BusinessProfileData
  scan: BuyerScanData
  industryName?: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

// Phase timings (ms from mount)
const PHASE_TIMINGS = {
  BRI: 0,           // Phase 2: immediate
  VALUATION: 2200,  // Phase 3: 1200ms counter + 1000ms pause
  RISK: 3200,       // Phase 4: +1000ms
  EMAIL: 4700,      // Phase 5: +1500ms
  GATE: 5200,       // Phase 6: +500ms
}

// ---------------------------------------------------------------------------
// Reduced motion hook
// ---------------------------------------------------------------------------

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}
function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResultsReveal({
  results,
  basics,
  profile,
  scan,
  industryName,
}: ResultsRevealProps) {
  // Phase state: 2=BRI, 3=valuation, 4=risk, 5=email, 6=gate
  const [phase, setPhase] = useState(2)
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const gateRef = useRef<HTMLDivElement>(null)

  // When reduced motion is on, show all phases immediately (derived, no setState needed)
  const effectivePhase = reducedMotion ? 6 : phase

  // Phased reveal (only runs when animations are enabled)
  useEffect(() => {
    if (reducedMotion) return

    const timers = [
      setTimeout(() => setPhase(3), PHASE_TIMINGS.VALUATION),
      setTimeout(() => setPhase(4), PHASE_TIMINGS.RISK),
      setTimeout(() => setPhase(5), PHASE_TIMINGS.EMAIL),
      setTimeout(() => setPhase(6), PHASE_TIMINGS.GATE),
    ]
    return () => timers.forEach(clearTimeout)
  }, [reducedMotion])

  // Find top risk category
  const topRisk = Object.entries(results.categoryBreakdown)
    .filter(([cat]) => cat !== 'PERSONAL')
    .sort(([, a], [, b]) => a - b)[0]

  const topRiskLabel = topRisk ? (CATEGORY_LABELS[topRisk[0]] || topRisk[0]) : null
  const topRiskScore = topRisk ? topRisk[1] : null

  const handleEmailCaptured = (email: string) => {
    setCapturedEmail(email)
  }

  const handleEmailSkip = () => {
    gateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="min-h-[100dvh] py-12 px-4 sm:px-6"
      style={{
        background: 'linear-gradient(to bottom, #F5F5F7, #FFFFFF)',
      }}
    >
      <div className="max-w-[540px] mx-auto space-y-8">
        {/* Phase 2: BRI Score + ScoreGauge */}
        <ScoreGauge score={results.briScore} industryName={industryName} />

        {/* Phase 3: Valuation Range */}
        {effectivePhase >= 3 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Valuation Estimate
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {formatCurrency(results.currentValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {results.finalMultiple.toFixed(1)}x
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potential</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(results.potentialValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {results.baseMultiple.toFixed(1)}x
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gap</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-700">
                  {formatCurrency(results.valueGap)}
                </p>
                <p className="text-xs text-muted-foreground">recoverable</p>
              </div>
            </div>

            {results.currentValue === 0 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Your reported expenses may exceed revenue. Accurate financials
                will improve this estimate.
              </p>
            )}
            {results.confidenceLevel === 'medium' &&
              results.currentValue > 0 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Based on available market data for your industry.
                </p>
              )}
            {results.confidenceLevel === 'low' &&
              results.currentValue > 0 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  As you add more details about your business &mdash; especially
                  financials &mdash; we&apos;ll provide a more precise estimate.
                </p>
              )}

            {/* Methodology link */}
            <button
              onClick={() => setMethodologyOpen(true)}
              className="mt-3 mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              How we calculated this
            </button>
          </motion.div>
        )}

        {/* Phase 4: Top Risk */}
        {effectivePhase >= 4 && topRiskLabel && topRiskScore !== null && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Your #1 Risk Area
            </h3>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  backgroundColor:
                    topRiskScore < 0.5 ? '#FEF2F2' : '#FFFBEB',
                  color: topRiskScore < 0.5 ? '#EF4444' : '#F59E0B',
                }}
              >
                {Math.round(topRiskScore * 100)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">
                  {topRiskLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topRiskScore < 0.5
                    ? 'Buyers will flag this in due diligence'
                    : 'Room for improvement to close the value gap'}
                </p>
              </div>
            </div>

            {/* Teased additional tasks */}
            {results.topTasks.length > 0 && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground text-center">
                  {results.topTasks.length} prioritized action
                  {results.topTasks.length !== 1 ? 's' : ''} identified.{' '}
                  <span className="font-medium text-foreground">
                    Create a free account
                  </span>{' '}
                  to see your full action plan.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Phase 5: Soft Email Capture */}
        {effectivePhase >= 5 && (
          <SoftEmailCapture
            onEmailCaptured={handleEmailCaptured}
            onSkip={handleEmailSkip}
            assessmentData={{
              briScore: results.briScore,
              currentValue: results.currentValue,
              potentialValue: results.potentialValue,
              topRisk: topRiskLabel ?? undefined,
            }}
          />
        )}

        {/* Phase 6: Account Gate */}
        {effectivePhase >= 6 && (
          <div ref={gateRef}>
            <AccountGate
              prefillEmail={capturedEmail}
              results={results}
              basics={basics}
              profile={profile}
              scan={scan}
              onAccountCreated={() => {}}
            />
          </div>
        )}
      </div>

      {/* Methodology Panel */}
      <MethodologyPanel
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
        industryName={industryName}
        multipleRange={
          results.baseMultiple && results.finalMultiple
            ? { low: results.finalMultiple, high: results.baseMultiple }
            : undefined
        }
        briScore={results.briScore}
      />
    </div>
  )
}
