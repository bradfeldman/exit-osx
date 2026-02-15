/**
 * useCountUp - Animated number counting hook
 * Creates dramatic number counting animations for dashboard metrics
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency'

interface UseCountUpOptions {
  /** Starting value (default: 0) */
  start?: number
  /** Target value to count to */
  end: number
  /** Animation duration in milliseconds (default: 2000) */
  duration?: number
  /** Decimal places to show (default: 0) */
  decimals?: number
  /** Whether to add commas as thousands separator (default: true) */
  separator?: boolean
  /** Prefix to add (e.g., '$') */
  prefix?: string
  /** Suffix to add (e.g., '%', 'K', 'M') */
  suffix?: string
  /** Easing function (default: easeOutExpo for dramatic effect) */
  easing?: 'linear' | 'easeOut' | 'easeOutExpo' | 'easeOutBack'
  /** Delay before starting animation in ms (default: 0) */
  delay?: number
  /** Whether to animate (set false to disable) */
  enabled?: boolean
  /** Callback when animation completes */
  onComplete?: () => void
}

interface UseCountUpReturn {
  /** Current formatted value */
  value: string
  /** Current raw numeric value */
  rawValue: number
  /** Whether animation is in progress */
  isAnimating: boolean
  /** Restart the animation */
  restart: () => void
  /** Animation progress (0-1) */
  progress: number
}

// Easing functions for different animation feels
const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

// Check for reduced motion preference (memoized)
function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
  separator = true,
  prefix = '',
  suffix = '',
  easing = 'easeOutExpo',
  delay = 0,
  enabled = true,
  onComplete,
}: UseCountUpOptions): UseCountUpReturn {
  // Determine initial value based on enabled state
  const shouldAnimate = enabled && !checkReducedMotion()
  const initialValue = shouldAnimate ? start : end

  const [rawValue, setRawValue] = useState(initialValue)
  const [isAnimating, setIsAnimating] = useState(false)
  const [progress, setProgress] = useState(shouldAnimate ? 0 : 1)
  const [restartKey, setRestartKey] = useState(0)

  const animationRef = useRef<number | null>(null)

  const formatValue = useCallback(
    (value: number): string => {
      let formatted = value.toFixed(decimals)

      if (separator) {
        const parts = formatted.split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        formatted = parts.join('.')
      }

      return `${prefix}${formatted}${suffix}`
    },
    [decimals, separator, prefix, suffix]
  )

  const restart = useCallback(() => {
    setRestartKey((k) => k + 1)
  }, [])

  // Animation effect
  useEffect(() => {
    // Early return for disabled or reduced motion - don't set state here
    if (!enabled || checkReducedMotion()) {
      return
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Reset state for animation
    let hasCompleted = false
    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp
        // Set initial state at the start of animation
        setRawValue(start)
        setProgress(0)
        setIsAnimating(true)
      }

      const elapsed = timestamp - startTime
      const rawProgress = Math.min(elapsed / duration, 1)
      const easedProgress = easingFunctions[easing](rawProgress)

      const currentValue = start + (end - start) * easedProgress

      setRawValue(currentValue)
      setProgress(rawProgress)

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        setRawValue(end)
        setProgress(1)

        if (!hasCompleted) {
          hasCompleted = true
          onComplete?.()
        }
      }
    }

    // Start animation after delay
    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [end, start, duration, easing, delay, enabled, restartKey, onComplete])

  // For disabled state, return static values
  const finalRawValue = (!enabled || checkReducedMotion()) ? end : rawValue
  const finalProgress = (!enabled || checkReducedMotion()) ? 1 : progress
  const finalIsAnimating = (!enabled || checkReducedMotion()) ? false : isAnimating

  return {
    value: formatValue(finalRawValue),
    rawValue: finalRawValue,
    isAnimating: finalIsAnimating,
    restart,
    progress: finalProgress,
  }
}

/**
 * Hook for formatting currency values with animation
 */
export function useCountUpCurrency(
  value: number,
  options?: Omit<UseCountUpOptions, 'end' | 'prefix'>
): UseCountUpReturn {
  // Determine suffix based on value magnitude
  const { displayValue, suffix, decimals } = useMemo(() => {
    let dv = value
    let s = ''

    if (value >= 1_000_000_000) {
      dv = value / 1_000_000_000
      s = 'B'
    } else if (value >= 1_000_000) {
      dv = value / 1_000_000
      s = 'M'
    } else if (value >= 10_000) {
      dv = value / 1_000
      s = 'K'
    }

    return { displayValue: dv, suffix: s, decimals: s ? 1 : 0 }
  }, [value])

  return useCountUp({
    end: displayValue,
    prefix: '$',
    suffix,
    decimals,
    duration: 1800,
    easing: 'easeOutExpo',
    ...options,
  })
}

/**
 * Hook for percentage values with animation
 */
export function useCountUpPercent(
  value: number,
  options?: Omit<UseCountUpOptions, 'end' | 'suffix'>
): UseCountUpReturn {
  return useCountUp({
    end: value,
    suffix: '%',
    decimals: 0,
    duration: 1500,
    easing: 'easeOutExpo',
    ...options,
  })
}

/**
 * Hook for score values (0-100) with animation
 */
export function useCountUpScore(
  value: number,
  options?: Omit<UseCountUpOptions, 'end'>
): UseCountUpReturn {
  return useCountUp({
    end: value,
    decimals: 0,
    duration: 1500,
    easing: 'easeOutBack',
    ...options,
  })
}

export default useCountUp
