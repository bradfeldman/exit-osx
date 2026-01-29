/**
 * Exit OSx Analytics Service
 * Core tracking module for type-safe analytics events
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics'
 *   analytics.track('assessment_started', { assessmentType: 'company' })
 */

import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsUser,
  SessionContext,
  ExperimentContext,
} from './types'
import {
  initializeDataLayer,
  isAnalyticsAllowed,
  setDefaultConsent,
} from './consent'

// =============================================================================
// CONFIGURATION
// =============================================================================

interface AnalyticsConfig {
  debug: boolean
  gtmId?: string
  ga4MeasurementId?: string
}

const config: AnalyticsConfig = {
  debug: process.env.NODE_ENV === 'development',
  gtmId: process.env.NEXT_PUBLIC_GTM_ID,
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
}

// =============================================================================
// STATE
// =============================================================================

let isInitialized = false
let currentUser: AnalyticsUser = {}
let currentSession: SessionContext | null = null
const activeExperiments: Map<string, ExperimentContext> = new Map()

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent.toLowerCase()
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

/**
 * Detect browser from user agent
 */
function detectBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'firefox'
  if (ua.includes('SamsungBrowser')) return 'samsung'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'opera'
  if (ua.includes('Edge')) return 'edge'
  if (ua.includes('Chrome')) return 'chrome'
  if (ua.includes('Safari')) return 'safari'
  return 'other'
}

/**
 * Get screen size category
 */
function getScreenSize(): string {
  if (typeof window === 'undefined') return 'unknown'

  const width = window.innerWidth
  if (width < 640) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1280) return 'lg'
  return 'xl'
}

/**
 * Parse UTM parameters from URL
 */
function parseUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  utmKeys.forEach(key => {
    const value = params.get(key)
    if (value) {
      utm[key.replace('utm_', 'utmSource').replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = value
    }
  })

  return utm
}

/**
 * Log event in debug mode
 */
function debugLog(eventName: string, params: Record<string, unknown>): void {
  if (config.debug) {
    console.log(
      `%c[Analytics] ${eventName}`,
      'color: #6366f1; font-weight: bold;',
      params
    )
  }
}

// =============================================================================
// CORE TRACKING
// =============================================================================

/**
 * Push event to dataLayer for GTM
 */
function pushToDataLayer(
  eventName: string,
  params: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return

  initializeDataLayer()

  const enrichedParams: Record<string, unknown> = {
    event: eventName,
    ...params,
    // Add standard context
    timestamp: new Date().toISOString(),
    sessionId: currentSession?.sessionId,
    userId: currentUser.userId,
    companyId: currentUser.companyId,
    pageUrl: window.location.href,
    pageTitle: document.title,
  }

  // Add active experiment context if any
  if (activeExperiments.size > 0) {
    const experiments: ExperimentContext[] = []
    activeExperiments.forEach(exp => experiments.push(exp))
    enrichedParams.experiments = experiments
  }

  window.dataLayer.push(enrichedParams)
}

/**
 * Track an event with type-safe parameters
 */
function track<T extends AnalyticsEventName>(
  eventName: T,
  params: Omit<AnalyticsEventMap[T], keyof import('./types').BaseEventParams>
): void {
  // Check consent before tracking (except for consent-related events)
  if (!eventName.startsWith('consent_') && !isAnalyticsAllowed()) {
    debugLog(`${eventName} (blocked - no consent)`, params as Record<string, unknown>)
    return
  }

  debugLog(eventName, params as Record<string, unknown>)
  pushToDataLayer(eventName, params as Record<string, unknown>)
}

/**
 * Track a page view
 */
