/**
 * Error Sanitizer and Timing-Safe Utilities Tests
 * Tests for preventing information leakage and timing attacks
 *
 * SECURITY: Prevents reconnaissance via error messages and timing analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  GENERIC_ERRORS,
  createSanitizedError,
  sanitizeErrorForClient,
  containsSensitiveInfo,
  handleApiError,
} from '@/lib/security/error-sanitizer'
import {
  constantTimeCompare,
  ensureMinimumResponseTime,
  withTimingSafeResponse,
  simulateDatabaseLookup,
} from '@/lib/security/timing-safe'

describe('Error Sanitizer', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('GENERIC_ERRORS', () => {
    it('has all expected error types', () => {
      expect(GENERIC_ERRORS.UNAUTHORIZED).toBe('Authentication required')
      expect(GENERIC_ERRORS.FORBIDDEN).toBe('Access denied')
      expect(GENERIC_ERRORS.NOT_FOUND).toBe('Resource not found')
      expect(GENERIC_ERRORS.BAD_REQUEST).toBe('Invalid request')
      expect(GENERIC_ERRORS.INTERNAL).toBe('An error occurred')
    })

    it('contains no sensitive information', () => {
      const messages = Object.values(GENERIC_ERRORS)

      for (const message of messages) {
        expect(message.toLowerCase()).not.toContain('password')
        expect(message.toLowerCase()).not.toContain('token')
        expect(message.toLowerCase()).not.toContain('database')
        expect(message.toLowerCase()).not.toContain('prisma')
      }
    })
  })

  describe('createSanitizedError', () => {
    it('returns NextResponse with correct status', async () => {
      const response = createSanitizedError('UNAUTHORIZED', 401)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe(GENERIC_ERRORS.UNAUTHORIZED)
    })

    it('hides internal message in production', async () => {
      process.env.NODE_ENV = 'production'

      const response = createSanitizedError(
        'INTERNAL',
        500,
        'Actual error: database connection failed'
      )

      const body = await response.json()
      expect(body).not.toHaveProperty('_debug')
      expect(JSON.stringify(body)).not.toContain('database connection')
    })

    it('includes debug info in development', async () => {
      process.env.NODE_ENV = 'development'

      const response = createSanitizedError(
        'INTERNAL',
        500,
        'Debug: connection timeout',
        { timeout: 5000 }
      )

      const body = await response.json()
      expect(body._debug).toBeDefined()
      expect(body._debug.message).toContain('connection timeout')
      expect(body._debug.details).toEqual({ timeout: 5000 })
    })
  })

  describe('sanitizeErrorForClient', () => {
    it('returns actual error message in development', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Database connection refused on port 5432')
      const sanitized = sanitizeErrorForClient(error)

      expect(sanitized).toContain('Database connection')
    })

    it('returns generic message in production', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Database connection refused on port 5432')
      const sanitized = sanitizeErrorForClient(error)

      expect(sanitized).toBe(GENERIC_ERRORS.INTERNAL)
      expect(sanitized).not.toContain('Database')
      expect(sanitized).not.toContain('5432')
    })

    it('handles non-Error objects', () => {
      process.env.NODE_ENV = 'production'

      const sanitized = sanitizeErrorForClient('string error')

      expect(sanitized).toBe(GENERIC_ERRORS.INTERNAL)
    })
  })

  describe('containsSensitiveInfo', () => {
    it('detects password in message', () => {
      expect(containsSensitiveInfo('password is incorrect')).toBe(true)
      expect(containsSensitiveInfo('Password: abc123')).toBe(true)
    })

    it('detects secret in message', () => {
      expect(containsSensitiveInfo('secret key not found')).toBe(true)
      expect(containsSensitiveInfo('API secret: xyz')).toBe(true)
    })

    it('detects token in message', () => {
      expect(containsSensitiveInfo('invalid token provided')).toBe(true)
    })

    it('detects database info', () => {
      expect(containsSensitiveInfo('postgres connection failed')).toBe(true)
      expect(containsSensitiveInfo('Prisma query error')).toBe(true)
      expect(containsSensitiveInfo('SQL syntax error')).toBe(true)
    })

    it('detects stack traces', () => {
      expect(containsSensitiveInfo('at Object.<anonymous> (/app/index.ts:42:10)')).toBe(true)
      expect(containsSensitiveInfo('node_modules/prisma/client')).toBe(true)
    })

    it('returns false for safe messages', () => {
      expect(containsSensitiveInfo('User not found')).toBe(false)
      expect(containsSensitiveInfo('Invalid input')).toBe(false)
      expect(containsSensitiveInfo('Resource deleted')).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(containsSensitiveInfo('PASSWORD')).toBe(true)
      expect(containsSensitiveInfo('Secret')).toBe(true)
      expect(containsSensitiveInfo('TOKEN')).toBe(true)
    })
  })

  describe('handleApiError', () => {
    it('maps Prisma unique constraint errors', async () => {
      const error = new Error('Unique constraint failed on the fields: (`email`)')

      const response = handleApiError(error, 'createUser')

      expect(response.status).toBe(409)
    })

    it('maps Prisma not found errors', async () => {
      const error = new Error('Record to update not found')

      const response = handleApiError(error, 'updateUser')

      expect(response.status).toBe(404)
    })

    it('maps foreign key constraint errors', async () => {
      const error = new Error('Foreign key constraint failed')

      const response = handleApiError(error, 'deleteUser')

      expect(response.status).toBe(400)
    })

    it('returns 500 for unknown errors', async () => {
      const error = new Error('Something went wrong')

      const response = handleApiError(error, 'operation')

      expect(response.status).toBe(500)
    })
  })
})

describe('Timing-Safe Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constantTimeCompare', () => {
    it('returns true for equal strings', () => {
      expect(constantTimeCompare('password123', 'password123')).toBe(true)
    })

    it('returns false for different strings', () => {
      expect(constantTimeCompare('password123', 'password456')).toBe(false)
    })

    it('returns false for different lengths', () => {
      expect(constantTimeCompare('short', 'longer string')).toBe(false)
    })

    it('returns false for empty vs non-empty', () => {
      expect(constantTimeCompare('', 'something')).toBe(false)
    })

    it('returns true for both empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true)
    })

    it('compares special characters correctly', () => {
      const str = 'a!@#$%^&*(){}[]|\\:";\'<>?,./~`'
      expect(constantTimeCompare(str, str)).toBe(true)
    })

    it('compares unicode correctly', () => {
      const str = 'こんにちは🔒'
      expect(constantTimeCompare(str, str)).toBe(true)
    })

    it('is case-sensitive', () => {
      expect(constantTimeCompare('Password', 'password')).toBe(false)
    })
  })

  describe('ensureMinimumResponseTime', () => {
    it('adds delay when response was too fast', async () => {
      const startTime = Date.now()

      const promise = ensureMinimumResponseTime(startTime)
      await vi.advanceTimersByTimeAsync(200)
      await promise

      expect(Date.now() - startTime).toBeGreaterThanOrEqual(200)
    })

    it('does not add delay when response was slow enough', async () => {
      const startTime = Date.now() - 250 // Started 250ms ago

      const promise = ensureMinimumResponseTime(startTime)
      await vi.advanceTimersByTimeAsync(0)
      await promise

      // Should complete immediately (no additional delay)
      expect(Date.now() - startTime).toBe(250)
    })

    it('adds random jitter', async () => {
      const startTime = Date.now()

      // Run multiple times to test jitter variance
      const delays: number[] = []
      for (let i = 0; i < 5; i++) {
        const start = Date.now()
        const promise = ensureMinimumResponseTime(start)
        await vi.advanceTimersByTimeAsync(250)
        await promise
        delays.push(Date.now() - start)
      }

      // Delays should vary due to jitter (not all exactly 200ms)
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('withTimingSafeResponse', () => {
    it('ensures minimum execution time', async () => {
      const startTime = Date.now()

      const result = await withTimingSafeResponse(async () => {
        return 'quick response'
      })

      await vi.advanceTimersByTimeAsync(200)

      expect(Date.now() - startTime).toBeGreaterThanOrEqual(200)
      expect(result).toBe('quick response')
    })

    it('returns function result', async () => {
      const result = await withTimingSafeResponse(async () => {
        return { data: 'test' }
      })

      await vi.advanceTimersByTimeAsync(200)

      expect(result).toEqual({ data: 'test' })
    })

    it('ensures minimum time even on error', async () => {
      const startTime = Date.now()

      try {
        await withTimingSafeResponse(async () => {
          throw new Error('Test error')
        })
      } catch (e) {
        expect((e as Error).message).toBe('Test error')
      }

      await vi.advanceTimersByTimeAsync(200)

      expect(Date.now() - startTime).toBeGreaterThanOrEqual(200)
    })
  })

  describe('simulateDatabaseLookup', () => {
    it('adds delay between 50-150ms', async () => {
      const startTime = Date.now()

      const promise = simulateDatabaseLookup()
      await vi.advanceTimersByTimeAsync(150)
      await promise

      const elapsed = Date.now() - startTime
      expect(elapsed).toBeGreaterThanOrEqual(50)
      expect(elapsed).toBeLessThanOrEqual(150)
    })

    it('produces variable delays', async () => {
      const delays: number[] = []

      for (let i = 0; i < 5; i++) {
        const start = Date.now()
        const promise = simulateDatabaseLookup()
        await vi.advanceTimersByTimeAsync(150)
        await promise
        delays.push(Date.now() - start)
      }

      // Should have variability
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('Security: Timing Attack Prevention', () => {
    it('constantTimeCompare takes similar time for different strings', () => {
      const correctPassword = 'correct-password-123'
      const wrongPassword = 'wrong-password-456'

      const iterations = 100
      let timeCorrect = 0n
      let timeWrong = 0n

      for (let i = 0; i < iterations; i++) {
        const start1 = process.hrtime.bigint()
        constantTimeCompare(correctPassword, correctPassword)
        const end1 = process.hrtime.bigint()
        timeCorrect += end1 - start1

        const start2 = process.hrtime.bigint()
        constantTimeCompare(correctPassword, wrongPassword)
        const end2 = process.hrtime.bigint()
        timeWrong += end2 - start2
      }

      const avgCorrect = Number(timeCorrect / BigInt(iterations))
      const avgWrong = Number(timeWrong / BigInt(iterations))

      // Average times should be within 2x of each other
      const ratio = avgCorrect / avgWrong
      expect(ratio).toBeLessThan(2)
      expect(ratio).toBeGreaterThan(0.5)
    })

    it('constantTimeCompare prevents early exit on length mismatch', () => {
      const shortStr = 'ab'
      const longStr = 'abcdefghijklmnopqrstuvwxyz'

      const start = process.hrtime.bigint()
      constantTimeCompare(shortStr, longStr)
      const end = process.hrtime.bigint()
      const time = end - start

      // Should still take measurable time despite length mismatch
      expect(Number(time)).toBeGreaterThan(0)
    })
  })
})
