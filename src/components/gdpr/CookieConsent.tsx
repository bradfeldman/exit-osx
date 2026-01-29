'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X, Settings, Cookie } from 'lucide-react'
import { updateConsent } from '@/lib/analytics/consent'

export interface CookiePreferences {
  essential: boolean // Always true, cannot be disabled
  functional: boolean
  analytics: boolean
  marketing: boolean
  consentGiven: boolean
  consentDate: string | null
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
  consentGiven: false,
  consentDate: null,
}

const COOKIE_CONSENT_KEY = 'exitosx-cookie-consent'

export function getCookiePreferences(): CookiePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!stored) return DEFAULT_PREFERENCES

  try {
    return JSON.parse(stored) as CookiePreferences
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveCookiePreferences(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences))
  // Update Google Consent Mode
  updateConsent(preferences)
}

// Lazy initializer for preferences state
function getInitialPreferences(): CookiePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  return getCookiePreferences()
}

// Lazy initializer for showBanner state
function getInitialShowBanner(): boolean {
  if (typeof window === 'undefined') return false
  const prefs = getCookiePreferences()
  return !prefs.consentGiven
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(getInitialShowBanner)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(getInitialPreferences)

  const handleAcceptAll = useCallback(() => {
    const newPreferences: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      consentGiven: true,
      consentDate: new Date().toISOString(),
    }
    saveCookiePreferences(newPreferences)
    setPreferences(newPreferences)
    setShowBanner(false)
    setShowSettings(false)
  }, [])

  const handleAcceptNecessary = useCallback(() => {
    const newPreferences: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      consentGiven: true,
      consentDate: new Date().toISOString(),
    }
    saveCookiePreferences(newPreferences)
    setPreferences(newPreferences)
    setShowBanner(false)
    setShowSettings(false)
  }, [])

  const handleSavePreferences = useCallback(() => {
    const newPreferences: CookiePreferences = {
      ...preferences,
      essential: true, // Always true
      consentGiven: true,
      consentDate: new Date().toISOString(),
    }
    saveCookiePreferences(newPreferences)
    setPreferences(newPreferences)
    setShowBanner(false)
    setShowSettings(false)
  }, [preferences])

  const togglePreference = useCallback((key: keyof Omit<CookiePreferences, 'essential' | 'consentGiven' | 'consentDate'>) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="max-w-4xl mx-auto bg-background border border-border rounded-lg shadow-lg">
        {!showSettings ? (
          // Main Banner
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  We value your privacy
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  We use cookies to enhance your browsing experience, provide personalized content,
                  and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies.
                  Read our{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  to learn more.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAcceptAll}>
                    Accept All
                  </Button>
                  <Button variant="outline" onClick={handleAcceptNecessary}>
                    Necessary Only
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowSettings(true)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Customize
                  </Button>
                </div>
              </div>
              <button
                onClick={handleAcceptNecessary}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close cookie banner"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          // Settings Panel
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Cookie Preferences
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to main banner"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">Essential Cookies</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Always Active
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Required for the website to function. These cannot be disabled.
                  </p>
                </div>
                <div className="shrink-0">
                  <div
                    className="w-11 h-6 bg-primary rounded-full relative cursor-not-allowed"
                    aria-label="Essential cookies are always enabled"
                  >
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 pr-4">
                  <h3 className="font-medium text-foreground mb-1">Functional Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable enhanced functionality and personalization, like remembering your preferences.
                  </p>
                </div>
                <button
                  onClick={() => togglePreference('functional')}
                  className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                    preferences.functional ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  role="switch"
                  aria-checked={preferences.functional}
                  aria-label="Toggle functional cookies"
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences.functional ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 pr-4">
                  <h3 className="font-medium text-foreground mb-1">Analytics Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors interact with our website to improve user experience.
                  </p>
                </div>
                <button
                  onClick={() => togglePreference('analytics')}
                  className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                    preferences.analytics ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  role="switch"
                  aria-checked={preferences.analytics}
                  aria-label="Toggle analytics cookies"
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences.analytics ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 pr-4">
                  <h3 className="font-medium text-foreground mb-1">Marketing Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Used to deliver personalized advertisements and track their effectiveness.
                  </p>
                </div>
                <button
                  onClick={() => togglePreference('marketing')}
                  className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                    preferences.marketing ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  role="switch"
                  aria-checked={preferences.marketing}
                  aria-label="Toggle marketing cookies"
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences.marketing ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSavePreferences}>
                Save Preferences
              </Button>
              <Button variant="outline" onClick={handleAcceptAll}>
                Accept All
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              For more information about how we use cookies and your data, please read our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Lazy initializer for CookieSettingsButton
function getInitialSettingsPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null
  return getCookiePreferences()
}

// Export a component to manage cookies from settings page
export function CookieSettingsButton() {
  const [preferences] = useState<CookiePreferences | null>(getInitialSettingsPreferences)

  const handleReset = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY)
    window.location.reload()
  }, [])

  if (!preferences?.consentGiven) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t set your cookie preferences yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">Current preferences (set on {preferences.consentDate ? new Date(preferences.consentDate).toLocaleDateString() : 'unknown'}):</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Essential: Always enabled</li>
          <li>Functional: {preferences.functional ? 'Enabled' : 'Disabled'}</li>
          <li>Analytics: {preferences.analytics ? 'Enabled' : 'Disabled'}</li>
          <li>Marketing: {preferences.marketing ? 'Enabled' : 'Disabled'}</li>
        </ul>
      </div>
      <Button variant="outline" onClick={handleReset}>
        Reset Cookie Preferences
      </Button>
    </div>
  )
}
