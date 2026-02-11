/**
 * Password Breach Checking Tests
 * Tests HaveIBeenPwned k-Anonymity password breach detection
 *
 * SECURITY: Prevents use of compromised passwords
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkPasswordBreach,
  getBreachMessage,
  validatePassword,
  getPasswordWarning,
} from '@/lib/security/password-breach'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('@/lib/security/logger', () => ({
  securityLogger: {
    error: vi.fn(),
  },
}))

describe('Password Breach Checking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkPasswordBreach', () => {
    it('returns not breached for clean password', async () => {
      // Mock HIBP API response with no match
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'ABC123:10\nDEF456:5\nGHI789:2',
      })

      const result = await checkPasswordBreach('MySecurePass123!')

      expect(result.breached).toBe(false)
      expect(result.count).toBeUndefined()
    })

    it('returns breached with count for compromised password', async () => {
      const password = 'password123'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const suffix = hash.substring(5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:12345\nOTHER:10`,
      })

      const result = await checkPasswordBreach(password)

      expect(result.breached).toBe(true)
      expect(result.count).toBe(12345)
    })

    it('uses k-Anonymity (only sends first 5 chars of hash)', async () => {
      const password = 'TestPassword'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const prefix = hash.substring(0, 5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      await checkPasswordBreach(password)

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'ExitOSx-Security-Check',
            'Add-Padding': 'true',
          }),
        })
      )
    })

    it('adds padding header to prevent response size analysis', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      await checkPasswordBreach('password')

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['Add-Padding']).toBe('true')
    })

    it('returns not breached on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const result = await checkPasswordBreach('password')

      expect(result.breached).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('returns not breached on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await checkPasswordBreach('password')

      expect(result.breached).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('handles case-insensitive hash matching', async () => {
      const password = 'test'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex')
      const suffix = hash.substring(5).toUpperCase()

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:100`,
      })

      const result = await checkPasswordBreach(password)

      expect(result.breached).toBe(true)
    })

    it('handles empty response from API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      const result = await checkPasswordBreach('UniquePassword123!')

      expect(result.breached).toBe(false)
    })

    it('trims whitespace from hash suffix', async () => {
      const password = 'test'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const suffix = hash.substring(5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `  ${suffix}  : 42  \n`,
      })

      const result = await checkPasswordBreach(password)

      expect(result.breached).toBe(true)
      expect(result.count).toBe(42)
    })
  })

  describe('getBreachMessage', () => {
    it('returns appropriate message for massive breaches', () => {
      const message = getBreachMessage(5000000)

      expect(message).toContain('5 million')
    })

    it('returns appropriate message for large breaches', () => {
      const message = getBreachMessage(50000)

      expect(message).toContain('50k')
    })

    it('returns appropriate message for moderate breaches', () => {
      const message = getBreachMessage(150)

      expect(message).toContain('150')
      expect(message).toContain('data breaches')
    })

    it('returns appropriate message for small breaches', () => {
      const message = getBreachMessage(5)

      expect(message).toContain('5 data breaches')
    })

    it('returns generic message for single breach', () => {
      const message = getBreachMessage(1)

      expect(message).toContain('exposed in a data breach')
    })
  })

  describe('validatePassword', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })
    })

    it('rejects passwords shorter than 8 characters', async () => {
      const result = await validatePassword('short')

      expect(result).toContain('at least 8 characters')
    })

    it('rejects passwords longer than 128 characters', async () => {
      const longPassword = 'a'.repeat(129)

      const result = await validatePassword(longPassword)

      expect(result).toContain('less than 128 characters')
    })

    it('accepts 8-character password', async () => {
      const result = await validatePassword('Passw0rd')

      expect(result).toBeNull()
    })

    it('accepts 128-character password', async () => {
      // Use a mixed-character password to avoid the "all same character" pattern
      const password = 'A1b2C3d4'.repeat(16) // 128 characters with variety

      const result = await validatePassword(password)

      expect(result).toBeNull()
    })

    it('rejects all same character', async () => {
      const result = await validatePassword('aaaaaaaa')

      expect(result).toContain('too common')
    })

    it('rejects sequential numbers', async () => {
      const result = await validatePassword('123123123')

      expect(result).toContain('too common')
    })

    it('rejects sequential letters', async () => {
      const result = await validatePassword('abcabcabc')

      expect(result).toContain('too common')
    })

    it('rejects passwords starting with password', async () => {
      const result = await validatePassword('password123')

      expect(result).toContain('too common')
    })

    it('rejects passwords starting with qwerty', async () => {
      const result = await validatePassword('qwerty123')

      expect(result).toContain('too common')
    })

    it('rejects passwords starting with admin', async () => {
      const result = await validatePassword('admin1234')

      expect(result).toContain('too common')
    })

    it('rejects breached passwords seen > 10 times', async () => {
      const password = 'testpass1234' // 12 characters to meet length requirement
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const suffix = hash.substring(5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:100`,
      })

      const result = await validatePassword(password)

      expect(result).not.toBeNull()
      expect(result).toContain('data breaches')
    })

    it('accepts breached passwords seen <= 10 times', async () => {
      const password = 'RarePassword123!'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const suffix = hash.substring(5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:5`,
      })

      const result = await validatePassword(password)

      expect(result).toBeNull()
    })

    it('accepts strong unique password', async () => {
      const result = await validatePassword('MyStr0ng!P@ssw0rd2024')

      expect(result).toBeNull()
    })
  })

  describe('getPasswordWarning', () => {
    it('returns warning for passwords breached > 100 times', async () => {
      const password = 'test'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const suffix = hash.substring(5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:500`,
      })

      const warning = await getPasswordWarning(password)

      expect(warning).not.toBeNull()
      expect(warning).toContain('data breaches')
    })

    it('returns warning for passwords breached 1-100 times', async () => {
      const password = 'test'
      const hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase()
      const suffix = hash.substring(5)

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:50`,
      })

      const warning = await getPasswordWarning(password)

      expect(warning).toContain('small number of data breaches')
    })

    it('returns null for clean password', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'NOTMATCHING:100',
      })

      const warning = await getPasswordWarning('UniquePassword123!')

      expect(warning).toBeNull()
    })
  })

  describe('Security: Privacy and Timing', () => {
    it('never sends full password to API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      await checkPasswordBreach('MySecretPassword123!')

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).not.toContain('MySecretPassword')
      expect(callUrl).toMatch(/\/range\/[A-F0-9]{5}$/)
    })

    it('never sends full hash to API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      await checkPasswordBreach('password')

      const callUrl = mockFetch.mock.calls[0][0] as string
      const hashPart = callUrl.split('/').pop()
      expect(hashPart?.length).toBe(5)
    })

    it('produces consistent results for same password', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      const result1 = await checkPasswordBreach('test123')
      const result2 = await checkPasswordBreach('test123')

      expect(result1.breached).toBe(result2.breached)
    })

    it('uses SHA-1 hash as required by HIBP API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '',
      })

      await checkPasswordBreach('test')

      // SHA-1 of "test" is a94a8fe5ccb19ba61c4c0873d391e987982fbbd3
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('/A94A8')
    })
  })
})
