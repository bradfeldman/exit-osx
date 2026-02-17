'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  encryptSecret,
  decryptSecret,
  securityLogger,
} from '@/lib/security'

interface TwoFactorSetupResult {
  success: boolean
  error?: string
  secret?: string
  qrCodeUri?: string
  backupCodes?: string[]
}

interface TwoFactorVerifyResult {
  success: boolean
  error?: string
}

interface TwoFactorStatusResult {
  enabled: boolean
  verifiedAt?: string
}

/**
 * Initialize 2FA setup - generates secret and QR code
 */
export async function initializeTwoFactor(): Promise<TwoFactorSetupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { twoFactorAuth: true },
    })

    if (!dbUser) {
      return { success: false, error: 'User not found' }
    }

    // Check if already enabled
    if (dbUser.twoFactorAuth?.enabled) {
      return { success: false, error: 'Two-factor authentication is already enabled' }
    }

    // Generate new secret
    const secret = generateTotpSecret()
    const backupCodes = generateBackupCodes()

    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    // Encrypt secret for storage
    const encryptedSecret = encryptSecret(secret)

    // Upsert 2FA record (not enabled yet until verified)
    await prisma.twoFactorAuth.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        encryptedSecret,
        backupCodes: hashedBackupCodes,
        enabled: false,
      },
      update: {
        encryptedSecret,
        backupCodes: hashedBackupCodes,
        usedBackupCodes: [],
        enabled: false,
        verifiedAt: null,
      },
    })

    // Generate QR code URI
    const qrCodeUri = generateTotpUri(secret, user.email!)

    securityLogger.info('2fa.setup_initiated', 'Two-factor authentication setup initiated', {
      userId: dbUser.id,
      userEmail: user.email,
    })

    return {
      success: true,
      secret,
      qrCodeUri,
      backupCodes,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isMissingKey = errorMessage.includes('TOTP_ENCRYPTION_KEY')
    securityLogger.error('2fa.setup_error', 'Error initializing 2FA', {
      userEmail: user.email,
      metadata: { error: errorMessage, isMissingKey },
    })
    console.error('[2FA] initializeTwoFactor failed:', errorMessage)
    return {
      success: false,
      error: isMissingKey
        ? 'Two-factor authentication is not configured. Please contact support.'
        : `Failed to initialize two-factor authentication: ${errorMessage}`,
    }
  }
}

/**
 * Verify and enable 2FA
 */
export async function verifyAndEnableTwoFactor(code: string): Promise<TwoFactorVerifyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { twoFactorAuth: true },
    })

    if (!dbUser?.twoFactorAuth) {
      return { success: false, error: 'Two-factor setup not initiated' }
    }

    if (dbUser.twoFactorAuth.enabled) {
      return { success: false, error: 'Two-factor authentication is already enabled' }
    }

    // Decrypt and verify the code
    const secret = decryptSecret(dbUser.twoFactorAuth.encryptedSecret)
    const isValid = verifyTotp(secret, code)

    if (!isValid) {
      securityLogger.warn('2fa.verify_failed', 'Invalid 2FA code during setup', {
        userId: dbUser.id,
        userEmail: user.email,
      })
      return { success: false, error: 'Invalid verification code' }
    }

    // Enable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId: dbUser.id },
      data: {
        enabled: true,
        verifiedAt: new Date(),
      },
    })

    securityLogger.security('2fa.enabled', 'Two-factor authentication enabled', {
      userId: dbUser.id,
      userEmail: user.email,
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    securityLogger.error('2fa.verify_error', 'Error verifying 2FA', {
      userEmail: user.email,
      metadata: { error: errorMessage },
    })
    console.error('[2FA] verifyAndEnableTwoFactor failed:', errorMessage)
    return { success: false, error: `Failed to verify code: ${errorMessage}` }
  }
}

/**
 * Disable 2FA (requires current code or backup code)
 */