function trackPageView(pageName: string, params?: Record<string, unknown>): void {
  if (!isAnalyticsAllowed()) {
    debugLog(`page_view: ${pageName} (blocked - no consent)`, params || {})
    return
  }

  const pageParams = {
    page_name: pageName,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    page_title: typeof window !== 'undefined' ? document.title : '',
    ...params,
  }

  debugLog(`page_view: ${pageName}`, pageParams)
  pushToDataLayer('page_view', pageParams)
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize analytics
 * Should be called once at app startup
 */
function initialize(): void {
  if (typeof window === 'undefined') return
  if (isInitialized) return

  // Set default consent state (MUST happen before GTM loads)
  setDefaultConsent()

  // Initialize session
  currentSession = {
    sessionId: generateSessionId(),
    deviceType: detectDeviceType(),
    browser: detectBrowser(),
    screenSize: getScreenSize(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || undefined,
    ...parseUtmParams(),
  }

  // Store session ID in sessionStorage for persistence across page loads
  const existingSessionId = sessionStorage.getItem('exitosx-session-id')
  if (existingSessionId) {
    currentSession.sessionId = existingSessionId
  } else {
    sessionStorage.setItem('exitosx-session-id', currentSession.sessionId)
  }

  isInitialized = true

  debugLog('Analytics initialized', {
    session: currentSession,
    config: {
      gtmId: config.gtmId,
      ga4MeasurementId: config.ga4MeasurementId,
    },
  })
}

// =============================================================================
// USER IDENTIFICATION
// =============================================================================

/**
 * Identify the current user
 * Call after email verification when Prisma user.id is available
 */
function identify(user: AnalyticsUser): void {
  currentUser = { ...currentUser, ...user }

  if (typeof window === 'undefined') return

  initializeDataLayer()

  // Push user identification to dataLayer
  window.dataLayer.push({
    event: 'user_identified',
    user_id: user.userId,
    company_id: user.companyId,
    subscription_tier: user.subscriptionTier,
    bri_score: user.briScore,
    assessment_status: user.assessmentStatus,
  })

  debugLog('User identified', currentUser as unknown as Record<string, unknown>)
}

/**
 * Update user properties
 */
function updateUser(updates: Partial<AnalyticsUser>): void {
  currentUser = { ...currentUser, ...updates }

  if (typeof window === 'undefined') return

  initializeDataLayer()

  window.dataLayer.push({
    event: 'user_properties_updated',
    ...updates,
  })

  debugLog('User updated', updates)
}

/**
 * Clear user identification (on logout)
 */
function clearUser(): void {
  currentUser = {}

  if (typeof window === 'undefined') return

  initializeDataLayer()

  window.dataLayer.push({
    event: 'user_cleared',
  })

  debugLog('User cleared', {})
}

// =============================================================================
// EXPERIMENTS
// =============================================================================

/**
 * Set active experiment variant
 */
function setExperiment(experimentId: string, variant: string): void {
  const context: ExperimentContext = {
    experimentId,
    variant,
    firstExposure: new Date().toISOString(),
  }

  activeExperiments.set(experimentId, context)

  if (typeof window === 'undefined') return

  initializeDataLayer()

  window.dataLayer.push({
    event: 'experiment_exposure',
    experiment_id: experimentId,
    experiment_variant: variant,
    first_exposure: context.firstExposure,
  })

  debugLog('Experiment set', context as unknown as Record<string, unknown>)
}

/**
 * Get current experiment variant
 */
function getExperimentVariant(experimentId: string): string | null {
  const experiment = activeExperiments.get(experimentId)
  return experiment?.variant || null
}

/**
 * Clear experiment
 */
function clearExperiment(experimentId: string): void {
  activeExperiments.delete(experimentId)
  debugLog('Experiment cleared', { experimentId })
}

// =============================================================================
// TIMING HELPERS
// =============================================================================

const timers: Map<string, number> = new Map()

/**
 * Start a timer for measuring durations
 */
function startTimer(name: string): void {
  timers.set(name, Date.now())
}

/**
 * Get elapsed time and optionally clear the timer
 */
function getElapsedTime(name: string, clear = true): number | null {
  const startTime = timers.get(name)
  if (!startTime) return null

  const elapsed = Date.now() - startTime
  if (clear) {
    timers.delete(name)
  }
  return elapsed
}

/**
 * Clear a timer without getting the value
 */
function clearTimer(name: string): void {
  timers.delete(name)
}

// =============================================================================
// SCROLL DEPTH TRACKING
// =============================================================================

let scrollDepthMarkers = new Set<number>()
let scrollDepthHandler: (() => void) | null = null

/**
 * Start tracking scroll depth
 * Automatically tracks 25%, 50%, 75%, 100% milestones
 */
function trackScrollDepth(callback?: (depth: number) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  scrollDepthMarkers = new Set()
  const pageLoadTime = Date.now()

  scrollDepthHandler = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercent = Math.round((scrollTop / docHeight) * 100)

    const milestones = [25, 50, 75, 100]
    milestones.forEach(milestone => {
      if (scrollPercent >= milestone && !scrollDepthMarkers.has(milestone)) {
        scrollDepthMarkers.add(milestone)
        const timeToDepth = Date.now() - pageLoadTime

        track('scroll_depth', {
          depth: milestone as 25 | 50 | 75 | 100,
          timeToDepth,
        })

        callback?.(milestone)
      }
    })
  }

  window.addEventListener('scroll', scrollDepthHandler, { passive: true })

  return () => {
    if (scrollDepthHandler) {
      window.removeEventListener('scroll', scrollDepthHandler)
      scrollDepthHandler = null
    }
    scrollDepthMarkers.clear()
  }
}

// =============================================================================
// VIEWPORT TRACKING
// =============================================================================

/**
 * Track when an element enters the viewport
 * Returns cleanup function
 */
function trackElementVisibility(
  element: HTMLElement,
  callback: (isVisible: boolean, timeVisible: number) => void,
  options?: IntersectionObserverInit
): () => void {
  if (typeof window === 'undefined') return () => {}

  let visibilityStart: number | null = null

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibilityStart = Date.now()
          callback(true, 0)
        } else if (visibilityStart) {
          const timeVisible = Date.now() - visibilityStart
          callback(false, timeVisible)
          visibilityStart = null
        }
      })
    },
    { threshold: 0.5, ...options }
  )

  observer.observe(element)

  return () => observer.disconnect()
}

