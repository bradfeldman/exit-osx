/**
 * Google Tag Manager Components
 * Include these in your root layout for GTM integration
 */

'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setDefaultConsent, initializeDataLayer } from '@/lib/analytics/consent'

// Auth pages where GTM should NOT load — GTM tags can inject arbitrary JS
// that interferes with the login/signup flow (observed: reload loop on iOS)
const GTM_EXCLUDED_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/activate']

interface GoogleTagManagerProps {
  gtmId: string
}

/**
 * GTM Head Script
 * Must be placed in the <head> section
 */
export function GoogleTagManagerHead({ gtmId }: GoogleTagManagerProps) {
  // Set default consent BEFORE GTM loads
  useEffect(() => {
    initializeDataLayer()
    setDefaultConsent()
  }, [])

  if (!gtmId) return null

  return (
    <>
      {/* Default consent must be set before GTM */}
      <Script
        id="gtm-consent-default"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // Detect region for default consent
            var isGdpr = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/');
            var hasGpc = navigator.globalPrivacyControl === true;
            var defaultState = isGdpr ? 'denied' : 'granted';

            gtag('consent', 'default', {
              'ad_storage': hasGpc ? 'denied' : defaultState,
              'ad_user_data': hasGpc ? 'denied' : defaultState,
              'ad_personalization': hasGpc ? 'denied' : defaultState,
              'analytics_storage': defaultState,
              'functionality_storage': defaultState,
              'personalization_storage': defaultState,
              'security_storage': 'granted',
              'wait_for_update': 500
            });

            dataLayer.push({
              'event': 'consent_default_set',
              'consent_region': isGdpr ? 'gdpr' : 'other',
              'gpc_signal': hasGpc
            });
          `,
        }}
      />
      {/* GTM Script */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </>
  )
}

/**
 * GTM NoScript Fallback
 * Must be placed immediately after the opening <body> tag
 */
export function GoogleTagManagerBody({ gtmId }: GoogleTagManagerProps) {
  const pathname = usePathname()
  if (!gtmId || GTM_EXCLUDED_PATHS.includes(pathname)) return null

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}

/**
 * Combined GTM component for simpler usage
 * Note: The body iframe should ideally be placed right after <body> tag
 */
export function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  const pathname = usePathname()
  if (GTM_EXCLUDED_PATHS.includes(pathname)) return null
  return <GoogleTagManagerHead gtmId={gtmId} />
}

/**
 * Direct GA4 Script (use if not using GTM)
 */
interface GoogleAnalyticsProps {
  measurementId: string
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  if (!measurementId) return null

  return (
    <>
      {/* Default consent must be set before GA4 */}
      <Script
        id="ga4-consent-default"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            var isGdpr = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/');
            var hasGpc = navigator.globalPrivacyControl === true;
            var defaultState = isGdpr ? 'denied' : 'granted';

            gtag('consent', 'default', {
              'ad_storage': hasGpc ? 'denied' : defaultState,
              'ad_user_data': hasGpc ? 'denied' : defaultState,
              'ad_personalization': hasGpc ? 'denied' : defaultState,
              'analytics_storage': defaultState,
              'functionality_storage': defaultState,
              'personalization_storage': defaultState,
              'security_storage': 'granted',
              'wait_for_update': 500
            });
          `,
        }}
      />
      {/* GA4 Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              send_page_view: false
            });
          `,
        }}
      />
    </>
  )
}
