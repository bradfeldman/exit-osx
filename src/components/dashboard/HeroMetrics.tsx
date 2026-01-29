'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useCountUpCurrency, useCountUpScore } from '@/hooks/useCountUp'

// Hook to detect if we're on the client
const emptySubscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

interface HeroMetricsProps {
  currentValue: number
  potentialValue: number
  valueGap: number
  marketPremium: number
  briScore: number | null
  coreScore: number | null
  personalReadinessScore: number | null
  isEstimated?: boolean
  isPreviewMode?: boolean
  isAbovePotential?: boolean
  hasAssessment?: boolean
}

type HoverState = null | 'valueGap' | 'bri' | 'coreIndex' | 'personalReadiness'

const descriptions: Record<Exclude<HoverState, null>, { title: string; description: string }> = {
  valueGap: {
    title: "Value Gap",
    description: "The difference between your current market value and maximum achievable value. Closing this gap is the focus of your playbook tasks.",
  },
  bri: {
    title: "Buyer Readiness Index",
    description: "Measures how prepared your business is for acquisition across 6 categories: Financial, Transferability, Operational, Market, Legal/Tax, and Personal.",
  },
  coreIndex: {
    title: "Core Index",
    description: "Reflects structural business factors: revenue size, revenue model, gross margin, labor intensity, asset intensity, and owner involvement.",
  },
  personalReadiness: {
    title: "Personal Readiness",
    description: "Measures your personal preparedness to exit: clarity on timeline, separation of personal and business assets, and key employee awareness of transition plans.",
  },
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function getBriColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

function getCoreIndexColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

// Animated value display component
function AnimatedValue({
  value,
  delay = 0,
  className = '',
}: {
  value: number
  delay?: number
  className?: string
}) {
  const { value: displayValue, isAnimating } = useCountUpCurrency(value, {
    delay,
    duration: 1800,
  })

  return (
    <motion.span
      className={className}
      animate={!isAnimating ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  )
}

// Animated score display component
function AnimatedScore({
  value,
  delay = 0,
  className = '',
}: {
  value: number
  delay?: number
  className?: string
}) {
  const { value: displayValue, isAnimating } = useCountUpScore(value, {
    delay,
    duration: 1500,
  })

  return (
    <motion.span
      className={className}
      animate={!isAnimating ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  )
}

// Metric card with animation
function MetricCard({
  children,
  index,
  isHovered,
  onHover,
  onLeave,
  href,
  className = '',
  isPreviewMode = false,
}: {
  children: React.ReactNode
  index: number
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  href?: string
  className?: string
  isPreviewMode?: boolean
}) {
  const content = (
    <motion.div
      className={`text-center p-4 md:p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-center cursor-pointer ${
        isHovered ? 'border-[#B87333] shadow-md' : 'border-gray-100'
      } ${isPreviewMode ? 'opacity-60' : ''} ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.1 + index * 0.08,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 24px -8px rgba(61, 61, 61, 0.15)',
        borderColor: 'rgba(184, 115, 51, 0.3)',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} className="h-full">
        {content}
      </Link>
    )
  }

  return content
}

export function HeroMetrics({
  currentValue,
  potentialValue,
  valueGap,
  marketPremium,
  briScore,
  coreScore,
  personalReadinessScore,
  isEstimated = false,
  isPreviewMode = false,
  isAbovePotential = false,
  hasAssessment = true
}: HeroMetricsProps) {
  const [hoveredCard, setHoveredCard] = useState<HoverState>(null)
  const isClient = useIsClient()

  return (
    <div className="pt-1 pb-8 md:pb-12">
      {/* Two-column layout: Market Value on left, 4 metrics on right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Primary KPI - Estimated Market Value (or description on hover) */}
        <motion.div
          className={`relative flex items-center justify-center p-10 md:p-16 rounded-2xl shadow-2xl overflow-hidden min-h-[280px] md:min-h-[320px] ${
            isAbovePotential ? 'bg-amber-600 ring-4 ring-amber-500/30' :
            isPreviewMode ? 'bg-[#B87333] ring-4 ring-[#B87333]/30' : 'bg-gradient-to-br from-[#3D3D3D] to-[#2A2A2A]'
          }`}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {/* Animated gradient glow effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              boxShadow: isPreviewMode
                ? 'inset 0 0 80px rgba(255, 255, 255, 0.15)'
                : 'inset 0 0 80px rgba(184, 115, 51, 0.15)',
            }}
            transition={{ duration: 0.3 }}
          />
          {/* Decorative corner accents */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#B87333]/30 rounded-tl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#B87333]/30 rounded-br-lg" />

          <AnimatePresence mode="wait">
            {hoveredCard ? (
              <motion.div
                key="description"
                className="text-center relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm font-medium text-[#B87333] uppercase tracking-wide mb-3">
                  {descriptions[hoveredCard].title}
                </p>
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                  {descriptions[hoveredCard].description}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="value"
                className="text-center relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {!hasAssessment && !isPreviewMode && !isAbovePotential ? (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-sm md:text-base font-semibold uppercase tracking-widest text-[#B87333]">
                      Industry Preview
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium bg-white/20 text-white/90 rounded-full">
                      Based on averages
                    </span>
                  </div>
                ) : (
                  <p className={`text-sm md:text-base font-semibold uppercase tracking-widest mb-2 ${
                    isAbovePotential ? 'text-white' : isPreviewMode ? 'text-white/90' : 'text-[#B87333]'
                  }`}>
                    {isAbovePotential ? 'Premium to Market' : isPreviewMode ? 'Preview: Market Value' : 'Estimated Market Value'}
                  </p>
                )}
                {!isPreviewMode && !isAbovePotential && (
                  <p className="text-xs md:text-sm text-gray-400 mb-4">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                {isPreviewMode && !isAbovePotential && (
                  <p className="text-xs md:text-sm text-white/70 mb-4">
                    Based on selected multiple
                  </p>
                )}
                {isAbovePotential && (
                  <p className="text-xs md:text-sm text-white/80 mb-4">
                    DCF valuation exceeds industry benchmarks
                  </p>
                )}
                <motion.h1
                  className={`text-hero-lg text-white drop-shadow-lg ${
                    isPreviewMode ? 'scale-105' : ''
                  }`}
                  key={isPreviewMode ? 'preview' : 'normal'}
                  initial={isPreviewMode ? false : { opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 100,
                    damping: 12,
                  }}
                >
                  {isPreviewMode ? (
                    // During slider drag, show value directly without animation
                    formatCurrency(currentValue)
                  ) : isClient ? (
                    <AnimatedValue value={currentValue} delay={200} />
                  ) : (
                    formatCurrency(currentValue)
                  )}
                </motion.h1>
                {isEstimated && !isPreviewMode && (
                  <motion.p
                    className={`mt-4 max-w-xs mx-auto ${!hasAssessment ? 'text-sm text-white/80' : 'text-xs text-[#B87333]'}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    {!hasAssessment ? (
                      <>
                        This is what similar businesses sell for.
                        <br />
                        <span className="text-[#B87333] font-medium">Your number could be higher.</span>
                      </>
                    ) : (
                      <>
                        Based on Adjusted EBITDA
                        <br />
                        Complete assessment to see risk-adjusted value
                      </>
                    )}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right: 2x2 grid of secondary KPIs */}
        <div className="grid grid-cols-2 gap-4">
          {/* Value Gap */}
          <MetricCard
            index={0}
            isHovered={hoveredCard === 'valueGap'}
            onHover={() => setHoveredCard('valueGap')}
            onLeave={() => setHoveredCard(null)}
            className={`h-full ${isAbovePotential ? 'ring-2 ring-emerald-500/50' : isPreviewMode ? 'ring-2 ring-[#B87333]/50' : ''}`}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {hasAssessment ? (isAbovePotential ? 'Market Premium' : isPreviewMode ? 'Preview: Value Gap' : 'Value Gap') : 'Hidden Value'}
            </p>
            {hasAssessment ? (
              <p className={`text-2xl md:text-3xl font-semibold transition-all ${
                isAbovePotential ? 'text-emerald-600' : isPreviewMode ? 'text-[#B87333]' : 'text-[#3D3D3D]'
              }`}>
                {isAbovePotential ? (
                  // Show market premium when DCF exceeds potential
                  isClient && marketPremium > 0 ? (
                    <AnimatedValue value={marketPremium} delay={300} />
                  ) : (
                    formatCurrency(marketPremium)
                  )
                ) : isPreviewMode ? (
                  // During slider drag, show value directly without animation
                  formatCurrency(valueGap)
                ) : isClient && valueGap !== 0 ? (
                  <AnimatedValue value={valueGap} delay={300} />
                ) : (
                  formatCurrency(valueGap)
                )}
              </p>
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-semibold text-amber-500">
                  $???
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Discover your potential
                </p>
              </>
            )}
            {hasAssessment && (
              <p className="text-xs text-muted-foreground mt-1">
                {isAbovePotential
                  ? `Above industry max of ${formatCurrency(potentialValue)}`
                  : `Max EV: ${formatCurrency(potentialValue)}`}
              </p>
            )}
          </MetricCard>

          {/* BRI */}
          <MetricCard
            index={1}
            isHovered={hoveredCard === 'bri'}
            onHover={() => setHoveredCard('bri')}
            onLeave={() => setHoveredCard(null)}
            href={briScore === null ? "/dashboard/assessment/risk" : undefined}
            isPreviewMode={isPreviewMode}
            className="h-full"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Buyer Readiness Index
            </p>
            {briScore !== null ? (
              <>
                <p className={`text-2xl md:text-3xl font-semibold ${getBriColor(briScore)}`}>
                  {isClient ? (
                    <AnimatedScore value={briScore} delay={400} />
                  ) : (
                    briScore
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPreviewMode ? 'Assessment-based' : 'Scale: 0 - 100'}
                </p>
              </>
            ) : (
              <>
                <motion.p
                  className="text-2xl md:text-3xl font-semibold text-primary"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ?
                </motion.p>
                <p className="text-xs text-primary font-medium mt-1">
                  How do buyers see you?
                </p>
              </>
            )}
          </MetricCard>

          {/* Core Index */}
          <MetricCard
            index={2}
            isHovered={hoveredCard === 'coreIndex'}
            onHover={() => setHoveredCard('coreIndex')}
            onLeave={() => setHoveredCard(null)}
            href="/dashboard/assessment/company"
            isPreviewMode={isPreviewMode}
            className="h-full"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Core Index
            </p>
            {coreScore !== null ? (
              <>
                <p className={`text-2xl md:text-3xl font-semibold ${getCoreIndexColor(coreScore)}`}>
                  {isClient ? (
                    <AnimatedScore value={coreScore} delay={500} />
                  ) : (
                    coreScore
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scale: 0 - 100
                </p>
              </>
            ) : (
              <>
                <motion.p
                  className="text-2xl md:text-3xl font-semibold text-primary/70"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  ?
                </motion.p>
                <p className="text-xs text-primary/70 mt-1">
                  Unlock your score
                </p>
              </>
            )}
          </MetricCard>

          {/* Personal Readiness */}
          <MetricCard
            index={3}
            isHovered={hoveredCard === 'personalReadiness'}
            onHover={() => setHoveredCard('personalReadiness')}
            onLeave={() => setHoveredCard(null)}
            href="/dashboard/assessment/personal-readiness"
            isPreviewMode={isPreviewMode}
            className="h-full"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Personal Readiness
            </p>
            {personalReadinessScore !== null ? (
              <>
                <p className={`text-2xl md:text-3xl font-semibold ${getBriColor(personalReadinessScore)}`}>
                  {isClient ? (
                    <AnimatedScore value={personalReadinessScore} delay={600} />
                  ) : (
                    personalReadinessScore
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scale: 0 - 100
                </p>
              </>
            ) : (
              <>
                <motion.p
                  className="text-2xl md:text-3xl font-semibold text-primary/70"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                >
                  ?
                </motion.p>
                <p className="text-xs text-primary/70 mt-1">
                  Are you ready?
                </p>
              </>
            )}
          </MetricCard>
        </div>
      </div>
    </div>
  )
}
