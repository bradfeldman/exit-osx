'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from '@/lib/motion'

interface ScoreGaugeProps {
  score: number
  industryName?: string | null
}

function getScoreTier(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 85) return { label: 'Strong', color: '#22C55E', bgColor: '#F0FDF4' }
  if (score >= 70) return { label: 'Solid foundation', color: '#3B82F6', bgColor: '#EFF6FF' }
  if (score >= 55) return { label: 'Typical', color: '#F59E0B', bgColor: '#FFFBEB' }
  return { label: 'Early stage', color: '#EF4444', bgColor: '#FEF2F2' }
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function ScoreGauge({ score, industryName }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const reducedMotion = useReducedMotion()
  const animationRef = useRef<number | null>(null)
  const tier = getScoreTier(score)

  // Animated counter: 0 → score over 1200ms cubic ease-out
  useEffect(() => {
    if (reducedMotion) {
      setDisplayScore(score)
      return
    }

    const duration = 1200
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Cubic ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick)
      }
    }

    animationRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [score, reducedMotion])

  // SVG arc parameters — 180-degree semi-circle
  const cx = 140
  const cy = 130
  const r = 110
  const strokeWidth = 18
  // Arc from 180° (left) to 0° (right)
  const startAngle = Math.PI // left
  const endAngle = 0 // right
  const circumference = Math.PI * r // half-circle circumference

  // Background track path
  const trackD = describeArc(cx, cy, r, startAngle, endAngle)
  // Filled arc — proportion of score
  const fillFraction = Math.max(0, Math.min(1, displayScore / 100))
  const fillAngle = startAngle - fillFraction * Math.PI
  const fillD = fillFraction > 0 ? describeArc(cx, cy, r, startAngle, fillAngle) : ''

  // Gradient ID
  const gradientId = 'score-gauge-gradient'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="text-center"
      aria-live="polite"
      role="status"
    >
      {/* SVG Gauge */}
      <div className="relative mx-auto" style={{ width: 280, height: 160 }}>
        <svg
          viewBox="0 0 280 160"
          width={280}
          height={160}
          aria-hidden="true"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="33%" stopColor="#F59E0B" />
              <stop offset="66%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d={trackD}
            fill="none"
            stroke="var(--border, #E5E7EB)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled arc */}
          {fillD && (
            <path
              d={fillD}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Score number overlaid on gauge */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end"
          style={{ paddingBottom: 4 }}
        >
          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: 72,
              color: tier.color,
            }}
          >
            {displayScore}
          </span>
          <span
            className="text-base text-muted-foreground mt-0.5"
            style={{ fontSize: 16 }}
          >
            out of 100
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="text-sm font-semibold mt-3" style={{ color: 'var(--accent, #3B82F6)' }}>
        Buyer Readiness Index
      </p>

      {/* Qualitative tier badge */}
      <span
        className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium"
        style={{ color: tier.color, backgroundColor: tier.bgColor }}
      >
        {tier.label}
      </span>

      {/* Industry context */}
      <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
        Based on 8 buyer confidence factors
        {industryName ? ` for ${industryName} businesses` : ''}
      </p>

      {/* Screen reader announcement */}
      <span className="sr-only">
        Your Buyer Readiness Index score is {score} out of 100, rated as {tier.label}.
      </span>
    </motion.div>
  )
}

/** Describe an SVG arc path from startAngle to endAngle (radians, 0=right, PI=left) */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy - r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy - r * Math.sin(endAngle)

  // For a semi-circle (180°), use large arc flag = 1
  const angleDiff = Math.abs(startAngle - endAngle)
  const largeArcFlag = angleDiff > Math.PI ? 1 : 0
  // Sweep flag: 0 = counter-clockwise (top arc)
  const sweepFlag = 0

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`
}
