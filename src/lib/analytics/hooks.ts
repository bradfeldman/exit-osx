/**
 * React Hooks for Analytics
 * Provides easy integration with React components
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { analytics, track } from './index'
import type { AnalyticsEventMap, AnalyticsEventName } from './types'

// =============================================================================
// CORE HOOKS
// =============================================================================

/**
 * Initialize analytics on mount
 * Use this in your root layout or _app
 */
export function useAnalyticsInit(): void {
  useEffect(() => {
    analytics.initialize()
  }, [])
}

/**
 * Track page views automatically
 * Use this in page components
 */
export function usePageView(
  pageName: string,
  params?: Record<string, unknown>
): void {
  useEffect(() => {
    analytics.trackPageView(pageName, params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName])
}

/**
 * Get the track function with proper typing
 */
export function useTrack() {
  return useCallback(
    <T extends AnalyticsEventName>(
      eventName: T,
      params: Omit<AnalyticsEventMap[T], keyof import('./types').BaseEventParams>
    ) => {
      track(eventName, params)
    },
    []
  )
}

// =============================================================================
// TIMING HOOKS
// =============================================================================

/**
 * Track time spent on a component/page
 * Automatically tracks time when component unmounts
 */
export function useTimeOnPage(
  eventName: AnalyticsEventName,
  additionalParams?: Record<string, unknown>
): void {
  const mountTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    mountTimeRef.current = Date.now()

    return () => {
      const timeSpent = Date.now() - mountTimeRef.current
      track(eventName, {
        duration: timeSpent,
        ...additionalParams,
      } as Parameters<typeof track>[1])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName])
}

/**
 * Create a timer that can be started/stopped manually
 */
export function useTimer(name: string) {
  const start = useCallback(() => {
    analytics.startTimer(name)
  }, [name])

  const stop = useCallback(() => {
    return analytics.getElapsedTime(name)
  }, [name])

  const clear = useCallback(() => {
    analytics.clearTimer(name)
  }, [name])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      analytics.clearTimer(name)
    }
  }, [name])

  return { start, stop, clear }
}

// =============================================================================
// FORM TRACKING HOOKS
// =============================================================================

interface FormTrackingOptions {
  formId: string
  onFieldFocus?: (fieldName: string) => void
  onFieldBlur?: (fieldName: string, timeSpent: number) => void
  onFieldError?: (fieldName: string, error: string) => void
}

/**
 * Track form interactions
 * Returns handlers to attach to form fields
 */
export function useFormTracking(options: FormTrackingOptions) {
  const { formId } = options
  const fieldTimers = useRef<Map<string, number>>(new Map())
  const fieldOrder = useRef<number>(0)
  const focusedFields = useRef<Set<string>>(new Set())
  const formStartTime = useRef<number>(0)

  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      const isFirstFocus = !focusedFields.current.has(fieldName)
      focusedFields.current.add(fieldName)
      fieldOrder.current++

      fieldTimers.current.set(fieldName, Date.now())

      track('form_field_focus', {
        formId,
        fieldName,
        fieldOrder: fieldOrder.current,
        isFirstFocus,
      })

      options.onFieldFocus?.(fieldName)
    },
    [formId, options]
  )

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      const startTime = fieldTimers.current.get(fieldName)
      if (startTime) {
        const timeSpent = Date.now() - startTime
        fieldTimers.current.delete(fieldName)

        track('form_field_time', {
          formId,
          fieldName,
          timeSpent,
        })

        options.onFieldBlur?.(fieldName, timeSpent)
      }
    },
    [formId, options]
  )

  const handleFieldError = useCallback(
    (fieldName: string, errorType: string, errorMessage: string) => {
      track('form_field_error', {
        formId,
        fieldName,
        errorType,
        errorMessage,
      })

      options.onFieldError?.(fieldName, errorMessage)
    },
    [formId, options]
  )

  const trackAbandonment = useCallback(
    (lastFieldTouched: string) => {
      track('form_abandonment', {
        formId,
        lastFieldTouched,
        fieldsCompleted: focusedFields.current.size,
        totalFields: 0, // Caller should provide this
        timeOnForm: Date.now() - formStartTime.current,
      })
    },
    [formId]
  )

  // Track abandonment on unmount if form wasn't submitted
  const wasSubmitted = useRef(false)

  const markSubmitted = useCallback(() => {
    wasSubmitted.current = true
  }, [])

  useEffect(() => {
    formStartTime.current = Date.now()

    return () => {
      if (!wasSubmitted.current && focusedFields.current.size > 0) {
        const lastField = Array.from(focusedFields.current).pop() || 'unknown'
        trackAbandonment(lastField)
      }
    }
  }, [trackAbandonment])

  return {
    handleFieldFocus,
    handleFieldBlur,
    handleFieldError,
    markSubmitted,
    getFormStartTime: () => formStartTime.current,
    getFieldsCompleted: () => focusedFields.current.size,
  }
}

// =============================================================================
// SCROLL TRACKING HOOKS
// =============================================================================

/**
 * Track scroll depth on a page
 * Automatically cleans up on unmount
 * Returns the max scroll depth reached
 */
export function useScrollDepthTracking(
  pageId?: string,
  onMilestone?: (depth: number) => void
): { maxDepth: number } {
  const [maxDepth, setMaxDepth] = useState(0)

  useEffect(() => {
    const handleMilestone = (depth: number) => {
      setMaxDepth(current => Math.max(current, depth))
      onMilestone?.(depth)
    }

    const cleanup = analytics.trackScrollDepth(handleMilestone)
    return cleanup
  }, [pageId, onMilestone])

  return { maxDepth }
}

// =============================================================================
// VIEWPORT TRACKING HOOKS
// =============================================================================

