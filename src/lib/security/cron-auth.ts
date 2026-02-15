/**
 * Cron Job Authentication
 *
 * SECURITY FIX (PROD-060): Cron routes previously used the pattern:
 *   if (process.env.NODE_ENV === 'production' && CRON_SECRET) { ... }
 * which FAILS OPEN when CRON_SECRET is not configured — meaning any
 * unauthenticated request could trigger cron jobs in production.
 *
 * This helper fails CLOSED: if CRON_SECRET is not set in production,
 * the cron endpoint returns 503 instead of executing.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Verify that a request is authorized to trigger a cron job.
 *
 * Returns null if authorized, or a NextResponse error if not.
 *
 * Usage:
 * ```ts
 * export async function GET(request: Request) {
 *   const authError = verifyCronAuth(request)
 *   if (authError) return authError
 *   // ... cron logic
 * }
 * ```
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  // In development, always allow (no secret needed for local testing)
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  const cronSecret = process.env.CRON_SECRET

  // SECURITY: Fail closed — if CRON_SECRET is not configured in production,
  // block all cron execution rather than allowing unauthenticated access.
  if (!cronSecret) {
    console.error(
      '[Security] CRON_SECRET not configured in production — blocking cron execution (fail closed). ' +
      'Set CRON_SECRET in environment variables to enable cron jobs.'
    )
    return NextResponse.json(
      { error: 'Cron endpoint not configured. Contact administrator.' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')

  // SECURITY FIX: Use constant-time comparison to prevent timing attacks
  const expected = `Bearer ${cronSecret}`
  const actual = authHeader || ''
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(actual)
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null // Authorized
}
