// Authorization helper for API routes
// Provides a consistent way to check permissions across all endpoints

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Permission, hasPermission } from './permissions'
import { UserRole } from '@prisma/client'

export interface AuthContext {
  user: {
    id: string
    authId: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
  organizationUser: {
    organizationId: string
    role: UserRole
  }
}

export interface AuthSuccess {
  auth: AuthContext
}

export interface AuthError {
  error: NextResponse
}

export type AuthResult = AuthSuccess | AuthError

/**
 * Check if the current user has a specific permission
 * Optionally verify access to a specific company
 *
 * @param permission - The permission to check
 * @param companyId - Optional company ID to verify access to
 * @returns AuthResult with either auth context or error response
 */
export async function checkPermission(
  permission: Permission,
  companyId?: string
): Promise<AuthResult> {
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

  // Get user with organization memberships
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      organizations: {
        include: {
          organization: companyId
            ? {
                include: {
                  companies: {
                    where: { id: companyId },
                    select: { id: true },
                  },
                },
              }
            : true,
        },
      },
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

  if (dbUser.organizations.length === 0) {
    return {
      error: NextResponse.json(
        { error: 'No organization', message: 'You are not a member of any organization' },
        { status: 403 }
      )
    }
  }

  // Find relevant org membership
  let orgUser = dbUser.organizations[0]

  // If a companyId is specified, find the org that contains that company
  if (companyId) {
    const orgWithCompany = dbUser.organizations.find(
      ou => {
        const org = ou.organization as { companies?: { id: string }[] }
        return org.companies && org.companies.length > 0
      }
    )

    if (!orgWithCompany) {
      return {
        error: NextResponse.json(
          { error: 'Access denied', message: 'You do not have access to this company' },
          { status: 403 }
        )
      }
    }

    orgUser = orgWithCompany
  }

  // Check if user has the required permission
  if (!hasPermission(orgUser.role, permission)) {
    return {
      error: NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: `Your role (${orgUser.role}) does not have permission to perform this action`,
          required: permission,
        },
        { status: 403 }
      )
    }
  }

  return {
    auth: {
      user: {
        id: dbUser.id,
        authId: dbUser.authId,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
      },
      organizationUser: {
        organizationId: orgUser.organizationId,
        role: orgUser.role,
      },
    },
  }
}

/**
 * Helper to check if auth result is an error
 */
export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result
}

/**
 * Get the current user's auth context without checking a specific permission
 * Useful for routes that just need user info
 */
export async function getAuthContext(): Promise<AuthResult> {
  return checkPermission('COMPANY_VIEW') // Most basic permission
}

/**
 * Require admin or higher role
 */
export async function requireAdmin(companyId?: string): Promise<AuthResult> {
  return checkPermission('ORG_MANAGE_MEMBERS', companyId)
}

/**
 * Require at least team leader role
 */
export async function requireTeamLeader(companyId?: string): Promise<AuthResult> {
  return checkPermission('TASK_ASSIGN', companyId)
}