interface ViewportTrackingResult {
  ref: React.RefObject<HTMLElement | null>
  isVisible: boolean
  timeVisible: number
}

/**
 * Track when an element is visible in the viewport
 */
export function useViewportTracking(
  onVisibilityChange?: (isVisible: boolean, timeVisible: number) => void
): ViewportTrackingResult {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [timeVisible, setTimeVisible] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const cleanup = analytics.trackElementVisibility(
      element,
      (visible, time) => {
        setIsVisible(visible)
        setTimeVisible(time)
        onVisibilityChange?.(visible, time)
      }
    )

    return cleanup
  }, [onVisibilityChange])

  return {
    ref,
    isVisible,
    timeVisible,
  }
}

interface CtaTrackingOptions {
  ctaId: string
  ctaText: string
  ctaType?: 'primary' | 'secondary' | 'tertiary'
  destination: string
  onVisible?: () => void
}

interface CtaTrackingResult {
  ref: React.RefObject<HTMLDivElement | null>
  handleClick: () => void
  trackClick: (ctaType: 'primary' | 'secondary' | 'tertiary', destination: string) => void
}

/**
 * Track CTA visibility and interactions
 * Supports both simple (ctaId, ctaText) and config object patterns
 */
export function useCtaTracking(
  ctaIdOrOptions: string | CtaTrackingOptions,
  ctaText?: string
): CtaTrackingResult {
  // Normalize arguments to options object
  const options: CtaTrackingOptions = typeof ctaIdOrOptions === 'string'
    ? { ctaId: ctaIdOrOptions, ctaText: ctaText || '', destination: '' }
    : ctaIdOrOptions

  const { ctaId, ctaText: text, ctaType = 'primary', destination, onVisible } = options

  const ref = useRef<HTMLDivElement>(null)
  const hoverStartRef = useRef<number | null>(null)
  const visibilityStartRef = useRef<number | null>(null)
  const hasTrackedVisibility = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Track visibility
    const visibilityCleanup = analytics.trackElementVisibility(
      element,
      (isVisible) => {
        if (isVisible && !hasTrackedVisibility.current) {
          hasTrackedVisibility.current = true
          visibilityStartRef.current = Date.now()

          const pageLoadTime = performance.timing?.navigationStart || Date.now()
          track('cta_visibility', {
            ctaId,
            ctaText: text,
            timeToVisible: Date.now() - pageLoadTime,
            viewportPosition: element.getBoundingClientRect().top < window.innerHeight / 2
              ? 'above_fold'
              : 'below_fold',
          })

          // Call onVisible callback for parent tracking
          onVisible?.()
        }
      }
    )

    // Track hover
    const handleMouseEnter = () => {
      hoverStartRef.current = Date.now()
    }

    const handleMouseLeave = () => {
      if (hoverStartRef.current) {
        const hoverDuration = Date.now() - hoverStartRef.current
        // Only track if they hovered for a meaningful amount of time
        if (hoverDuration > 100) {
          track('cta_hover', {
            ctaId,
            ctaText: text,
            hoverDuration,
          })
        }
        hoverStartRef.current = null
      }
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      visibilityCleanup()
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [ctaId, text, onVisible])

  // Simple click handler using options
  const handleClick = useCallback(() => {
    track('cta_click', {
      ctaId,
      ctaText: text,
      ctaType,
      destination,
    })
  }, [ctaId, text, ctaType, destination])

  // Legacy click handler for manual specification
  const trackClick = useCallback(
    (clickCtaType: 'primary' | 'secondary' | 'tertiary', clickDestination: string) => {
      track('cta_click', {
        ctaId,
        ctaText: text,
        ctaType: clickCtaType,
        destination: clickDestination,
      })
    },
    [ctaId, text]
  )

  return { ref, handleClick, trackClick }
}

// =============================================================================
// EXIT INTENT HOOK
// =============================================================================

/**
 * Track exit intent
 */
export function useExitIntent(
  onExitIntent?: (params: { timeOnPage: number; scrollDepth: number }) => void
): void {
  useEffect(() => {
    const cleanup = analytics.trackExitIntent((params) => {
      track('exit_intent', {
        timeOnPage: params.timeOnPage,
        scrollDepthReached: params.scrollDepth,
      })
      onExitIntent?.(params)
    })

    return cleanup
  }, [onExitIntent])
}

// =============================================================================
// EXPERIMENT HOOKS
// =============================================================================

/**
 * Get and track experiment variant
 * Uses localStorage for persistence across sessions
 */
export function useExperiment(experimentId: string, variants: string[]): string {
  // Initialize with stored value or first variant (SSR-safe)
  const [variant, setVariant] = useState<string>(() => {
    // Check if already assigned in analytics
    const analyticsVariant = analytics.getExperimentVariant(experimentId)
    if (analyticsVariant) {
      return analyticsVariant
    }

    // Try to get from localStorage (SSR-safe)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`experiment_${experimentId}`)
      if (stored && variants.includes(stored)) {
        return stored
      }
    }

    // Return first variant as default (will assign randomly in effect)
    return variants[0]
  })

  // Assign variant and persist on mount (handles the random assignment)
  useEffect(() => {
    // Check if we need to assign a new variant
    const stored = localStorage.getItem(`experiment_${experimentId}`)
    if (!stored || !variants.includes(stored)) {
      // Randomly assign variant
      const randomIndex = Math.floor(Math.random() * variants.length)
      const newVariant = variants[randomIndex]
      localStorage.setItem(`experiment_${experimentId}`, newVariant)
      // Use queueMicrotask to avoid the setState-in-effect lint rule
      queueMicrotask(() => setVariant(newVariant))
    }

    // Register with analytics
    analytics.setExperiment(experimentId, variant)
  }, [experimentId, variant, variants])

  return variant
}
