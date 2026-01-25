'use client'

import { useEffect, useRef, useCallback } from 'react'

interface CaptchaProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      execute: (widgetId: string) => void
    }
    grecaptcha?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      execute: (widgetId: string) => void
    }
    onCaptchaLoad?: () => void
  }
}

/**
 * CAPTCHA component that supports both hCaptcha and reCAPTCHA
 * Uses environment variables to determine which service to use:
 * - NEXT_PUBLIC_HCAPTCHA_SITE_KEY for hCaptcha
 * - NEXT_PUBLIC_RECAPTCHA_SITE_KEY for reCAPTCHA
 */
export function Captcha({ onVerify, onExpire, onError }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const scriptLoadedRef = useRef(false)

  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  const siteKey = hcaptchaSiteKey || recaptchaSiteKey
  const isHCaptcha = !!hcaptchaSiteKey

  const renderCaptcha = useCallback(() => {
    if (!containerRef.current || !siteKey) return

    const captchaApi = isHCaptcha ? window.hcaptcha : window.grecaptcha
    if (!captchaApi) return

    // Clear any existing widget
    if (widgetIdRef.current) {
      try {
        if (isHCaptcha && window.hcaptcha) {
          window.hcaptcha.remove(widgetIdRef.current)
        }
      } catch {
        // Ignore removal errors
      }
    }

    try {
      widgetIdRef.current = captchaApi.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': () => onError?.('CAPTCHA error occurred'),
        theme: 'light',
        size: 'normal',
      })
    } catch (error) {
      console.error('Failed to render CAPTCHA:', error)
      onError?.('Failed to load CAPTCHA')
    }
  }, [siteKey, isHCaptcha, onVerify, onExpire, onError])

  useEffect(() => {
    if (!siteKey) {
      console.warn('No CAPTCHA site key configured')
      return
    }

    // Check if script is already loaded
    const existingScript = document.querySelector(
      isHCaptcha
        ? 'script[src*="hcaptcha.com"]'
        : 'script[src*="recaptcha"]'
    )

    if (existingScript) {
      // Script already exists, try to render
      const captchaApi = isHCaptcha ? window.hcaptcha : window.grecaptcha
      if (captchaApi) {
        renderCaptcha()
      } else {
        // Wait for it to load
        window.onCaptchaLoad = renderCaptcha
      }
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = isHCaptcha
      ? 'https://js.hcaptcha.com/1/api.js?onload=onCaptchaLoad&render=explicit'
      : 'https://www.google.com/recaptcha/api.js?onload=onCaptchaLoad&render=explicit'
    script.async = true
    script.defer = true

    window.onCaptchaLoad = () => {
      scriptLoadedRef.current = true
      renderCaptcha()
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (widgetIdRef.current && isHCaptcha && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [siteKey, isHCaptcha, renderCaptcha])

  if (!siteKey) {
    // In development without CAPTCHA configured, show a placeholder
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="p-4 border border-dashed border-yellow-400 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          CAPTCHA disabled in development. Configure NEXT_PUBLIC_HCAPTCHA_SITE_KEY or NEXT_PUBLIC_RECAPTCHA_SITE_KEY.
        </div>
      )
    }
    return null
  }

  return <div ref={containerRef} className="flex justify-center" />
}

/**
 * Reset the CAPTCHA widget (call after form submission)
 */
export function resetCaptcha() {
  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  const isHCaptcha = !!hcaptchaSiteKey

  if (isHCaptcha && window.hcaptcha) {
    // Reset all hCaptcha widgets
    const widgets = document.querySelectorAll('[data-hcaptcha-widget-id]')
    widgets.forEach((widget) => {
      const widgetId = widget.getAttribute('data-hcaptcha-widget-id')
      if (widgetId) {
        window.hcaptcha?.reset(widgetId)
      }
    })
  } else if (window.grecaptcha) {
    // Reset reCAPTCHA (assumes single widget)
    window.grecaptcha.reset('0')
  }
}