export async function disableTwoFactor(code: string): Promise<TwoFactorVerifyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { twoFactorAuth: true },
    })

    if (!dbUser?.twoFactorAuth?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' }
    }

    // Verify with TOTP code or backup code
    const secret = decryptSecret(dbUser.twoFactorAuth.encryptedSecret)
    const isTotpValid = verifyTotp(secret, code)

    let isBackupValid = false
    if (!isTotpValid) {
      // Try backup code
      const backupIndex = verifyBackupCode(code, dbUser.twoFactorAuth.backupCodes)
      isBackupValid = backupIndex !== -1 && !dbUser.twoFactorAuth.usedBackupCodes.includes(backupIndex)
    }

    if (!isTotpValid && !isBackupValid) {
      securityLogger.warn('2fa.disable_failed', 'Invalid code when disabling 2FA', {
        userId: dbUser.id,
        userEmail: user.email,
      })
      return { success: false, error: 'Invalid verification code' }
    }

    // Delete 2FA record
    await prisma.twoFactorAuth.delete({
      where: { userId: dbUser.id },
    })

    securityLogger.security('2fa.disabled', 'Two-factor authentication disabled', {
      userId: dbUser.id,
      userEmail: user.email,
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    securityLogger.error('2fa.disable_error', 'Error disabling 2FA', {
      userEmail: user.email,
      metadata: { error: errorMessage },
    })
    console.error('[2FA] disableTwoFactor failed:', errorMessage)
    return { success: false, error: `Failed to disable two-factor authentication: ${errorMessage}` }
  }
}

/**
 * Verify 2FA code during login
 */
export async function verifyTwoFactorCode(
  email: string,
  code: string
): Promise<TwoFactorVerifyResult> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { twoFactorAuth: true },
    })

    if (!dbUser?.twoFactorAuth?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' }
    }

    const secret = decryptSecret(dbUser.twoFactorAuth.encryptedSecret)

    // Try TOTP code first
    if (verifyTotp(secret, code)) {
      // Update last used timestamp
      await prisma.twoFactorAuth.update({
        where: { userId: dbUser.id },
        data: { lastUsedAt: new Date() },
      })

      securityLogger.info('2fa.verify_success', '2FA code verified successfully', {
        userId: dbUser.id,
        userEmail: email,
      })

      return { success: true }
    }

    // Try backup code
    const backupIndex = verifyBackupCode(code, dbUser.twoFactorAuth.backupCodes)
    if (backupIndex !== -1 && !dbUser.twoFactorAuth.usedBackupCodes.includes(backupIndex)) {
      // Mark backup code as used
      await prisma.twoFactorAuth.update({
        where: { userId: dbUser.id },
        data: {
          usedBackupCodes: { push: backupIndex },
          lastUsedAt: new Date(),
        },
      })

      securityLogger.security('2fa.backup_code_used', 'Backup code used for 2FA', {
        userId: dbUser.id,
        userEmail: email,
        metadata: { backupIndex },
      })

      return { success: true }
    }

    securityLogger.warn('2fa.verify_failed', 'Invalid 2FA code during login', {
      userId: dbUser.id,
      userEmail: email,
    })

    return { success: false, error: 'Invalid verification code' }
  } catch (error) {
    securityLogger.error('2fa.verify_error', 'Error verifying 2FA code', {
      userEmail: email,
      metadata: { error: String(error) },
    })
    return { success: false, error: 'Failed to verify code' }
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatusResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { enabled: false }
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { twoFactorAuth: true },
    })

    return {
      enabled: dbUser?.twoFactorAuth?.enabled ?? false,
      verifiedAt: dbUser?.twoFactorAuth?.verifiedAt?.toISOString(),
    }
  } catch {
    return { enabled: false }
  }
}

/**
 * Check if an email has 2FA enabled (for login flow)
 */
export async function checkTwoFactorRequired(email: string): Promise<boolean> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { twoFactorAuth: true },
    })

    return dbUser?.twoFactorAuth?.enabled ?? false
  } catch {
    return false
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(code: string): Promise<TwoFactorSetupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { twoFactorAuth: true },
    })

    if (!dbUser?.twoFactorAuth?.enabled) {
      return { success: false, error: 'Two-factor authentication is not enabled' }
    }

    // Verify current code
    const secret = decryptSecret(dbUser.twoFactorAuth.encryptedSecret)
    if (!verifyTotp(secret, code)) {
      return { success: false, error: 'Invalid verification code' }
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes()
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    await prisma.twoFactorAuth.update({
      where: { userId: dbUser.id },
      data: {
        backupCodes: hashedBackupCodes,
        usedBackupCodes: [],
      },
    })

    securityLogger.security('2fa.backup_codes_regenerated', 'Backup codes regenerated', {
      userId: dbUser.id,
      userEmail: user.email,
    })

    return {
      success: true,
      backupCodes,
    }
  } catch (error) {
    securityLogger.error('2fa.regenerate_error', 'Error regenerating backup codes', {
      userEmail: user.email,
      metadata: { error: String(error) },
    })
    return { success: false, error: 'Failed to regenerate backup codes' }
  }
}
