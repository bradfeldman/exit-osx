/**
 * Account Lockout Module
 * Prevents brute force attacks by temporarily locking accounts after failed attempts
 *
 * SECURITY: This provides protection against credential stuffing and brute force attacks
 * Uses Redis in production for distributed lockout tracking
 */

import { securityLogger } from './logger'
import { securityStore } from './store'

interface LockoutEntry {
  failedAttempts: number
  lastAttempt: number
  lockedUntil: number | null
}

// Configuration
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000 // 1 hour window for counting attempts

function getLockoutKey(identifier: string): string {
  return `lockout:${identifier.toLowerCase()}`
}

/**
 * Check if an account is currently locked
 */
export async function isAccountLocked(identifier: string): Promise<{
  locked: boolean
  remainingMs?: number
  reason?: string
}> {
  const key = getLockoutKey(identifier)
  const entry = await securityStore.get<LockoutEntry>(key)

  if (!entry) {
    return { locked: false }
  }

  const now = Date.now()

  // Check if lockout has expired
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      locked: true,
      remainingMs: entry.lockedUntil - now,
      reason: `Account temporarily locked due to too many failed login attempts. Try again in ${Math.ceil((entry.lockedUntil - now) / 60000)} minutes.`,
    }
  }

  // Lockout expired
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    // Clear the expired lockout
    await securityStore.delete(key)
    return { locked: false }
  }

  return { locked: false }
}

/**
 * Record a failed login attempt
 * Returns true if account is now locked
 */
export async function recordFailedAttempt(
  identifier: string,
  context?: { ipAddress?: string; userAgent?: string }
): Promise<{
  locked: boolean
  attemptsRemaining: number
  lockoutDurationMs?: number
}> {
  const key = getLockoutKey(identifier)
  const now = Date.now()

  let entry = await securityStore.get<LockoutEntry>(key)

  if (!entry) {
    entry = {
      failedAttempts: 0,
      lastAttempt: now,
      lockedUntil: null,
    }
  }

  // Reset counter if outside the attempt window
  if (now - entry.lastAttempt > ATTEMPT_WINDOW_MS) {
    entry.failedAttempts = 0
    entry.lockedUntil = null
  }

  entry.failedAttempts++
  entry.lastAttempt = now

  // Check if we should lock
  if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS

    securityLogger.security('account.locked', `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts`, {
      userEmail: identifier,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: {
        failedAttempts: entry.failedAttempts,
        lockoutDurationMinutes: LOCKOUT_DURATION_MS / 60000,
      },
    })

    // Store with TTL slightly longer than lockout to ensure cleanup
    await securityStore.set(key, entry, LOCKOUT_DURATION_MS + 60000)

    return {
      locked: true,
      attemptsRemaining: 0,
      lockoutDurationMs: LOCKOUT_DURATION_MS,
    }
  }

  securityLogger.warn('auth.failed_attempt', `Failed login attempt ${entry.failedAttempts}/${MAX_FAILED_ATTEMPTS}`, {
    userEmail: identifier,
    ipAddress: context?.ipAddress,
    metadata: { attemptsRemaining: MAX_FAILED_ATTEMPTS - entry.failedAttempts },
  })

  // Store with TTL of attempt window
  await securityStore.set(key, entry, ATTEMPT_WINDOW_MS)

  return {
    locked: false,
    attemptsRemaining: MAX_FAILED_ATTEMPTS - entry.failedAttempts,
  }
}

/**
 * Clear lockout after successful login
 */
export async function clearLockout(identifier: string): Promise<void> {
  const key = getLockoutKey(identifier)
  await securityStore.delete(key)
}

/**
 * Get lockout status for admin monitoring
 */
export async function getLockoutStatus(identifier: string): Promise<{
  failedAttempts: number
  isLocked: boolean
  lockedUntil: Date | null
  lastAttempt: Date | null
} | null> {
  const key = getLockoutKey(identifier)
  const entry = await securityStore.get<LockoutEntry>(key)

  if (!entry) {
    return null
  }

  const now = Date.now()
  const isLocked = entry.lockedUntil ? entry.lockedUntil > now : false

  return {
    failedAttempts: entry.failedAttempts,
    isLocked,
    lockedUntil: entry.lockedUntil ? new Date(entry.lockedUntil) : null,
    lastAttempt: new Date(entry.lastAttempt),
  }
}

/**
 * Manually unlock an account (admin action)
 */
export async function adminUnlockAccount(identifier: string, adminEmail: string): Promise<boolean> {
  const key = getLockoutKey(identifier)
  const entry = await securityStore.get<LockoutEntry>(key)

  if (!entry) {
    return false
  }

  securityLogger.security('account.admin_unlock', `Account manually unlocked by admin`, {
    userEmail: identifier,
    metadata: { adminEmail },
  })

  await securityStore.delete(key)
  return true
}

/**
 * Get the number of failed attempts for an account
 * Useful for showing CAPTCHA after certain number of attempts
 */
export async function getFailedAttemptCount(identifier: string): Promise<number> {
  const key = getLockoutKey(identifier)
  const entry = await securityStore.get<LockoutEntry>(key)

  if (!entry) {
    return 0
  }

  // Reset if outside window
  if (Date.now() - entry.lastAttempt > ATTEMPT_WINDOW_MS) {
    return 0
  }

  return entry.failedAttempts
}
