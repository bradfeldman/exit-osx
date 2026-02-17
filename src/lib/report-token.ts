import crypto from 'crypto'
import { constantTimeCompare } from '@/lib/security/timing-safe'

// SECURITY FIX (SEC-093): Reduced default from 7 days to 48 hours.
// TODO: Implement a ReportTokenRevocation table for explicit token revocation.
const DEFAULT_EXPIRY_SECONDS = 48 * 60 * 60

// Grace period for legacy tokens (no timestamp). Remove after 2026-03-16.
const LEGACY_TOKEN_CUTOFF = new Date('2026-03-16T00:00:00Z').getTime()

function getSecret(): string {
  const secret = process.env.REPORT_SHARE_SECRET
  if (!secret) {
    throw new Error(
      'REPORT_SHARE_SECRET is not configured. ' +
      'Set a strong random secret in your environment variables.'
    )
  }
  return secret
}

function getExpirySeconds(): number {
  const envValue = process.env.REPORT_TOKEN_EXPIRY_SECONDS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_EXPIRY_SECONDS
}

/**
 * Generate a signed, time-limited share token for a company's exit readiness report.
 * Token format (v2): base64url(companyId).timestamp.base64url(hmac)
 */
export function generateReportToken(companyId: string): string {
  const secret = getSecret()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payload = Buffer.from(companyId).toString('base64url')

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${companyId}:${timestamp}`)
    .digest('base64url')

  return `${payload}.${timestamp}.${signature}`
}

/**
 * Verify and decode a report share token.
 * Returns the companyId if valid and not expired, null otherwise.
 * Accepts v2 (3-part) and legacy v1 (2-part) formats until LEGACY_TOKEN_CUTOFF.
 */
export function verifyReportToken(token: string): string | null {
  const secret = getSecret()
  const parts = token.split('.')

  try {
    if (parts.length === 3) {
      return verifyV2Token(parts, secret)
    }

    // TODO: Remove legacy support after 2026-03-16
    if (parts.length === 2) {
      return verifyLegacyToken(parts, secret)
    }

    return null
  } catch {
    return null
  }
}

function verifyV2Token(parts: string[], secret: string): string | null {
  const [payload, timestampStr, signature] = parts

  const companyId = Buffer.from(payload, 'base64url').toString('utf-8')
  const timestamp = parseInt(timestampStr, 10)

  if (isNaN(timestamp) || timestamp <= 0) return null

  const nowSeconds = Math.floor(Date.now() / 1000)
  const expirySeconds = getExpirySeconds()
  if (nowSeconds - timestamp > expirySeconds) return null
  if (timestamp > nowSeconds + 60) return null

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${companyId}:${timestampStr}`)
    .digest('base64url')

  if (!constantTimeCompare(signature, expectedSignature)) return null

  return companyId
}

// TODO: Remove after 2026-03-16
function verifyLegacyToken(parts: string[], secret: string): string | null {
  if (Date.now() > LEGACY_TOKEN_CUTOFF) return null

  const [payload, signature] = parts
  const companyId = Buffer.from(payload, 'base64url').toString('utf-8')

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(companyId)
    .digest('base64url')

  if (!constantTimeCompare(signature, expectedSignature)) return null

  return companyId
}
