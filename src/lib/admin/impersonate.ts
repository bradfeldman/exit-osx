// Impersonation session management
// Allows admins to view the app as another user with full audit trail

import { prisma } from '@/lib/prisma'
import { AdminContext } from './require-admin'
import { logAdminAction } from './audit'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

// SECURITY: Require explicit secret - validated lazily to avoid build-time failures
const IMPERSONATION_COOKIE = 'impersonation_session'

function getImpersonationSecret(): Uint8Array {
  const raw = process.env.IMPERSONATION_SECRET
  if (!raw || raw.length < 32) {
    throw new Error(
      'CRITICAL: IMPERSONATION_SECRET environment variable must be set and be at least 32 characters. ' +
      'Generate with: openssl rand -base64 32'
    )
  }
  return new TextEncoder().encode(raw)
}
// SECURITY: Reduced from 1 hour to 30 minutes to limit exposure window
const IMPERSONATION_EXPIRY_MINUTES = 30

export interface ImpersonationClaims {
  sessionId: string
  adminId: string
  adminEmail: string
  targetUserId: string
  targetUserEmail: string
  startedAt: number
  expiresAt: number
}

/**
 * Start an impersonation session
 * @param admin - Admin context from requireSuperAdmin
 * @param targetUserId - ID of user to impersonate
 * @param reason - Required reason for impersonation (min 10 chars)
 */
export async function startImpersonation(
  admin: AdminContext,
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string; session?: ImpersonationClaims }> {
  // Validate reason
  if (!reason || reason.length < 10) {
    return { success: false, error: 'Reason must be at least 10 characters' }
  }

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, name: true },
  })

  if (!targetUser) {
    return { success: false, error: 'Target user not found' }
  }

  // Prevent self-impersonation
  if (targetUser.id === admin.user.id) {
    return { success: false, error: 'Cannot impersonate yourself' }
  }

  // Check for existing active session
  const existingSession = await prisma.impersonationSession.findFirst({
    where: {
      adminId: admin.user.id,
      endedAt: null,
    },
  })

  if (existingSession) {
    // End existing session first
    await endImpersonation(admin)
  }

  // Create impersonation session
  const session = await prisma.impersonationSession.create({
    data: {
      adminId: admin.user.id,
      targetUserId: targetUser.id,
      reason,
      ipAddress: admin.ipAddress,
    },
  })

  // Log the action
  await logAdminAction(admin, 'impersonate.start', 'User', targetUser.id, {
    targetEmail: targetUser.email,
    targetName: targetUser.name,
    reason,
    sessionId: session.id,
  })

  // Create JWT token for impersonation
  const now = Date.now()
  // SECURITY: Shorter expiry (30 min instead of 1 hour)
  const expiresAt = now + IMPERSONATION_EXPIRY_MINUTES * 60 * 1000

  const claims: ImpersonationClaims = {
    sessionId: session.id,
    adminId: admin.user.id,
    adminEmail: admin.user.email,
    targetUserId: targetUser.id,
    targetUserEmail: targetUser.email,
    startedAt: now,
    expiresAt,
  }

  const token = await new SignJWT(claims as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt / 1000)
    .sign(getImpersonationSecret())

  // Set cookie
  // SECURITY: Use strict SameSite to prevent CSRF during impersonation
  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // SECURITY: Changed from 'lax' to prevent CSRF
    maxAge: IMPERSONATION_EXPIRY_MINUTES * 60,
    path: '/',
  })

  return { success: true, session: claims }
}

/**
 * End the current impersonation session
 */
