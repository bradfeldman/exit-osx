/**
 * Development Endpoint Protection
 * Prevents debug/developer endpoints from being accessed in production
 *
 * SECURITY: Developer endpoints can expose sensitive debugging information
 */

import { NextResponse } from 'next/server'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Check if developer endpoints should be accessible
 * In production, requires explicit ENABLE_DEV_ENDPOINTS=true
 */
export function isDevEndpointAllowed(): boolean {
  if (!isProduction) {
    return true // Always allow in development
  }

  // In production, only allow if explicitly enabled (for staging environments)
  return process.env.ENABLE_DEV_ENDPOINTS === 'true'
}

/**
 * Middleware to protect developer endpoints
 * Returns error response if not allowed, null if allowed
 */
export function requireDevEndpoint(): NextResponse | null {
  if (isDevEndpointAllowed()) {
    return null // Allowed
  }

  return NextResponse.json(
    { error: 'Not found' },
    { status: 404 }
  )
}

/**
 * Log access to developer endpoints for audit
 */
export function logDevEndpointAccess(
  endpoint: string,
  userId?: string,
  ip?: string
): void {
  console.log(`[DEV_ENDPOINT] Access: ${endpoint}`, {
    userId,
    ip,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}
