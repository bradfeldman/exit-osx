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
import { analytics } from '@/lib/analytics'
import type { LucideIcon } from 'lucide-react'

interface TourStep {
  id: string
  icon: LucideIcon
  badge?: string
  heading: string
  description: string
  hint?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: LayoutDashboard,
    heading: 'Welcome to Your Command Center',
    description:
      'Exit OSx maps every dimension of your company\'s exit readiness — from diagnosis to deal. Here\'s a quick look at what\'s ahead.',
  },
  {
    id: 'value',
    icon: Home,
    badge: 'Mode 1 of 5',
    heading: 'Value',
    description:
      'Your home base. See what your business is worth today, what it could be worth, and the gap between them.',
  },
  {
    id: 'diagnosis',
    icon: FlaskConical,
    badge: 'Mode 2 of 5',
    heading: 'Diagnosis',
    description:
      'Understand how buyers perceive your business across six risk categories. Find where the biggest value gaps live.',
  },
  {
    id: 'actions',
    icon: CircleCheckBig,
    badge: 'Mode 3 of 5',
    heading: 'Actions',
    description:
      'A prioritized action plan built from your diagnosis. Each completed task closes a specific value gap.',
  },
  {
    id: 'evidence',
    icon: FileText,
    badge: 'Mode 4 of 5',
    heading: 'Evidence',
    description:
      'Upload the documents buyers will request during due diligence. Build the proof that backs up your valuation.',
  },
  {
    id: 'deal-room',
    icon: Users,
    badge: 'Mode 5 of 5',
    heading: 'Deal Room',
    description:
      'When you\'re ready to engage buyers, the Deal Room manages secure document sharing, buyer pipeline, and deal activity.',
  },
  {
    id: 'value-modeling',
    icon: Calculator,
    badge: 'Value Modeling',
    heading: 'Financial Modeling Tools',
    description:
      'Upload your Business Financials to unlock advanced tools — DCF Valuation, Retirement Calculator, and Personal Financial Statement.',
    hint: 'Available on Growth and Exit-Ready plans.',
  },
  {
    id: 'capital',
    icon: Landmark,
    badge: 'Capital',
    heading: 'Business Loans',
    description:
      'Explore lending options matched to your business profile. Growth capital, refinancing, or working capital before you sell.',
    hint: 'Unlocks after completing your financials.',
  },
  {
    id: 'ready',
    icon: Rocket,
    heading: "You're Ready",
    description:
      'Start with your first action, explore your diagnosis, or dive into the numbers. Every step moves the needle on your exit value.',
  },
]

interface PlatformTourProps {
  open: boolean
  onComplete: () => void
}

export function PlatformTour({ open, onComplete }: PlatformTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const hasTrackedStart = useRef(false)

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
  const Icon = step.icon

  function handleNext() {
    setDirection(1)
    if (isLast) {
      analytics.track('tour_completed', { stepsViewed: currentStep + 1 })
      onComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handleBack() {
    setDirection(-1)
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  function handleSkip() {
    analytics.track('tour_skipped', { skippedAtStep: currentStep })
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md gap-0 p-0 overflow-hidden"
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 * direction }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full text-center"
            >
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
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
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>

              {/* Hint */}
              {step.hint && (
                <p className="mt-3 text-xs text-muted-foreground/70 italic">
                  {step.hint}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
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
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
