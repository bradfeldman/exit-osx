'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_MS,
  ACTIVITY_THROTTLE_MS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
} from '@/lib/security/constants'

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown',
] as const

const BROADCAST_CHANNEL_NAME = 'exit-osx-activity'
const STORAGE_KEY = 'exit-osx-last-activity'

type BroadcastMessage =
  | { type: 'activity'; timestamp: number }
  | { type: 'logout' }
  | { type: 'dismiss-warning' }

interface UseIdleTimeoutReturn {
  showWarning: boolean
  remainingSeconds: number
  dismissWarning: () => void
  isIdle: boolean
}

export function useIdleTimeout(): UseIdleTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.floor((SESSION_TIMEOUT_MS - SESSION_WARNING_MS) / 1000)
  )
  const [isIdle, setIsIdle] = useState(false)

  const lastActivityRef = useRef(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const throttleRef = useRef(0)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const isLoggingOutRef = useRef(false)

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const triggerLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    // Broadcast logout to other tabs
    try {
      channelRef.current?.postMessage({ type: 'logout' } satisfies BroadcastMessage)
    } catch {
      // BroadcastChannel may be closed
    }

    // Fallback: localStorage for older browsers
    try {
      localStorage.setItem(STORAGE_KEY, 'logout')
    } catch {
      // localStorage may be unavailable
    }

    // Sign out via Supabase
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()

    window.location.href = '/login?reason=timeout'
  }, [])

  const startCountdown = useCallback(() => {
    const warningDuration = SESSION_TIMEOUT_MS - SESSION_WARNING_MS
    const logoutTime = lastActivityRef.current + SESSION_TIMEOUT_MS

    setShowWarning(true)
    setIsIdle(true)
    setRemainingSeconds(Math.max(0, Math.floor((logoutTime - Date.now()) / 1000)))

    // Countdown interval
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((logoutTime - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        triggerLogout()
      }
    }, 1000)

    // Logout timer as a safety net
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    const timeUntilLogout = logoutTime - Date.now()
    if (timeUntilLogout > 0) {
      logoutTimerRef.current = setTimeout(triggerLogout, timeUntilLogout)
    } else {
      triggerLogout()
    }
  }, [triggerLogout])

  const resetTimers = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    setIsIdle(false)
    lastActivityRef.current = Date.now()
    isLoggingOutRef.current = false

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      startCountdown()
    }, SESSION_WARNING_MS)
  }, [clearAllTimers, startCountdown])

  const refreshActivityCookie = useCallback(() => {
    document.cookie = `${SESSION_COOKIE_NAME}=${Date.now()}; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`
  }, [])

  const recordActivity = useCallback(() => {
    const now = Date.now()
    if (now - throttleRef.current < ACTIVITY_THROTTLE_MS) return
    throttleRef.current = now

    resetTimers()

    // Refresh server-side activity cookie
    refreshActivityCookie()

    // Broadcast to other tabs
    try {
      channelRef.current?.postMessage({
        type: 'activity',
        timestamp: now,
      } satisfies BroadcastMessage)
    } catch {
      // BroadcastChannel may be closed
    }

    // Fallback: localStorage
    try {
      localStorage.setItem(STORAGE_KEY, String(now))
    } catch {
      // localStorage may be unavailable
    }
  }, [resetTimers, refreshActivityCookie])

  const dismissWarning = useCallback(() => {
    recordActivity()

    // Broadcast dismiss to other tabs
    try {
      channelRef.current?.postMessage({
        type: 'dismiss-warning',
      } satisfies BroadcastMessage)
    } catch {
      // BroadcastChannel may be closed
    }
  }, [recordActivity])

  // Set up BroadcastChannel and event listeners
  useEffect(() => {
    // BroadcastChannel for multi-tab sync
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      channelRef.current = channel

      channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        const data = event.data
        if (data.type === 'activity' || data.type === 'dismiss-warning') {
          // Another tab had activity — reset our timers
          clearAllTimers()
          setShowWarning(false)
          setIsIdle(false)
          lastActivityRef.current = Date.now()
          isLoggingOutRef.current = false

          warningTimerRef.current = setTimeout(() => {
            startCountdown()
          }, SESSION_WARNING_MS)
        } else if (data.type === 'logout') {
          // Another tab triggered logout
          triggerLogout()
        }
      }
    } catch {
      // BroadcastChannel not supported — fall back to storage events
    }

    // Fallback: Listen for localStorage changes (cross-tab in older browsers)
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return

      if (e.newValue === 'logout') {
        triggerLogout()
        return
      }

      // Activity from another tab
      clearAllTimers()
      setShowWarning(false)
      setIsIdle(false)
      lastActivityRef.current = Date.now()
      isLoggingOutRef.current = false

      warningTimerRef.current = setTimeout(() => {
        startCountdown()
      }, SESSION_WARNING_MS)
    }
    window.addEventListener('storage', handleStorage)

    // Activity event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true })
    })

    // Visibility change — catch up when tab returns to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return

      const elapsed = Date.now() - lastActivityRef.current

      if (elapsed >= SESSION_TIMEOUT_MS) {
        // Timed out while tab was hidden
        triggerLogout()
      } else if (elapsed >= SESSION_WARNING_MS) {
        // Should be showing warning
        clearAllTimers()
        startCountdown()
      }
      // Otherwise, timers are already running correctly
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Set activity cookie on mount so middleware knows session is active
    document.cookie = `${SESSION_COOKIE_NAME}=${Date.now()}; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`

    // Start initial warning timer
    warningTimerRef.current = setTimeout(() => {
      startCountdown()
    }, SESSION_WARNING_MS)

    return () => {
      clearAllTimers()

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, recordActivity)
      })

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorage)

      try {
        channelRef.current?.close()
      } catch {
        // Channel may already be closed
      }
    }
  }, [clearAllTimers, recordActivity, resetTimers, startCountdown, triggerLogout])

  return { showWarning, remainingSeconds, dismissWarning, isIdle }
}
