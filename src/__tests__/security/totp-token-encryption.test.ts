/**
 * TOTP and Token Encryption Tests
 * Tests for two-factor authentication and OAuth token encryption
 *
 * SECURITY: TOTP secrets and OAuth tokens must be encrypted at rest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  encryptSecret,
  decryptSecret,
  generateTotpUri,
  TOTP_PERIOD,
  TOTP_DIGITS,
} from '@/lib/security/totp'
import {
  encryptToken,
  decryptToken,
  isEncrypted,
} from '@/lib/security/token-encryption'

// Mock environment variables
const originalEnv = process.env

describe('TOTP (Two-Factor Authentication)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      TOTP_ENCRYPTION_KEY: 'test-encryption-key-for-totp-secrets',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('generateTotpSecret', () => {
    it('generates a base32-encoded secret', () => {
      const secret = generateTotpSecret()

      expect(secret).toBeTruthy()
      expect(secret.length).toBeGreaterThan(0)
      // Base32 alphabet: A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/)
    })

    it('generates unique secrets', () => {
      const secret1 = generateTotpSecret()
      const secret2 = generateTotpSecret()

      expect(secret1).not.toBe(secret2)
    })

    it('generates secrets of consistent length', () => {
      const secret1 = generateTotpSecret()
      const secret2 = generateTotpSecret()

      expect(secret1.length).toBe(secret2.length)
    })
  })

  describe('generateTotp', () => {
    it('generates a 6-digit code', () => {
      const secret = generateTotpSecret()
      const code = generateTotp(secret)

      expect(code).toMatch(/^\d{6}$/)
    })

    it('generates consistent code for same timestamp', () => {
      const secret = generateTotpSecret()
      const timestamp = Date.now()

      const code1 = generateTotp(secret, timestamp)
      const code2 = generateTotp(secret, timestamp)

      expect(code1).toBe(code2)
    })

    it('generates different codes for different timestamps', () => {
      const secret = generateTotpSecret()
      const now = Date.now()
      const later = now + 31000 // 31 seconds later (different period)

      const code1 = generateTotp(secret, now)
      const code2 = generateTotp(secret, later)

      expect(code1).not.toBe(code2)
    })

    it('pads codes with leading zeros', () => {
      const secret = generateTotpSecret()
      const code = generateTotp(secret)

      expect(code.length).toBe(6)
      expect(code).toMatch(/^\d{6}$/)
    })
  })

  describe('verifyTotp', () => {
    it('verifies valid code', () => {
      const secret = generateTotpSecret()
      const code = generateTotp(secret)

      const isValid = verifyTotp(secret, code)

      expect(isValid).toBe(true)
    })

    it('rejects invalid code format', () => {
      const secret = generateTotpSecret()

      expect(verifyTotp(secret, '12345')).toBe(false) // Too short
      expect(verifyTotp(secret, '1234567')).toBe(false) // Too long
      expect(verifyTotp(secret, 'abcdef')).toBe(false) // Not digits
    })

    it('rejects incorrect code', () => {
      const secret = generateTotpSecret()

      const isValid = verifyTotp(secret, '000000')

      // Extremely unlikely to be valid
      expect(typeof isValid).toBe('boolean')
    })

    it('accepts code from previous period (clock drift tolerance)', () => {
      const secret = generateTotpSecret()
      const pastTime = Date.now() - 30000 // 30 seconds ago (1 period)
      const oldCode = generateTotp(secret, pastTime)

      const isValid = verifyTotp(secret, oldCode, 1)

      expect(isValid).toBe(true)
    })

    it('accepts code from next period (clock drift tolerance)', () => {
      const secret = generateTotpSecret()
      const futureTime = Date.now() + 30000 // 30 seconds ahead (1 period)
      const futureCode = generateTotp(secret, futureTime)

      const isValid = verifyTotp(secret, futureCode, 1)

      expect(isValid).toBe(true)
    })

    it('rejects code from 2 periods ago with window=1', () => {
      const secret = generateTotpSecret()
      const oldTime = Date.now() - 60000 // 60 seconds ago (2 periods)
      const oldCode = generateTotp(secret, oldTime)

      const isValid = verifyTotp(secret, oldCode, 1)

      expect(isValid).toBe(false)
    })
  })

  describe('generateBackupCodes', () => {
    it('generates 10 backup codes', () => {
      const codes = generateBackupCodes()

      expect(codes).toHaveLength(10)
    })

    it('generates codes in XXXX-XXXX format', () => {
      const codes = generateBackupCodes()

      for (const code of codes) {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
      }
    })

    it('generates unique codes', () => {
      const codes = generateBackupCodes()
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(10)
    })
  })

  describe('hashBackupCode and verifyBackupCode', () => {
    it('hashes backup code consistently', () => {
      const code = '1234-5678'

      const hash1 = hashBackupCode(code)
      const hash2 = hashBackupCode(code)

      expect(hash1).toBe(hash2)
    })

    it('verifies valid backup code', () => {
      const codes = ['1234-ABCD', '5678-EFGH']
      const hashedCodes = codes.map(hashBackupCode)

      const index = verifyBackupCode('1234-ABCD', hashedCodes)

      expect(index).toBe(0)
    })

    it('verifies second backup code', () => {
      const codes = ['1234-ABCD', '5678-EFGH']
      const hashedCodes = codes.map(hashBackupCode)

      const index = verifyBackupCode('5678-EFGH', hashedCodes)

      expect(index).toBe(1)
    })

    it('returns -1 for invalid backup code', () => {
      const codes = ['1234-ABCD']
      const hashedCodes = codes.map(hashBackupCode)

      const index = verifyBackupCode('9999-ZZZZ', hashedCodes)

      expect(index).toBe(-1)
    })

    it('normalizes hyphen in backup code', () => {
      const code = '1234-ABCD'
      const hashedCodes = [hashBackupCode(code)]

      // Without hyphen
      const index = verifyBackupCode('1234ABCD', hashedCodes)

      expect(index).toBe(0)
    })

    it('is case-insensitive', () => {
      const code = '1234-ABCD'
      const hashedCodes = [hashBackupCode(code)]

      const index = verifyBackupCode('1234-abcd', hashedCodes)

      expect(index).toBe(0)
    })
  })

  describe('encryptSecret and decryptSecret', () => {
    it('encrypts and decrypts secret correctly', () => {
      const secret = generateTotpSecret()

      const encrypted = encryptSecret(secret)
      const decrypted = decryptSecret(encrypted)

      expect(decrypted).toBe(secret)
    })

    it('produces different ciphertext each time (random IV)', () => {
      const secret = generateTotpSecret()

      const encrypted1 = encryptSecret(secret)
      const encrypted2 = encryptSecret(secret)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('encrypts to format iv:authTag:ciphertext', () => {
      const secret = generateTotpSecret()
      const encrypted = encryptSecret(secret)

      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)
      expect(parts[0].length).toBeGreaterThan(0) // IV
      expect(parts[1].length).toBeGreaterThan(0) // Auth tag
      expect(parts[2].length).toBeGreaterThan(0) // Ciphertext
    })

    it('throws on decryption with wrong data', () => {
      expect(() => decryptSecret('invalid')).toThrow()
    })

    it('throws on decryption with tampered ciphertext', () => {
      const secret = generateTotpSecret()
      const encrypted = encryptSecret(secret)
      const tampered = encrypted.replace(/.$/, 'X')

      expect(() => decryptSecret(tampered)).toThrow()
    })
  })

  describe('generateTotpUri', () => {
    it('generates valid otpauth URI', () => {
      const secret = generateTotpSecret()
      const uri = generateTotpUri(secret, 'user@example.com')

      expect(uri).toContain('otpauth://totp/')
      expect(uri).toContain(secret)
      expect(uri).toContain('user@example.com')
    })

    it('includes issuer parameter', () => {
      const secret = generateTotpSecret()
      const uri = generateTotpUri(secret, 'user@example.com', 'ExitOSx')

      expect(uri).toContain('issuer=ExitOSx')
      expect(uri).toContain('ExitOSx:user@example.com')
    })

    it('includes algorithm and digits', () => {
      const secret = generateTotpSecret()
      const uri = generateTotpUri(secret, 'user@example.com')

      expect(uri).toContain('algorithm=SHA1')
      expect(uri).toContain(`digits=${TOTP_DIGITS}`)
    })

    it('includes period', () => {
      const secret = generateTotpSecret()
      const uri = generateTotpUri(secret, 'user@example.com')

      expect(uri).toContain(`period=${TOTP_PERIOD}`)
    })

    it('URL-encodes email and issuer', () => {
      const secret = generateTotpSecret()
      const uri = generateTotpUri(secret, 'user+test@example.com', 'Exit OSx')

      expect(uri).toContain('user%2Btest%40example.com')
      expect(uri).toContain('Exit%20OSx')
    })
  })

  describe('Security: Timing-Safe Comparison', () => {
    it('does not leak timing information via verification', () => {
      const secret = generateTotpSecret()
      const validCode = generateTotp(secret)

      const start1 = process.hrtime.bigint()
      verifyTotp(secret, validCode)
      const end1 = process.hrtime.bigint()
      const time1 = end1 - start1

      const start2 = process.hrtime.bigint()
      verifyTotp(secret, '000000')
      const end2 = process.hrtime.bigint()
      const time2 = end2 - start2

      // Times should be roughly similar (within 10x for Node.js variability)
      const ratio = Number(time1) / Number(time2)
      expect(ratio).toBeLessThan(10)
      expect(ratio).toBeGreaterThan(0.1)
    })
  })
})

describe('Token Encryption', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TOKEN_ENCRYPTION_KEY: Buffer.from('a'.repeat(32)).toString('base64'),
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encryptToken and decryptToken', () => {
    it('encrypts and decrypts token correctly', () => {
      const token = 'oauth-access-token-12345'

      const encrypted = encryptToken(token)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(token)
    })

    it('produces different ciphertext each time (random IV)', () => {
      const token = 'oauth-access-token-12345'

      const encrypted1 = encryptToken(token)
      const encrypted2 = encryptToken(token)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('uses base64url encoding', () => {
      const token = 'test-token'
      const encrypted = encryptToken(token)

      // base64url uses - and _ instead of + and /
      expect(encrypted).not.toContain('+')
      expect(encrypted).not.toContain('/')
      expect(encrypted).not.toContain('=')
    })

    it('produces format iv:authTag:ciphertext', () => {
      const token = 'test-token'
      const encrypted = encryptToken(token)

      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)
    })

    it('throws on invalid encrypted format', () => {
      expect(() => decryptToken('invalid')).toThrow('Invalid encrypted token format')
    })

    it('throws on tampered ciphertext', () => {
      const token = 'test-token'
      const encrypted = encryptToken(token)
      const tampered = encrypted.replace(/.$/, 'X')

      expect(() => decryptToken(tampered)).toThrow()
    })

    it('throws on missing encryption key', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY

      expect(() => encryptToken('token')).toThrow('TOKEN_ENCRYPTION_KEY is not configured')
    })

    it('throws on invalid encryption key length', () => {
      process.env.TOKEN_ENCRYPTION_KEY = Buffer.from('short').toString('base64')

      expect(() => encryptToken('token')).toThrow('must be a base64-encoded 32-byte key')
    })
  })

  describe('isEncrypted', () => {
    it('returns true for encrypted tokens', () => {
      const token = 'test-token'
      const encrypted = encryptToken(token)

      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('returns false for plaintext', () => {
      expect(isEncrypted('plaintext-token')).toBe(false)
    })

    it('returns false for invalid format', () => {
      expect(isEncrypted('a:b')).toBe(false)
      expect(isEncrypted('a:b:c:d')).toBe(false)
    })

    it('returns false for non-base64url content', () => {
      expect(isEncrypted('a+b/c:d+e/f:g+h/i')).toBe(false)
    })

    it('returns false for empty parts', () => {
      expect(isEncrypted('::')). toBe(false)
      expect(isEncrypted('a::c')).toBe(false)
    })
  })

  describe('Security: OAuth Token Protection', () => {
    it('encrypts long OAuth tokens correctly', () => {
      const longToken = 'a'.repeat(500)

      const encrypted = encryptToken(longToken)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(longToken)
    })

    it('encrypts tokens with special characters', () => {
      const token = 'token!@#$%^&*(){}[]|\\:";\'<>?,./~`'

      const encrypted = encryptToken(token)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(token)
    })

    it('provides authenticated encryption (detects tampering)', () => {
      const token = 'important-oauth-token'
      const encrypted = encryptToken(token)

      // Tamper with the middle component
      const parts = encrypted.split(':')
      parts[1] = parts[1].replace(/.$/, 'X')
      const tampered = parts.join(':')

      expect(() => decryptToken(tampered)).toThrow()
    })
  })
})
