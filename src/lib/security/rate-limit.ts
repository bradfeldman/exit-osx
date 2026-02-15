/**
 * Rate Limiting Module
 * Provides rate limiting for API routes using Redis (production) or in-memory store (dev)
 *
 * SECURITY: Protects against brute force, enumeration, and DoS attacks
 */

import { NextResponse } from 'next/server'
import { securityStore } from './store'

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
  /** Identifier prefix for the rate limit bucket */
  identifier: string
}

// Predefined configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Strict limits for authentication endpoints
  AUTH: {
    limit: 5,
    windowSeconds: 60, // 5 requests per minute
    identifier: 'auth',
  },
  // Strict limits for sensitive operations
  SENSITIVE: {
    limit: 10,
    windowSeconds: 60, // 10 requests per minute
    identifier: 'sensitive',
  },
  // Standard API limits
  API: {
    limit: 60,
    windowSeconds: 60, // 60 requests per minute
    identifier: 'api',
  },
  // Higher limits for read-only operations
  READ: {
    limit: 120,
    windowSeconds: 60, // 120 requests per minute
    identifier: 'read',
  },
  // Very strict for token/invite validation
  TOKEN: {
    limit: 3,
    windowSeconds: 60, // 3 requests per minute
    identifier: 'token',
  },
  // AI/LLM endpoints — expensive API calls (SEC-034)
  AI: {
    limit: 10,
    windowSeconds: 60, // 10 requests per minute per user
    identifier: 'ai',
  },
} as const

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when the limit resets
}

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const bucketKey = `ratelimit:${config.identifier}:${key}`
  const windowMs = config.windowSeconds * 1000
  const resetTime = Date.now() + windowMs

  // Increment counter (atomically in Redis)
  const count = await securityStore.increment(bucketKey, windowMs)

  const success = count <= config.limit

  return {
    success,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    reset: Math.floor(resetTime / 1000),
  }
}

/**
 * Get client identifier from request
 * Uses IP address with fallback to forwarded headers
 */
export function getClientIdentifier(request: Request): string {
  const headers = new Headers(request.headers)

  // Check various headers for client IP (in order of preference)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Vercel-specific header
  const vercelIp = headers.get('x-vercel-forwarded-for')
  if (vercelIp) {
    return vercelIp.split(',')[0].trim()
  }

  // Fallback - this shouldn't happen in production
  return 'unknown'
}

/**
 * Create rate limit response with appropriate headers
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.reset - Math.floor(Date.now() / 1000),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString(),
      },
    }
  )
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}

/**
 * Rate limit middleware helper for API routes
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AUTH)
 *   if (!rateLimitResult.success) {
 *     return createRateLimitResponse(rateLimitResult)
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export async function applyRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clientId = getClientIdentifier(request)
  return checkRateLimit(clientId, config)
}

/**
 * Rate limit with user ID for authenticated endpoints
 * Combines IP + user ID for more accurate limiting
 */
export async function applyUserRateLimit(
  request: Request,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clientId = getClientIdentifier(request)
  const key = `${clientId}:${userId}`
  return checkRateLimit(key, config)
}
