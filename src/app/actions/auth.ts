'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import {
  isAccountLocked,
  recordFailedAttempt,
  clearLockout,
  getFailedAttemptCount,
  withTimingSafeResponse,
  securityLogger,
} from '@/lib/security'

interface LoginResult {
  success: boolean
  error?: string
  attemptsRemaining?: number
  lockedUntilMs?: number
  requiresCaptcha?: boolean
  requiresTwoFactor?: boolean
  twoFactorEmail?: string
}

// Show CAPTCHA after this many failed attempts
const CAPTCHA_THRESHOLD = 3

/**
 * Server action for secure login with account lockout protection
 */
export async function secureLogin(
  email: string,
  password: string,
  captchaToken?: string,
  twoFactorCode?: string
): Promise<LoginResult> {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  return withTimingSafeResponse(async () => {
    // Check if account is locked
    const lockStatus = await isAccountLocked(email)
    if (lockStatus.locked) {
      securityLogger.warn('auth.locked_attempt', `Login attempt on locked account`, {
        userEmail: email,
        ipAddress,
        metadata: { remainingMs: lockStatus.remainingMs },
      })
      return {
        success: false,
        error: lockStatus.reason || 'Account temporarily locked. Please try again later.',
        lockedUntilMs: lockStatus.remainingMs,
      }
    }

    // Check if CAPTCHA is required
    const failedAttempts = await getFailedAttemptCount(email)
    if (failedAttempts >= CAPTCHA_THRESHOLD) {
      // Verify CAPTCHA if required
      if (!captchaToken) {
        return {
          success: false,
          error: 'Please complete the CAPTCHA verification',
          requiresCaptcha: true,
          attemptsRemaining: 5 - failedAttempts,
        }
      }

      // Verify the CAPTCHA token
      const captchaValid = await verifyCaptcha(captchaToken)
      if (!captchaValid) {
        return {
          success: false,
          error: 'CAPTCHA verification failed. Please try again.',
          requiresCaptcha: true,
          attemptsRemaining: 5 - failedAttempts,
        }
      }
    }

    // Import 2FA functions lazily to avoid circular deps
    const { checkTwoFactorRequired, verifyTwoFactorCode } = await import('./two-factor')

    // Check if 2FA is required for this user
    const needs2FA = await checkTwoFactorRequired(email)

    // If 2FA is required but no code provided, we need to verify password first
    // then prompt for 2FA code
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const result = await recordFailedAttempt(email, { ipAddress, userAgent })

      securityLogger.authAttempt(false, {
        email,
        ipAddress,
        userAgent,
        reason: error.message,
      })

      if (result.locked) {
        return {
          success: false,
          error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
          attemptsRemaining: 0,
          lockedUntilMs: result.lockoutDurationMs,
        }
      }

      return {
        success: false,
        // Generic error message to prevent user enumeration
        error: 'Invalid email or password',
        attemptsRemaining: result.attemptsRemaining,
        requiresCaptcha: result.attemptsRemaining <= 2, // Show CAPTCHA when 2 or fewer attempts remain
      }
    }

    // Password is correct, now check 2FA
    if (needs2FA) {
      if (!twoFactorCode) {
        // Sign out since we need 2FA verification
        await supabase.auth.signOut()

        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorEmail: email,
        }
      }

      // Verify 2FA code
      const twoFactorResult = await verifyTwoFactorCode(email, twoFactorCode)
      if (!twoFactorResult.success) {
        // Sign out since 2FA failed
        await supabase.auth.signOut()

        securityLogger.warn('auth.2fa_failed', '2FA verification failed', {
          userEmail: email,
          ipAddress,
        })

        return {
          success: false,
          error: twoFactorResult.error || 'Invalid verification code',
          requiresTwoFactor: true,
          twoFactorEmail: email,
        }
      }
    }

    // Successful login - clear any lockout state
    await clearLockout(email)

    // Record the session for session management
    const { recordSession } = await import('./sessions')
    await recordSession().catch(() => {
      // Non-blocking - don't fail login if session recording fails
    })

    securityLogger.authAttempt(true, {
      email,
      ipAddress,
      userAgent,
    })

    return { success: true }
  })
}

/**
 * Check if an email is currently locked (for UI feedback)
 */
export async function checkLockStatus(email: string): Promise<{
  locked: boolean
  remainingMs?: number
  requiresCaptcha?: boolean
}> {
  const status = await isAccountLocked(email)
  const failedAttempts = await getFailedAttemptCount(email)

  return {
    locked: status.locked,
    remainingMs: status.remainingMs,
    requiresCaptcha: failedAttempts >= CAPTCHA_THRESHOLD,
  }
}

interface SignupResult {
  success: boolean
  error?: string
  passwordWarning?: string
}

/**
 * Server action for secure signup with password breach checking
 * @param redirectTo - Optional URL to redirect to after email confirmation
 */
export async function secureSignup(
  name: string,
  email: string,
  password: string,
  redirectTo?: string
): Promise<SignupResult> {
  const { validatePassword, getPasswordWarning } = await import('@/lib/security')

  // Validate password strength and check for breaches
  const validationError = await validatePassword(password)
  if (validationError) {
    return {
      success: false,
      error: validationError,
    }
  }

  // Build the email confirmation redirect URL
  // The auth/callback route will read the 'next' parameter and redirect there
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const emailRedirectTo = redirectTo
    ? `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`
    : `${baseUrl}/auth/callback`

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo,
    },
  })

  if (error) {
    // Generic error message to prevent enumeration
    if (error.message.includes('already registered')) {
      return {
        success: false,
        error: 'Unable to create account. Please try a different email or sign in.',
      }
    }
    return {
      success: false,
      error: error.message,
    }
  }

  // Check for password warning (non-blocking)
  const warning = await getPasswordWarning(password)

  return {
    success: true,
    passwordWarning: warning || undefined,
  }
}

/**
 * Verify hCaptcha or reCAPTCHA token
 */
async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY

  if (!secret) {
    // If no CAPTCHA secret is configured, skip verification in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Security] CAPTCHA verification skipped - no secret key configured')
      return true
    }
    return false
  }

  try {
    // Determine which service to use based on which secret is configured
    const isHCaptcha = !!process.env.HCAPTCHA_SECRET_KEY
    const verifyUrl = isHCaptcha
      ? 'https://hcaptcha.com/siteverify'
      : 'https://www.google.com/recaptcha/api/siteverify'

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    securityLogger.error('captcha.verification_failed', 'CAPTCHA verification request failed', {
      metadata: { error: String(error) },
    })
    return false
  }
}
