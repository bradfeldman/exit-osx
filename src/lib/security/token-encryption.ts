/**
 * Token Encryption Module
 * AES-256-GCM encryption for OAuth tokens at rest.
 *
 * SECURITY: Intuit requires tokens to be encrypted at rest with AES.
 * The encryption key (TOKEN_ENCRYPTION_KEY) must be stored separately
 * from the database, as an environment variable.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.TOKEN_ENCRYPTION_KEY
  if (!keyBase64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is not configured. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  const key = Buffer.from(keyBase64, 'base64')
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return key
}

/**
 * Encrypt a plaintext token using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all base64url-encoded)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

/**
 * Decrypt an encrypted token string (iv:authTag:ciphertext format).
 * Returns the original plaintext.
 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }

  const [ivB64, authTagB64, ciphertextB64] = parts
  const iv = Buffer.from(ivB64, 'base64url')
  const authTag = Buffer.from(authTagB64, 'base64url')
  const ciphertext = Buffer.from(ciphertextB64, 'base64url')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/**
 * Check if a value looks like it's already encrypted (iv:tag:data format).
 * Used to avoid double-encrypting during migration.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 3) return false

  // Each part should be valid base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  return parts.every((part) => base64urlRegex.test(part) && part.length > 0)
}