export async function endImpersonation(admin: AdminContext): Promise<{ success: boolean; error?: string }> {
  // Get current session from cookie
  const session = await getImpersonationSession()

  if (!session) {
    // Just clear cookie if no session found
    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATION_COOKIE)
    return { success: true }
  }

  // Verify admin owns this session
  if (session.adminId !== admin.user.id) {
    return { success: false, error: 'Cannot end another admin\'s session' }
  }

  // Update session in database
  await prisma.impersonationSession.update({
    where: { id: session.sessionId },
    data: { endedAt: new Date() },
  })

  // Log the action
  await logAdminAction(admin, 'impersonate.end', 'User', session.targetUserId, {
    targetEmail: session.targetUserEmail,
    sessionId: session.sessionId,
    duration: Date.now() - session.startedAt,
  })

  // Clear cookie
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE)

  return { success: true }
}

/**
 * Get current impersonation session if active
 */
export async function getImpersonationSession(): Promise<ImpersonationClaims | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(IMPERSONATION_COOKIE)?.value

    if (!token) return null

    const { payload } = await jwtVerify(token, getImpersonationSecret())
    const claims = payload as unknown as ImpersonationClaims

    // Check if expired
    if (claims.expiresAt < Date.now()) {
      // Auto-expire the session
      await prisma.impersonationSession.updateMany({
        where: {
          id: claims.sessionId,
          endedAt: null,
        },
        data: { endedAt: new Date() },
      })
      cookieStore.delete(IMPERSONATION_COOKIE)
      return null
    }

    return claims
  } catch {
    // Invalid token - clear cookie
    const cookieStore = await cookies()
    cookieStore.delete(IMPERSONATION_COOKIE)
    return null
  }
}

/**
 * Check if currently impersonating
 */
export async function isImpersonating(): Promise<boolean> {
  const session = await getImpersonationSession()
  return session !== null
}

/**
 * Get impersonation context for display
 */
export async function getImpersonationContext() {
  const session = await getImpersonationSession()
  if (!session) return null

  return {
    isImpersonating: true,
    adminEmail: session.adminEmail,
    targetEmail: session.targetUserEmail,
    targetUserId: session.targetUserId,
    startedAt: new Date(session.startedAt),
    expiresAt: new Date(session.expiresAt),
    remainingMinutes: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000)),
  }
}

/**
 * Get target user ID if impersonating, otherwise null
 * Use this to modify queries to use the impersonated user's data
 */
export async function getEffectiveUserId(realUserId: string): Promise<string> {
  const session = await getImpersonationSession()
  return session ? session.targetUserId : realUserId
}

/**
 * Get impersonation history for a user (as admin or target)
 */
export async function getImpersonationHistory(options: {
  adminId?: string
  targetUserId?: string
  limit?: number
}) {
  const { adminId, targetUserId, limit = 50 } = options

  const where: Record<string, string> = {}
  if (adminId) where.adminId = adminId
  if (targetUserId) where.targetUserId = targetUserId

  return prisma.impersonationSession.findMany({
    where,
    include: {
      admin: {
        select: { id: true, email: true, name: true },
      },
      targetUser: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}

/**
 * SECURITY: Invalidate all active impersonation sessions for a user
 * Call this when:
 * - User changes password
 * - User is suspended/deactivated
 * - User revokes all sessions
 * - Security incident detected
 */
export async function invalidateUserImpersonationSessions(userId: string): Promise<number> {
  const result = await prisma.impersonationSession.updateMany({
    where: {
      targetUserId: userId,
      endedAt: null, // Only active sessions
    },
    data: {
      endedAt: new Date(),
    },
  })

  if (result.count > 0) {
    console.log(`[Security] Invalidated ${result.count} impersonation sessions for user ${userId}`)
  }

  return result.count
}

/**
 * SECURITY: Invalidate all active sessions for an admin
 * Call when admin privileges are revoked
 */
export async function invalidateAdminImpersonationSessions(adminId: string): Promise<number> {
  const result = await prisma.impersonationSession.updateMany({
    where: {
      adminId,
      endedAt: null,
    },
    data: {
      endedAt: new Date(),
    },
  })

  if (result.count > 0) {
    console.log(`[Security] Invalidated ${result.count} impersonation sessions by admin ${adminId}`)
  }

  return result.count
}
