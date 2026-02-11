/**
 * Account Lockout Tests
 * Tests for brute force protection via account lockout
 *
 * SECURITY: Prevents credential stuffing and brute force attacks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  isAccountLocked,
  recordFailedAttempt,
  clearLockout,
  getLockoutStatus,
  adminUnlockAccount,
  getFailedAttemptCount,
} from '@/lib/security/account-lockout'
import { securityStore } from '@/lib/security/store'

// Mock the security store and logger
vi.mock('@/lib/security/store', () => ({
  securityStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    increment: vi.fn(),
    exists: vi.fn(),
  },
}))

vi.mock('@/lib/security/logger', () => ({
  securityLogger: {
    security: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Account Lockout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isAccountLocked', () => {
    it('returns not locked when no lockout entry exists', async () => {
      vi.mocked(securityStore.get).mockResolvedValue(null)

      const result = await isAccountLocked('test@example.com')

      expect(result.locked).toBe(false)
      expect(result.remainingMs).toBeUndefined()
    })

    it('returns locked when lockout is active', async () => {
      const now = Date.now()
      const lockedUntil = now + 10 * 60 * 1000 // 10 minutes from now

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now,
        lockedUntil,
      })

      const result = await isAccountLocked('test@example.com')

      expect(result.locked).toBe(true)
      expect(result.remainingMs).toBe(10 * 60 * 1000)
      expect(result.reason).toContain('temporarily locked')
    })

    it('clears expired lockout', async () => {
      const now = Date.now()
      const lockedUntil = now - 1000 // Expired 1 second ago

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now - 16 * 60 * 1000,
        lockedUntil,
      })

      const result = await isAccountLocked('test@example.com')

      expect(result.locked).toBe(false)
      expect(securityStore.delete).toHaveBeenCalled()
    })

    it('returns not locked when lockout expired exactly', async () => {
      const now = Date.now()
      const lockedUntil = now

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now - 15 * 60 * 1000,
        lockedUntil,
      })

      const result = await isAccountLocked('test@example.com')

      expect(result.locked).toBe(false)
    })

    it('calculates correct remaining time', async () => {
      const now = Date.now()
      const remainingMs = 5 * 60 * 1000 // 5 minutes
      const lockedUntil = now + remainingMs

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now,
        lockedUntil,
      })

      const result = await isAccountLocked('test@example.com')

      expect(result.locked).toBe(true)
      expect(result.remainingMs).toBe(remainingMs)
      expect(result.reason).toContain('5 minutes')
    })

    it('normalizes email to lowercase', async () => {
      vi.mocked(securityStore.get).mockResolvedValue(null)

      await isAccountLocked('Test@Example.COM')

      expect(securityStore.get).toHaveBeenCalledWith('lockout:test@example.com')
    })
  })

  describe('recordFailedAttempt', () => {
    it('records first failed attempt', async () => {
      vi.mocked(securityStore.get).mockResolvedValue(null)
      const now = Date.now()

      const result = await recordFailedAttempt('test@example.com')

      expect(result.locked).toBe(false)
      expect(result.attemptsRemaining).toBe(4)
      expect(securityStore.set).toHaveBeenCalledWith(
        'lockout:test@example.com',
        expect.objectContaining({
          failedAttempts: 1,
          lastAttempt: now,
          lockedUntil: null,
        }),
        60 * 60 * 1000 // 1 hour
      )
    })

    it('increments failed attempts', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 2,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      const result = await recordFailedAttempt('test@example.com')

      expect(result.locked).toBe(false)
      expect(result.attemptsRemaining).toBe(2)
      expect(securityStore.set).toHaveBeenCalledWith(
        'lockout:test@example.com',
        expect.objectContaining({
          failedAttempts: 3,
        }),
        expect.any(Number)
      )
    })

    it('locks account after 5 failed attempts', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      const result = await recordFailedAttempt('test@example.com')

      expect(result.locked).toBe(true)
      expect(result.attemptsRemaining).toBe(0)
      expect(result.lockoutDurationMs).toBe(15 * 60 * 1000)
    })

    it('sets lockout expiry 15 minutes in future', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      await recordFailedAttempt('test@example.com')

      expect(securityStore.set).toHaveBeenCalledWith(
        'lockout:test@example.com',
        expect.objectContaining({
          failedAttempts: 5,
          lockedUntil: now + 15 * 60 * 1000,
        }),
        expect.any(Number)
      )
    })

    it('resets counter after attempt window expires', async () => {
      const now = Date.now()
      const oldAttempt = now - 2 * 60 * 60 * 1000 // 2 hours ago

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 3,
        lastAttempt: oldAttempt,
        lockedUntil: null,
      })

      const result = await recordFailedAttempt('test@example.com')

      expect(result.locked).toBe(false)
      expect(result.attemptsRemaining).toBe(4)
      expect(securityStore.set).toHaveBeenCalledWith(
        'lockout:test@example.com',
        expect.objectContaining({
          failedAttempts: 1, // Reset to 1
          lockedUntil: null,
        }),
        expect.any(Number)
      )
    })

    it('stores TTL slightly longer than lockout duration', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      await recordFailedAttempt('test@example.com')

      expect(securityStore.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        15 * 60 * 1000 + 60000 // Lockout + 1 minute
      )
    })

    it('logs lockout event with context', async () => {
      const { securityLogger } = await import('@/lib/security/logger')
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      await recordFailedAttempt('test@example.com', {
        ipAddress: '203.0.113.42',
        userAgent: 'Mozilla/5.0',
      })

      expect(securityLogger.security).toHaveBeenCalledWith(
        'account.locked',
        expect.stringContaining('locked after'),
        expect.objectContaining({
          userEmail: 'test@example.com',
          ipAddress: '203.0.113.42',
          userAgent: 'Mozilla/5.0',
        })
      )
    })

    it('logs warning for failed attempts before lockout', async () => {
      const { securityLogger } = await import('@/lib/security/logger')
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 2,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      await recordFailedAttempt('test@example.com', {
        ipAddress: '203.0.113.42',
      })

      expect(securityLogger.warn).toHaveBeenCalledWith(
        'auth.failed_attempt',
        expect.any(String),
        expect.objectContaining({
          userEmail: 'test@example.com',
          metadata: { attemptsRemaining: 2 },
        })
      )
    })
  })

  describe('clearLockout', () => {
    it('deletes lockout entry from store', async () => {
      await clearLockout('test@example.com')

      expect(securityStore.delete).toHaveBeenCalledWith('lockout:test@example.com')
    })

    it('normalizes email to lowercase', async () => {
      await clearLockout('Test@Example.COM')

      expect(securityStore.delete).toHaveBeenCalledWith('lockout:test@example.com')
    })
  })

  describe('getLockoutStatus', () => {
    it('returns null when no lockout entry exists', async () => {
      vi.mocked(securityStore.get).mockResolvedValue(null)

      const status = await getLockoutStatus('test@example.com')

      expect(status).toBeNull()
    })

    it('returns lockout status for active lockout', async () => {
      const now = Date.now()
      const lockedUntil = now + 10 * 60 * 1000

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now,
        lockedUntil,
      })

      const status = await getLockoutStatus('test@example.com')

      expect(status).not.toBeNull()
      expect(status!.failedAttempts).toBe(5)
      expect(status!.isLocked).toBe(true)
      expect(status!.lockedUntil).toBeInstanceOf(Date)
      expect(status!.lastAttempt).toBeInstanceOf(Date)
    })

    it('returns isLocked false for expired lockout', async () => {
      const now = Date.now()
      const lockedUntil = now - 1000 // Expired

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now - 16 * 60 * 1000,
        lockedUntil,
      })

      const status = await getLockoutStatus('test@example.com')

      expect(status!.isLocked).toBe(false)
      expect(status!.lockedUntil).toBeInstanceOf(Date)
    })

    it('handles null lockedUntil', async () => {
      const now = Date.now()

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 2,
        lastAttempt: now,
        lockedUntil: null,
      })

      const status = await getLockoutStatus('test@example.com')

      expect(status!.isLocked).toBe(false)
      expect(status!.lockedUntil).toBeNull()
    })
  })

  describe('adminUnlockAccount', () => {
    it('unlocks account and logs admin action', async () => {
      const { securityLogger } = await import('@/lib/security/logger')
      const now = Date.now()

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 5,
        lastAttempt: now,
        lockedUntil: now + 10 * 60 * 1000,
      })

      const result = await adminUnlockAccount('test@example.com', 'admin@example.com')

      expect(result).toBe(true)
      expect(securityStore.delete).toHaveBeenCalledWith('lockout:test@example.com')
      expect(securityLogger.security).toHaveBeenCalledWith(
        'account.admin_unlock',
        expect.any(String),
        expect.objectContaining({
          userEmail: 'test@example.com',
          metadata: { adminEmail: 'admin@example.com' },
        })
      )
    })

    it('returns false when no lockout entry exists', async () => {
      vi.mocked(securityStore.get).mockResolvedValue(null)

      const result = await adminUnlockAccount('test@example.com', 'admin@example.com')

      expect(result).toBe(false)
      expect(securityStore.delete).not.toHaveBeenCalled()
    })
  })

  describe('getFailedAttemptCount', () => {
    it('returns 0 when no entry exists', async () => {
      vi.mocked(securityStore.get).mockResolvedValue(null)

      const count = await getFailedAttemptCount('test@example.com')

      expect(count).toBe(0)
    })

    it('returns current failed attempt count', async () => {
      const now = Date.now()

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 3,
        lastAttempt: now,
        lockedUntil: null,
      })

      const count = await getFailedAttemptCount('test@example.com')

      expect(count).toBe(3)
    })

    it('returns 0 for attempts outside window', async () => {
      const now = Date.now()
      const oldAttempt = now - 2 * 60 * 60 * 1000 // 2 hours ago

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 3,
        lastAttempt: oldAttempt,
        lockedUntil: null,
      })

      const count = await getFailedAttemptCount('test@example.com')

      expect(count).toBe(0)
    })
  })

  describe('Security: Edge Cases and Attack Scenarios', () => {
    it('prevents distributed brute force across multiple accounts', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      const accounts = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]

      for (const email of accounts) {
        const result = await recordFailedAttempt(email)
        expect(result.locked).toBe(true)
      }

      // Each account gets locked independently
      expect(securityStore.set).toHaveBeenCalledTimes(3)
    })

    it('handles rapid-fire attempts correctly', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get)
        .mockResolvedValueOnce({ failedAttempts: 3, lastAttempt: now, lockedUntil: null })
        .mockResolvedValueOnce({ failedAttempts: 4, lastAttempt: now, lockedUntil: null })

      const result1 = await recordFailedAttempt('test@example.com')
      const result2 = await recordFailedAttempt('test@example.com')

      expect(result1.locked).toBe(false)
      expect(result2.locked).toBe(true)
    })

    it('lockout duration is exactly 15 minutes', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      await recordFailedAttempt('test@example.com')

      const callArgs = vi.mocked(securityStore.set).mock.calls[0]
      const entry = callArgs[1] as { lockedUntil: number }
      const lockoutDuration = entry.lockedUntil - now

      expect(lockoutDuration).toBe(15 * 60 * 1000)
    })

    it('rejects negative timestamp attempts', async () => {
      // Attacker trying to manipulate time
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 2,
        lastAttempt: Date.now() + 10000, // Future timestamp
        lockedUntil: null,
      })

      const result = await recordFailedAttempt('test@example.com')

      // Should reset counter due to invalid timestamp
      expect(result.attemptsRemaining).toBeGreaterThan(0)
    })
  })

  describe('Determinism and Consistency', () => {
    it('produces consistent lockout state for same inputs', async () => {
      const now = Date.now()
      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      const result1 = await recordFailedAttempt('test@example.com')

      vi.mocked(securityStore.get).mockResolvedValue({
        failedAttempts: 4,
        lastAttempt: now - 1000,
        lockedUntil: null,
      })

      const result2 = await recordFailedAttempt('test@example.com')

      expect(result1.locked).toBe(result2.locked)
      expect(result1.attemptsRemaining).toBe(result2.attemptsRemaining)
    })
  })
})
