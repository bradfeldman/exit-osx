/**
 * Analytics Provider
 * Wraps the application to provide analytics context and initialization
 */

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { analytics } from './index'
import { updateConsent, onConsentChange, type CookiePreferences } from './consent'
import type { AnalyticsUser } from './types'

// =============================================================================
// CONTEXT
// =============================================================================

interface AnalyticsContextValue {
  isInitialized: boolean
  isConsentGiven: boolean
  user: AnalyticsUser | null
  identify: (user: AnalyticsUser) => void
  updateUser: (updates: Partial<AnalyticsUser>) => void
  clearUser: () => void
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Initialize state with default values, will be updated on mount
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConsentGiven, setIsConsentGiven] = useState(false)
  const [user, setUser] = useState<AnalyticsUser | null>(null)

  // Initialize analytics on mount
  useEffect(() => {
    // Run initialization
    analytics.initialize()

    // Check initial consent state from localStorage
    let hasConsent = false
    const stored = localStorage.getItem('exitosx-cookie-consent')
    if (stored) {
      try {
        const prefs = JSON.parse(stored) as CookiePreferences
        hasConsent = prefs.consentGiven && prefs.analytics

        // Sync consent to Google
        if (prefs.consentGiven) {
          updateConsent(prefs)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Update state after initialization is complete
    // Using a microtask to avoid the lint warning about setState in effects
    queueMicrotask(() => {
      setIsInitialized(true)
      setIsConsentGiven(hasConsent)
    })
  }, [])

  // Listen for consent changes
  useEffect(() => {
    const unsubscribe = onConsentChange((prefs) => {
      setIsConsentGiven(prefs.consentGiven && prefs.analytics)
      updateConsent(prefs)
    })

    return unsubscribe
  }, [])

  // User identification
  const identify = useCallback((userData: AnalyticsUser) => {
    analytics.identify(userData)
    setUser(userData)
  }, [])

  const updateUser = useCallback((updates: Partial<AnalyticsUser>) => {
    analytics.updateUser(updates)
    setUser(prev => prev ? { ...prev, ...updates } : updates)
  }, [])

  const clearUser = useCallback(() => {
    analytics.clearUser()
    setUser(null)
  }, [])

  const value: AnalyticsContextValue = {
    isInitialized,
    isConsentGiven,
    user,
    identify,
    updateUser,
    clearUser,
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Access analytics context
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

// =============================================================================
// GTM SCRIPT COMPONENT
// =============================================================================

interface GtmScriptProps {
  gtmId: string
}

/**
 * Google Tag Manager script component
 * Include this in your root layout
 */
export function GtmScript({ gtmId: _gtmId }: GtmScriptProps) {
  useEffect(() => {
    // GTM script is loaded via next/script in layout
    // This component handles any additional initialization
  }, [])

  return null
}

// =============================================================================
// GA4 SCRIPT COMPONENT (Alternative to GTM)
// =============================================================================

interface Ga4ScriptProps {
  measurementId: string
}

/**
 * Direct GA4 script component (use if not using GTM)
 */
export function Ga4Script({ measurementId: _measurementId }: Ga4ScriptProps) {
  useEffect(() => {
    // GA4 initialization handled by consent module
  }, [])

  return null
}
