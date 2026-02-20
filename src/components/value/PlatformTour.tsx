'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Home,
  FlaskConical,
  CircleCheckBig,
  FileText,
  Users,
  Calculator,
  Landmark,
  Rocket,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics'
import { useExposure } from '@/contexts/ExposureContext'
import type { LucideIcon } from 'lucide-react'

interface TourStep {
  id: string
  icon: LucideIcon
  badge?: string
  heading: string
  description: string
  hint?: string
  highlightId?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: LayoutDashboard,
    heading: 'Welcome to Your Command Center',
    description:
      'Exit OSx shows you your business exactly as a buyer would see it — what\'s creating value, what\'s leaking value, and how to build toward a successful exit.',
  },
  {
    id: 'value',
    icon: Home,
    badge: 'Mode 1 of 5',
    heading: 'Value',
    description:
      'Your home base. See what your business is worth today, what it could be worth, and the gap between them.',
    highlightId: 'value',
  },
  {
    id: 'diagnosis',
    icon: FlaskConical,
    badge: 'Mode 2 of 5',
    heading: 'Diagnosis',
    description:
      'Understand how buyers perceive your business across six risk categories. Find where the biggest value gaps live.',
    highlightId: 'diagnosis',
  },
  {
    id: 'actions',
    icon: CircleCheckBig,
    badge: 'Mode 3 of 5',
    heading: 'Actions',
    description:
      'A prioritized action plan built from your diagnosis. Each completed task closes a specific value gap.',
    highlightId: 'actions',
  },
  {
    id: 'evidence',
    icon: FileText,
    badge: 'Mode 4 of 5',
    heading: 'Evidence',
    description:
      'Upload the documents buyers will request during due diligence. Build the proof that backs up your valuation.',
    highlightId: 'evidence',
  },
  {
    id: 'deal-room',
    icon: Users,
    badge: 'Mode 5 of 5',
    heading: 'Deal Room',
    description:
      'When you\'re ready to engage buyers, the Deal Room manages secure document sharing, buyer pipeline, and deal activity.',
    highlightId: 'deal-room',
  },
  {
    id: 'value-modeling',
    icon: Calculator,
    badge: 'Value Modeling',
    heading: 'Financial Modeling Tools',
    description:
      'Upload your Business Financials to unlock advanced tools — DCF Valuation, Retirement Calculator, and Personal Financial Statement.',
    hint: 'Available on Growth and Deal Room plans.',
    highlightId: 'value-modeling',
  },
  {
    id: 'capital',
    icon: Landmark,
    badge: 'Capital',
    heading: 'Business Loans',
    description:
      'Explore lending options matched to your business profile. Growth capital, refinancing, or working capital before you sell.',
    hint: 'Unlocks after completing your financials.',
    highlightId: 'capital',
  },
  {
    id: 'first-move',
    icon: Rocket,
    heading: 'See Your First Move',
    description:
      'Your personalized action plan is ready. Each task targets a specific value gap — starting with the highest-impact move.',
  },
]

/* ─── Mini-nav sidebar data ─── */

interface MiniNavItem {
  type: 'link' | 'section-header' | 'sub-item'
  label: string
  icon?: LucideIcon
  highlightId?: string
}

const MINI_NAV: MiniNavItem[] = [
  // Core section
  { type: 'link', label: 'Value', icon: Home, highlightId: 'value' },
  { type: 'link', label: 'Diagnosis', icon: FlaskConical, highlightId: 'diagnosis' },
  { type: 'link', label: 'Actions', icon: CircleCheckBig, highlightId: 'actions' },
  { type: 'link', label: 'Evidence', icon: FileText, highlightId: 'evidence' },
  { type: 'link', label: 'Deal Room', icon: Users, highlightId: 'deal-room' },
  // Value Modeling section
  { type: 'section-header', label: 'VALUE MODELING', highlightId: 'value-modeling' },
  { type: 'sub-item', label: 'Business Financials' },
  { type: 'sub-item', label: 'DCF Valuation' },
  { type: 'sub-item', label: 'Retirement Calculator' },
  // Capital section
  { type: 'section-header', label: 'CAPITAL', highlightId: 'capital' },
  { type: 'sub-item', label: 'Business Loans' },
]

