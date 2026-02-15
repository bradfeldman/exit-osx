'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { securityLogger } from '@/lib/security'
import { headers } from 'next/headers'

interface Session {
  id: string
  deviceType: string | null
  browser: string | null
  os: string | null
  location: string | null
  ipAddress: string | null
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

interface SessionListResult {
  success: boolean
  sessions?: Session[]
  error?: string
}

interface SessionActionResult {
  success: boolean
  error?: string
}

/**
 * Parse user agent string into device info
 */
function parseUserAgent(userAgent: string | null): {
  deviceType: string
  browser: string
  os: string
} {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' }
  }

  // Detect device type
  let deviceType = 'desktop'
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile'
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet'
  }

  // Detect browser
  let browser = 'Unknown'
  if (/edg/i.test(userAgent)) {
    browser = 'Microsoft Edge'
  } else if (/chrome/i.test(userAgent)) {
    browser = 'Chrome'
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox'
  } else if (/safari/i.test(userAgent)) {
    browser = 'Safari'
  } else if (/opera|opr/i.test(userAgent)) {
    browser = 'Opera'
  }

  // Detect OS
  let os = 'Unknown'
  if (/windows/i.test(userAgent)) {
    os = 'Windows'
  } else if (/macintosh|mac os/i.test(userAgent)) {
    os = 'macOS'
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux'
  } else if (/android/i.test(userAgent)) {
    os = 'Android'
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = 'iOS'
  }

  return { deviceType, browser, os }
}

/**
 * Record a new session or update existing one
 */
export async function recordSession(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const headersList = await headers()
  const userAgent = headersList.get('user-agent')
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  const deviceInfo = parseUserAgent(userAgent)

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) return

    // Check if session already exists
    const existingSession = await prisma.userSession.findUnique({
      where: { sessionToken: session.access_token },
    })

    if (existingSession) {
      // Update last active time
      await prisma.userSession.update({
        where: { id: existingSession.id },
        data: { lastActiveAt: new Date() },
      })
    } else {
      // Create new session record
      await prisma.userSession.create({
        data: {
          userId: dbUser.id,
          sessionToken: session.access_token,
          userAgent,
          ipAddress,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          expiresAt: new Date(session.expires_at! * 1000),
        },
      })
    }
  } catch (error) {
    console.error('Failed to record session:', error)
  }
}

/**
 * Get all active sessions for the current user
 */
export async function getSessions(): Promise<SessionListResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: { session } } = await supabase.auth.getSession()

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return { success: false, error: 'User not found' }
    }

    const sessions = await prisma.userSession.findMany({
      where: {
        userId: dbUser.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    })

    return {
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        deviceType: s.deviceType,
        browser: s.browser,
        os: s.os,
        location: s.location,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        isCurrent: s.sessionToken === session?.access_token,
      })),
    }
  } catch (error) {
    console.error('Failed to get sessions:', error)
    return { success: false, error: 'Failed to retrieve sessions' }
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<SessionActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: { session } } = await supabase.auth.getSession()

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return { success: false, error: 'User not found' }
    }

    // Find the session and verify ownership
    const targetSession = await prisma.userSession.findUnique({
      where: { id: sessionId },
    })

    if (!targetSession || targetSession.userId !== dbUser.id) {
      return { success: false, error: 'Session not found' }
    }

    if (session && targetSession.sessionToken === session.access_token) {
      return { success: false, error: 'Cannot revoke current session' }
    }

    // Revoke the session
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })

    securityLogger.info('session.revoked', 'Session revoked by user', {
      userId: dbUser.id,
      userEmail: user.email,
      metadata: {
        revokedSessionId: sessionId,
        revokedSessionDevice: targetSession.deviceType,
        revokedSessionBrowser: targetSession.browser,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to revoke session:', error)
    return { success: false, error: 'Failed to revoke session' }
  }
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(): Promise<SessionActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: { session } } = await supabase.auth.getSession()

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return { success: false, error: 'User not found' }
    }

    // Revoke all sessions except current
    const result = await prisma.userSession.updateMany({
      where: {
        userId: dbUser.id,
        ...(session ? { sessionToken: { not: session.access_token } } : {}),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })

    securityLogger.security('session.revoke_all', 'All other sessions revoked by user', {
      userId: dbUser.id,
      userEmail: user.email,
      metadata: { revokedCount: result.count },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to revoke sessions:', error)
    return { success: false, error: 'Failed to revoke sessions' }
  }
}