// =============================================================================
// EXIT INTENT TRACKING
// =============================================================================

/**
 * Track exit intent (mouse leaving viewport)
 * Returns cleanup function
 */
function trackExitIntent(
  callback: (params: { timeOnPage: number; scrollDepth: number }) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const pageLoadTime = Date.now()
  let triggered = false

  const handler = (e: MouseEvent) => {
    // Only trigger when mouse moves toward top of viewport (likely closing tab)
    if (e.clientY <= 0 && !triggered) {
      triggered = true

      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollDepth = Math.round((scrollTop / docHeight) * 100)

      callback({
        timeOnPage: Date.now() - pageLoadTime,
        scrollDepth,
      })
    }
  }

  document.addEventListener('mouseout', handler)

  return () => {
    document.removeEventListener('mouseout', handler)
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const analytics = {
  // Core
  initialize,
  track,
  trackPageView,

  // User
  identify,
  updateUser,
  clearUser,

  // Experiments
  setExperiment,
  getExperimentVariant,
  clearExperiment,

  // Timing
  startTimer,
  getElapsedTime,
  clearTimer,

  // Behavioral
  trackScrollDepth,
  trackElementVisibility,
  trackExitIntent,

  // Getters
  getSession: () => currentSession,
  getUser: () => currentUser,
  isInitialized: () => isInitialized,
}

// Also export individual functions for tree-shaking
export {
  initialize,
  track,
  trackPageView,
  identify,
  updateUser,
  clearUser,
  setExperiment,
  getExperimentVariant,
  clearExperiment,
  startTimer,
  getElapsedTime,
  clearTimer,
  trackScrollDepth,
  trackElementVisibility,
  trackExitIntent,
}
