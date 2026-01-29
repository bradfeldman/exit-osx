/**
 * Google Consent Mode v2 Integration
 * Bridges the existing CookieConsent component with Google Tag Manager
 *
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */

import type { ConsentPreferences, ConsentState } from './types'

// Re-export the cookie preferences interface from the existing component
export interface CookiePreferences {
  essential: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
  consentGiven: boolean
  consentDate: string | null
}

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
    gtag: (...args: unknown[]) => void
  }
}

/**
 * Initialize the dataLayer and gtag function
 * MUST be called before GTM loads
 */
export function initializeDataLayer(): void {
  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer || []

  // Define gtag function if not already defined
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments as unknown as Record<string, unknown>)
    }
  }
}

/**
 * Check if user is in a GDPR region (EU/EEA)
 * Uses timezone as a heuristic - could be enhanced with IP geolocation
 */
export function isGdprRegion(): boolean {
  if (typeof window === 'undefined') return true // Default to restrictive

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const euTimezones = [
    'Europe/', 'Atlantic/Azores', 'Atlantic/Canary', 'Atlantic/Faroe',
    'Atlantic/Madeira', 'Atlantic/Reykjavik'
  ]

  return euTimezones.some(tz => timezone.startsWith(tz))
}

/**
 * Check if user is in California (CCPA)
 * Uses timezone as a heuristic
 */
export function isCcpaRegion(): boolean {
  if (typeof window === 'undefined') return false

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return timezone === 'America/Los_Angeles'
}

/**
 * Check for Global Privacy Control (GPC) signal
 * Required for CCPA compliance
 */
export function hasGpcSignal(): boolean {
  if (typeof window === 'undefined') return false

  // Check for GPC signal in navigator
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.globalPrivacyControl === true
}

/**
 * Convert CookiePreferences to Google Consent Mode format
 */
export function toGoogleConsent(preferences: CookiePreferences): ConsentPreferences {
  // If GPC signal is present and marketing is not explicitly granted, deny ad-related
  const gpcActive = hasGpcSignal() && !preferences.marketing

  return {
    ad_storage: (preferences.marketing && !gpcActive) ? 'granted' : 'denied',
    ad_user_data: (preferences.marketing && !gpcActive) ? 'granted' : 'denied',
    ad_personalization: (preferences.marketing && !gpcActive) ? 'granted' : 'denied',
    analytics_storage: preferences.analytics ? 'granted' : 'denied',
    functionality_storage: preferences.functional ? 'granted' : 'denied',
    personalization_storage: preferences.functional ? 'granted' : 'denied',
    security_storage: 'granted', // Always granted (essential)
  }
}

/**
 * Set default consent state
 * MUST be called before GTM script loads
 */
export function setDefaultConsent(): void {
  if (typeof window === 'undefined') return

  initializeDataLayer()

  // Determine default based on region
  const isGdpr = isGdprRegion()
  const defaultState: ConsentState = isGdpr ? 'denied' : 'granted'

  // Check for GPC signal
  const gpcDenied = hasGpcSignal()

  window.gtag('consent', 'default', {
    ad_storage: gpcDenied ? 'denied' : defaultState,
    ad_user_data: gpcDenied ? 'denied' : defaultState,
    ad_personalization: gpcDenied ? 'denied' : defaultState,
    analytics_storage: defaultState,
    functionality_storage: defaultState,
    personalization_storage: defaultState,
    security_storage: 'granted',
    wait_for_update: 500, // Wait for CMP to load
  })

  // Push region info to dataLayer for GTM
  window.dataLayer.push({
    event: 'consent_default_set',
    consent_region: isGdpr ? 'gdpr' : (isCcpaRegion() ? 'ccpa' : 'other'),
    gpc_signal: gpcDenied,
  })
}

/**
 * Update consent state when user makes a choice
 */
export function updateConsent(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return

  initializeDataLayer()

  const googleConsent = toGoogleConsent(preferences)

  // Update Google consent
  window.gtag('consent', 'update', googleConsent)

  // Push to dataLayer for GTM triggers
  window.dataLayer.push({
    event: 'consent_updated',
    consent_analytics: googleConsent.analytics_storage,
    consent_marketing: googleConsent.ad_storage,
    consent_functional: googleConsent.functionality_storage,
    consent_given: preferences.consentGiven,
    consent_date: preferences.consentDate,
  })
}

/**
 * Check if analytics tracking is allowed
 */
export function isAnalyticsAllowed(): boolean {
  if (typeof window === 'undefined') return false

  // Check localStorage for stored preferences
  const stored = localStorage.getItem('exitosx-cookie-consent')
  if (!stored) return false

  try {
    const preferences = JSON.parse(stored) as CookiePreferences
    return preferences.consentGiven && preferences.analytics
  } catch {
    return false
  }
}

/**
 * Check if marketing tracking is allowed
 */
export function isMarketingAllowed(): boolean {
  if (typeof window === 'undefined') return false

  // GPC signal overrides stored preference
  if (hasGpcSignal()) return false

  const stored = localStorage.getItem('exitosx-cookie-consent')
  if (!stored) return false

  try {
    const preferences = JSON.parse(stored) as CookiePreferences
    return preferences.consentGiven && preferences.marketing
  } catch {
    return false
  }
}

/**
 * Get current consent state
 */
export function getCurrentConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem('exitosx-cookie-consent')
  if (!stored) return null

  try {
    return JSON.parse(stored) as CookiePreferences
  } catch {
    return null
  }
}

/**
 * Subscribe to consent changes
 * Returns unsubscribe function
 */
export function onConsentChange(
  callback: (preferences: CookiePreferences) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: StorageEvent) => {
    if (event.key === 'exitosx-cookie-consent' && event.newValue) {
      try {
        const preferences = JSON.parse(event.newValue) as CookiePreferences
        callback(preferences)
      } catch {
        // Ignore parse errors
      }
    }
  }

  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
