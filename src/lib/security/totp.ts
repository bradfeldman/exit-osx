/**
 * TOTP (Time-based One-Time Password) Implementation
 * RFC 6238 compliant TOTP for two-factor authentication
 *
 * SECURITY: Secrets are stored encrypted in the database
 */

import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto'

// TOTP Configuration
const TOTP_PERIOD = 30 // seconds
const TOTP_DIGITS = 6
const TOTP_ALGORITHM = 'sha1'
const BACKUP_CODE_COUNT = 10
const BACKUP_CODE_LENGTH = 8

// Encryption for storing secrets
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // NIST-recommended 96-bit IV for AES-256-GCM
const _AUTH_TAG_LENGTH = 16

/**
 * Generate a random base32 secret for TOTP
 */
export function generateTotpSecret(): string {
  const buffer = randomBytes(20)
  return base32Encode(buffer)
}

/**
 * Generate a TOTP code for the current time
 */
export function generateTotp(secret: string, timestamp?: number): string {
  const time = timestamp || Date.now()
  const counter = Math.floor(time / 1000 / TOTP_PERIOD)
  return generateHotp(secret, counter)
}

/**
 * Verify a TOTP code with a time window tolerance
 * Allows for 1 period before and after to account for clock drift
 */
export function verifyTotp(secret: string, code: string, window: number = 1): boolean {
  if (!/^\d{6}$/.test(code)) {
    return false
  }

  const timestamp = Date.now()
  const counter = Math.floor(timestamp / 1000 / TOTP_PERIOD)

  // Check current and adjacent time periods
  for (let i = -window; i <= window; i++) {
    const expectedCode = generateHotp(secret, counter + i)
    if (constantTimeCompare(code, expectedCode)) {
      return true
    }
  }

  return false
}

/**
 * Generate an HOTP code (used internally by TOTP)
 */
function generateHotp(secret: string, counter: number): string {
  const decodedSecret = base32Decode(secret)

  // Counter as 8-byte big-endian
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(BigInt(counter))

  // HMAC-SHA1
  const hmac = createHmac(TOTP_ALGORITHM, decodedSecret)
  hmac.update(counterBuffer)
  const digest = hmac.digest()

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  const otp = binary % Math.pow(10, TOTP_DIGITS)
  return otp.toString().padStart(TOTP_DIGITS, '0')
}

/**
 * Generate backup codes for recovery
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = randomBytes(BACKUP_CODE_LENGTH / 2)
      .toString('hex')
      .toUpperCase()
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, '').toUpperCase()
  const hmac = createHmac('sha256', getEncryptionKey())
  hmac.update(normalized)
  return hmac.digest('hex')
}

/**
 * Verify a backup code against stored hashes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const inputHash = hashBackupCode(code)
  for (let i = 0; i < hashedCodes.length; i++) {
    if (constantTimeCompare(inputHash, hashedCodes[i])) {
      return i
    }
  }
  return -1
}

/**
 * Encrypt a TOTP secret for database storage
 */
export function encryptSecret(secret: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a TOTP secret from database
 */
export function decryptSecret(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')

  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generate a QR code URL for authenticator apps
 */
export function generateTotpUri(
  secret: string,
  email: string,
  issuer: string = 'ExitOSx'
): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`
}

// Helper functions

function getEncryptionKey(): Buffer {
  const secret = process.env.TOTP_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('TOTP_ENCRYPTION_KEY environment variable is required')
  }
  // Derive a 32-byte key from the secret
  const hmac = createHmac('sha256', secret)
  hmac.update('totp-encryption-key')
  return hmac.digest()
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Base32 encoding/decoding (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer): string {
  let result = ''
  let bits = 0
  let value = 0

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return result
}

function base32Decode(encoded: string): Buffer {
  const cleanInput = encoded.replace(/[^A-Z2-7]/gi, '').toUpperCase()
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (const char of cleanInput) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) continue

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

export { TOTP_PERIOD, TOTP_DIGITS }
