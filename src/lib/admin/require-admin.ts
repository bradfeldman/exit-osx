// Admin access control middleware
// Requires isSuperAdmin: true on User model

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export interface AdminContext {
  user: {
    id: string
    authId: string
    email: string
    name: string | null
    isSuperAdmin: boolean
  }
  ipAddress: string | null
  userAgent: string | null
}

export interface AdminSuccess {
  admin: AdminContext
}

export interface AdminError {
  error: NextResponse
}

export type AdminResult = AdminSuccess | AdminError

/**
 * Require super admin access for an API route
 * Returns admin context or error response
 */
export async function requireSuperAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      )
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: {
      id: true,
      authId: true,
      email: true,
      name: true,
      isSuperAdmin: true,
    },
  })

  if (!dbUser) {
    return {
      error: NextResponse.json(
        { error: 'User not found', message: 'Your user account could not be found' },
        { status: 404 }
      )
    }
  }

  if (!dbUser.isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden', message: 'You do not have admin access' },
        { status: 403 }
      )
    }
  }

  // Get request metadata
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    headersList.get('x-real-ip') ||
                    null
  const userAgent = headersList.get('user-agent')

  return {
    admin: {
      user: {
        id: dbUser.id,
        authId: dbUser.authId,
        email: dbUser.email,
        name: dbUser.name,
        isSuperAdmin: dbUser.isSuperAdmin,
      },
      ipAddress,
      userAgent,
    },
  }
}

/**
 * Helper to check if admin result is an error
 */
export function isAdminError(result: AdminResult): result is AdminError {
  return 'error' in result
}

/**
 * Get admin user for client-side check
 * Returns null if not admin
 */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
    },
  })

  if (!dbUser || !dbUser.isSuperAdmin) return null

  return dbUser
}
