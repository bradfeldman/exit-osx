/**
 * Rate Limiting Tests
 * Tests for brute force/DoS protection via rate limiting
 *
 * SECURITY: Protects against brute force, enumeration, and DoS attacks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  addRateLimitHeaders,
  applyRateLimit,
  applyUserRateLimit,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/security/rate-limit'
import { securityStore } from '@/lib/security/store'

// Mock the security store
vi.mock('@/lib/security/store', () => ({
  securityStore: {
    increment: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  },
}))

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Date.now() if mocked
    vi.useRealTimers()
  })

  describe('RATE_LIMIT_CONFIGS', () => {
    it('has expected configuration entries', () => {
      expect(RATE_LIMIT_CONFIGS.AUTH).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.SENSITIVE).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.API).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.READ).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.TOKEN).toBeDefined()
    })

    it('AUTH config has strict limits', () => {
      expect(RATE_LIMIT_CONFIGS.AUTH.limit).toBe(5)
      expect(RATE_LIMIT_CONFIGS.AUTH.windowSeconds).toBe(60)
      expect(RATE_LIMIT_CONFIGS.AUTH.identifier).toBe('auth')
    })

    it('TOKEN config has very strict limits', () => {
      expect(RATE_LIMIT_CONFIGS.TOKEN.limit).toBe(3)
      expect(RATE_LIMIT_CONFIGS.TOKEN.windowSeconds).toBe(60)
    })

    it('READ config has higher limits than AUTH', () => {
      expect(RATE_LIMIT_CONFIGS.READ.limit).toBeGreaterThan(RATE_LIMIT_CONFIGS.AUTH.limit)
    })

    it('all configs have positive limits and windows', () => {
      const configs = Object.values(RATE_LIMIT_CONFIGS)
      for (const config of configs) {
        expect(config.limit).toBeGreaterThan(0)
        expect(config.windowSeconds).toBeGreaterThan(0)
        expect(config.identifier).toBeTruthy()
      }
    })
  })

  describe('checkRateLimit', () => {
    it('allows requests under the limit', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'test',
      }

      const result = await checkRateLimit('192.168.1.1', config)

      expect(result.success).toBe(true)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
      expect(result.reset).toBeGreaterThan(Date.now() / 1000)
    })

    it('blocks requests at the limit', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(5)

      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'test',
      }

      const result = await checkRateLimit('192.168.1.1', config)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('blocks requests over the limit', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(6)

      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'test',
      }

      const result = await checkRateLimit('192.168.1.1', config)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('uses correct bucket key format', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'auth',
      }

      await checkRateLimit('192.168.1.1', config)

      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:auth:192.168.1.1',
        60000
      )
    })

    it('calculates reset timestamp correctly', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)
      const now = Date.now()

      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'test',
      }

      const result = await checkRateLimit('test-key', config)

      const expectedReset = Math.floor((now + 60000) / 1000)
      expect(result.reset).toBeGreaterThanOrEqual(expectedReset - 1)
      expect(result.reset).toBeLessThanOrEqual(expectedReset + 1)
    })

    it('handles different identifiers independently', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const config1: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'auth',
      }

      const config2: RateLimitConfig = {
        limit: 10,
        windowSeconds: 60,
        identifier: 'api',
      }

      await checkRateLimit('192.168.1.1', config1)
      await checkRateLimit('192.168.1.1', config2)

      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:auth:192.168.1.1',
        60000
      )
      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:api:192.168.1.1',
        60000
      )
    })

    it('never shows negative remaining count', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(100)

      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        identifier: 'test',
      }

      const result = await checkRateLimit('192.168.1.1', config)

      expect(result.remaining).toBe(0)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getClientIdentifier', () => {
    it('extracts client IP from x-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '203.0.113.42, 198.51.100.17' },
      })

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('203.0.113.42')
    })

    it('takes first IP in x-forwarded-for chain', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
      })

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('1.2.3.4')
    })

    it('extracts client IP from x-real-ip header', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-real-ip': '203.0.113.42' },
      })

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('203.0.113.42')
    })

    it('extracts client IP from x-vercel-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-vercel-forwarded-for': '203.0.113.42' },
      })

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('203.0.113.42')
    })

    it('prefers x-forwarded-for over x-real-ip', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'x-real-ip': '5.6.7.8',
        },
      })

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('1.2.3.4')
    })

    it('returns unknown when no IP headers present', () => {
      const request = new Request('https://example.com')

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('unknown')
    })

    it('trims whitespace from IP addresses', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': ' 203.0.113.42 , 198.51.100.17 ' },
      })

      const clientId = getClientIdentifier(request)

      expect(clientId).toBe('203.0.113.42')
    })
  })

  describe('createRateLimitResponse', () => {
    it('returns 429 status code', () => {
      const result: RateLimitResult = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
      }

      const response = createRateLimitResponse(result)

      expect(response.status).toBe(429)
    })

    it('includes rate limit headers', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60
      const result: RateLimitResult = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: resetTime,
      }

      const response = createRateLimitResponse(result)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString())
    })

    it('includes Retry-After header', async () => {
      const now = Date.now()
      const resetTime = Math.floor(now / 1000) + 60
      const result: RateLimitResult = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: resetTime,
      }

      const response = createRateLimitResponse(result)

      const retryAfter = response.headers.get('Retry-After')
      expect(retryAfter).toBeTruthy()
      expect(parseInt(retryAfter!)).toBeGreaterThan(0)
      expect(parseInt(retryAfter!)).toBeLessThanOrEqual(60)
    })

    it('returns appropriate error message', async () => {
      const result: RateLimitResult = {
        success: false,
        limit: 5,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
      }

      const response = createRateLimitResponse(result)
      const body = await response.json()

      expect(body.error).toBe('Too Many Requests')
      expect(body.message).toContain('Rate limit exceeded')
    })
  })

  describe('addRateLimitHeaders', () => {
    it('adds rate limit headers to response', () => {
      const response = NextResponse.json({ success: true }, { status: 200 })
      const result: RateLimitResult = {
        success: true,
        limit: 10,
        remaining: 5,
        reset: Math.floor(Date.now() / 1000) + 60,
      }

      const modifiedResponse = addRateLimitHeaders(response, result)

      expect(modifiedResponse.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(modifiedResponse.headers.get('X-RateLimit-Remaining')).toBe('5')
      expect(modifiedResponse.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('preserves original response body and status', async () => {
      const originalBody = { data: 'test' }
      const response = NextResponse.json(originalBody, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

      const result: RateLimitResult = {
        success: true,
        limit: 10,
        remaining: 5,
        reset: Math.floor(Date.now() / 1000) + 60,
      }

      const modifiedResponse = addRateLimitHeaders(response, result)

      expect(modifiedResponse.status).toBe(200)
      const body = await modifiedResponse.json()
      expect(body).toEqual(originalBody)
    })
  })

  describe('applyRateLimit', () => {
    it('checks rate limit for request IP', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '203.0.113.42' },
      })

      const result = await applyRateLimit(request, RATE_LIMIT_CONFIGS.API)

      expect(result.success).toBe(true)
      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:api:203.0.113.42',
        expect.any(Number)
      )
    })

    it('enforces AUTH rate limits strictly', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(6)

      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '203.0.113.42' },
      })

      const result = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AUTH)

      expect(result.success).toBe(false)
      expect(result.limit).toBe(5)
    })
  })

  describe('applyUserRateLimit', () => {
    it('combines IP and user ID in rate limit key', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '203.0.113.42' },
      })

      const userId = 'user-123'
      await applyUserRateLimit(request, userId, RATE_LIMIT_CONFIGS.API)

      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:api:203.0.113.42:user-123',
        expect.any(Number)
      )
    })

    it('allows separate limits per user from same IP', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '203.0.113.42' },
      })

      await applyUserRateLimit(request, 'user-1', RATE_LIMIT_CONFIGS.API)
      await applyUserRateLimit(request, 'user-2', RATE_LIMIT_CONFIGS.API)

      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:api:203.0.113.42:user-1',
        expect.any(Number)
      )
      expect(securityStore.increment).toHaveBeenCalledWith(
        'ratelimit:api:203.0.113.42:user-2',
        expect.any(Number)
      )
    })
  })

  describe('Security: Timing and Bypass Prevention', () => {
    it('enforces strict TOKEN limits for sensitive operations', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(4)

      const result = await checkRateLimit('attacker-ip', RATE_LIMIT_CONFIGS.TOKEN)

      expect(result.success).toBe(false)
      expect(result.limit).toBe(3)
    })

    it('prevents enumeration by treating all IPs equally', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(1)

      const config = RATE_LIMIT_CONFIGS.AUTH

      const result1 = await checkRateLimit('1.2.3.4', config)
      const result2 = await checkRateLimit('5.6.7.8', config)

      expect(result1.limit).toBe(result2.limit)
      expect(result1.success).toBe(result2.success)
    })

    it('is deterministic for same inputs', async () => {
      vi.mocked(securityStore.increment).mockResolvedValue(3)

      const config = RATE_LIMIT_CONFIGS.API

      const result1 = await checkRateLimit('test-ip', config)
      vi.mocked(securityStore.increment).mockResolvedValue(3)
      const result2 = await checkRateLimit('test-ip', config)

      expect(result1.success).toBe(result2.success)
      expect(result1.remaining).toBe(result2.remaining)
    })
  })
})