function TourMiniNav({ activeHighlightId }: { activeHighlightId: string }) {
  return (
    <div className="w-[140px] shrink-0 rounded-lg bg-zinc-950/80 dark:bg-zinc-900/80 p-3 flex flex-col gap-0.5 self-center">
      {MINI_NAV.map((item, i) => {
        const isActive = item.highlightId === activeHighlightId

        if (item.type === 'section-header') {
          return (
            <div
              key={i}
              className={`mt-3 first:mt-0 px-2 py-1 text-[9px] font-semibold tracking-wider rounded ${
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-zinc-500'
              }`}
            >
              {item.label}
            </div>
          )
        }

        if (item.type === 'sub-item') {
          return (
            <div
              key={i}
              className="pl-4 py-0.5 text-[10px] text-zinc-600"
            >
              {item.label}
            </div>
          )
        }

        // type === 'link'
        const NavIcon = item.icon!
        return (
          <div
            key={i}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors duration-200 ${
              isActive
                ? 'bg-primary/20 text-primary'
                : 'text-zinc-500'
            }`}
          >
            <NavIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step content (shared between full-width & two-column layouts) ─── */

function StepContent({
  step,
  centered,
}: {
  step: TourStep
  centered: boolean
}) {
  const Icon = step.icon
  return (
    <div className={centered ? 'text-center' : 'text-left'}>
      {/* Icon */}
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ${
          centered ? 'mx-auto' : ''
        }`}
      >
        <Icon className="h-6 w-6 text-primary" />
      </div>

      {/* Badge */}
      {step.badge && (
        <span className="inline-block mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {step.badge}
        </span>
      )}

      {/* Heading */}
      <h2 className="text-xl font-semibold text-foreground mb-3">
        {step.heading}
      </h2>

      {/* Description */}
      <p
        className={`text-sm text-muted-foreground leading-relaxed ${
          centered ? 'max-w-sm mx-auto' : 'max-w-sm'
        }`}
      >
        {step.description}
      </p>

      {/* Hint */}
      {step.hint && (
        <p className="mt-3 text-xs text-muted-foreground/70 italic">
          {step.hint}
        </p>
      )}
    </div>
  )
}

/* ─── Main component ─── */

interface PlatformTourProps {
  open: boolean
  onComplete: () => void
}

export function PlatformTour({ open, onComplete }: PlatformTourProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const hasTrackedStart = useRef(false)
  const { completeTour } = useExposure()

  // Track tour start once when opened (component remounts via key prop)
  useEffect(() => {
    if (open && !hasTrackedStart.current) {
      hasTrackedStart.current = true
      analytics.track('tour_started', {})
    }
  }, [open])

  const step = TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOUR_STEPS.length - 1
  const showMiniNav = !!step.highlightId

  async function handleNext() {
    setDirection(1)
    if (isLast) {
      analytics.track('tour_completed', { stepsViewed: currentStep + 1 })
      await completeTour()
      onComplete()
      router.push('/dashboard/action-center')
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handleBack() {
    setDirection(-1)
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  async function handleSkip() {
    analytics.track('tour_skipped', { skippedAtStep: currentStep })
    await completeTour()
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent
        showCloseButton={false}
        className={`gap-0 p-0 overflow-hidden ${
          showMiniNav ? 'sm:max-w-xl' : 'sm:max-w-md'
        }`}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Hidden accessible title */}
        <DialogTitle className="sr-only">Platform Tour</DialogTitle>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-6 pb-2 px-6">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                    ? 'w-1.5 bg-primary/60'
                    : 'w-1.5 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 pt-4 pb-2 min-h-[280px] flex items-center">
          {showMiniNav ? (
            /* Two-column layout: mini-nav + step content */
            <div className="flex gap-5 w-full items-center">
              <TourMiniNav activeHighlightId={step.highlightId!} />
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 * direction }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 * direction }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="w-full"
                  >
                    <StepContent step={step} centered={false} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Full-width centered layout for welcome & ready steps */
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 * direction }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full"
              >
                <StepContent step={step} centered={true} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
          <div>
            {isFirst ? (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip tour
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <Button size="sm" onClick={handleNext}>
            {isLast ? 'See Your First Move' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
