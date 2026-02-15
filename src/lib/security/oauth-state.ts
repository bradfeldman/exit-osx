/**
 * OAuth State Security Module
 * Provides HMAC-signed state parameters to prevent CSRF and state tampering
 *
 * SECURITY: Prevents attackers from modifying OAuth state to link
 * third-party accounts to unauthorized resources
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// SECURITY: Require explicit secret — no fallback to other secrets
const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET
if (!OAUTH_STATE_SECRET || OAUTH_STATE_SECRET.length < 32) {
  console.warn(
    'WARNING: OAUTH_STATE_SECRET not configured. OAuth flows may be vulnerable. ' +
    'Set OAUTH_STATE_SECRET environment variable (min 32 chars).'
  )
}

const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

interface OAuthStatePayload {
  /** The data to store in state (e.g., companyId) */
  data: Record<string, string>
  /** Timestamp when state was created */
  timestamp: number
  /** Random nonce to prevent replay */
  nonce: string
}

/**
 * Create a signed OAuth state parameter
 *
 * @param data - Key-value pairs to encode in state
 * @returns Base64-encoded signed state string
 */
export function createSignedOAuthState(data: Record<string, string>): string {
  if (!OAUTH_STATE_SECRET) {
    throw new Error('OAUTH_STATE_SECRET is not configured')
  }

  const payload: OAuthStatePayload = {
    data,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString('hex'),
  }

  const payloadString = JSON.stringify(payload)
  const payloadBase64 = Buffer.from(payloadString).toString('base64url')

  // Create HMAC signature
  const signature = createHmac('sha256', OAUTH_STATE_SECRET)
    .update(payloadBase64)
    .digest('base64url')

  // Combine payload and signature
  return `${payloadBase64}.${signature}`
}

/**
 * Verify and decode a signed OAuth state parameter
 *
 * @param state - The state parameter from OAuth callback
 * @returns The decoded data if valid, null if invalid or expired
 */
export function verifySignedOAuthState(
  state: string
): { data: Record<string, string>; valid: true } | { valid: false; error: string } {
  if (!OAUTH_STATE_SECRET) {
    return { valid: false, error: 'OAUTH_STATE_SECRET is not configured' }
  }

  // Split state into payload and signature
  const parts = state.split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid state format' }
  }

  const [payloadBase64, providedSignature] = parts

  // Verify signature using timing-safe comparison
  const expectedSignature = createHmac('sha256', OAUTH_STATE_SECRET)
    .update(payloadBase64)
    .digest('base64url')

  try {
    const providedBuffer = Buffer.from(providedSignature, 'base64url')
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url')

    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' }
    }
  } catch {
    return { valid: false, error: 'Invalid signature encoding' }
  }

  // Decode and validate payload
  let payload: OAuthStatePayload
  try {
    const payloadString = Buffer.from(payloadBase64, 'base64url').toString()
    payload = JSON.parse(payloadString)
  } catch {
    return { valid: false, error: 'Invalid payload encoding' }
  }

  // Check timestamp (prevent replay attacks)
  const age = Date.now() - payload.timestamp
  if (age > STATE_EXPIRY_MS) {
    return { valid: false, error: 'State expired' }
  }

  if (age < 0) {
    return { valid: false, error: 'Invalid timestamp' }
  }

  // Validate payload structure
  if (!payload.data || typeof payload.data !== 'object') {
    return { valid: false, error: 'Invalid payload structure' }
  }

  return { valid: true, data: payload.data }
}
