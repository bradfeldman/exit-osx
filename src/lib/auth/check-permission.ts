// Authorization helper for API routes
// Provides a consistent way to check permissions across all endpoints
//
// Permission System:
// - CompanyMember provides company-level permissions (LEAD/CONTRIBUTOR/VIEWER)
// - WorkspaceMember provides workspace-level permissions (OWNER/ADMIN/BILLING/MEMBER)

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Permission, hasPermission } from './permissions'
import type { CompanyRole } from './company-roles'
import type { WorkspaceRole } from './workspace-roles'
import { hasCompanyPermission } from './company-roles'
import type { UserRole } from '@prisma/client'

export interface AuthContext {
  user: {
    id: string
    authId: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
  workspaceMember: {
    workspaceId: string
    workspaceRole: WorkspaceRole
  }
  /**
   * Present when a companyId was provided AND a CompanyMember record exists
   * for this user+company. Authoritative for company-level permissions.
   */
  companyMember?: {
    role: CompanyRole
  }
}

export interface AuthSuccess {
  auth: AuthContext
}

export interface AuthError {
  error: NextResponse
}

export type AuthResult = AuthSuccess | AuthError

// ---------------------------------------------------------------------------
// WorkspaceRole to UserRole mapping (for legacy permission checks)
// TODO: Migrate PERMISSIONS constant to use WorkspaceRole directly
// ---------------------------------------------------------------------------

const WORKSPACE_ROLE_TO_USER_ROLE: Record<WorkspaceRole, UserRole> = {
  OWNER: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  BILLING: 'MEMBER',
  MEMBER: 'MEMBER',
}

// ---------------------------------------------------------------------------
// Permission-to-CompanyRole capability mapping
// Maps legacy Permission names to the coarse-grained CompanyRole capabilities
// used for the dual-read check.
// ---------------------------------------------------------------------------

type CompanyCapability = 'view' | 'edit' | 'manageTeam' | 'manageSettings' | 'delete'

/**
 * Maps a legacy Permission string to the CompanyRole capability it requires.
 * Permissions that are purely workspace-level (ORG_*) return undefined
 * because they are not governed by CompanyRole.
 */
const PERMISSION_TO_CAPABILITY: Partial<Record<Permission, CompanyCapability>> = {
  // Company operations
  COMPANY_VIEW: 'view',
  COMPANY_UPDATE: 'edit',
  COMPANY_CREATE: 'manageSettings', // Creating a company requires workspace-level authority
  COMPANY_DELETE: 'delete',

  // Assessment operations
  ASSESSMENT_VIEW: 'view',
  ASSESSMENT_CREATE: 'edit',
  ASSESSMENT_COMPLETE: 'edit',

  // Task operations
  TASK_VIEW: 'view',
  TASK_UPDATE: 'edit',
  TASK_ASSIGN: 'manageTeam',

  // Workspace operations are workspace-level, not company-level.
  // They fall through to the legacy WorkspaceMember check.
  // ORG_VIEW: undefined,
  // ORG_MANAGE_MEMBERS: undefined,
  // ORG_INVITE_USERS: undefined,
  // ORG_UPDATE_ROLES: undefined,
  // ORG_DELETE: undefined,
}

/**
 * Check if the current user has a specific permission
 * Optionally verify access to a specific company
 *
 * Permission Strategy:
 * 1. Authenticate and load the user + workspace membership
 * 2. When a companyId is provided, query CompanyMember for that user+company
 * 3. If a CompanyMember record exists, check permission against CompanyRole first
 * 4. For workspace-level permissions, check WorkspaceRole
 * 5. The returned AuthContext includes workspaceMember (always) and companyMember (when applicable)
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

  // Get user with workspace memberships
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      workspaces: {
        include: {
          workspace: companyId
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

  if (dbUser.workspaces.length === 0) {
    return {
      error: NextResponse.json(
        { error: 'No workspace', message: 'You are not a member of any workspace' },
        { status: 403 }
      )
    }
  }

  // Find relevant workspace membership
  let workspaceMember = dbUser.workspaces[0]

  // If a companyId is specified, find the workspace that contains that company
  if (companyId) {
    const workspaceWithCompany = dbUser.workspaces.find(
      wm => {
        const workspace = wm.workspace as { companies?: { id: string }[] }
        return workspace.companies && workspace.companies.length > 0
      }
    )

    if (!workspaceWithCompany) {
      return {
        error: NextResponse.json(
          { error: 'Access denied', message: 'You do not have access to this company' },
          { status: 403 }
        )
      }
    }

    workspaceMember = workspaceWithCompany
  }

  // ---------------------------------------------------------------------------
  // Company-level permission check (CompanyMember)
  // ---------------------------------------------------------------------------

  let companyMemberRole: CompanyRole | undefined
  let permissionGrantedByCompanyRole = false

  if (companyId) {
    const companyMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: { companyId, userId: dbUser.id },
      },
      select: { role: true },
    })

    if (companyMember) {
      companyMemberRole = companyMember.role as CompanyRole

      // Check if this permission maps to a CompanyRole capability
      const requiredCapability = PERMISSION_TO_CAPABILITY[permission]

      if (requiredCapability) {
        // CompanyMember can answer this permission check authoritatively
        permissionGrantedByCompanyRole = hasCompanyPermission(companyMemberRole, requiredCapability)

        if (!permissionGrantedByCompanyRole) {
          return {
            error: NextResponse.json(
              {
                error: 'Insufficient permissions',
                message: `Your company role (${companyMemberRole}) does not have permission to perform this action`,
                required: permission,
              },
              { status: 403 }
            )
          }
        }
      }
      // If requiredCapability is undefined, this is a workspace-level permission.
      // Fall through to workspace check below.
    }
  }

  // ---------------------------------------------------------------------------
  // Workspace-level permission check (WorkspaceMember)
  // Runs when:
  // - No companyId was provided (workspace-level request)
  // - No CompanyMember record exists
  // - The permission is workspace-level (not mapped to CompanyRole capability)
  // ---------------------------------------------------------------------------

  const workspaceRole = workspaceMember.workspaceRole as WorkspaceRole

  if (!permissionGrantedByCompanyRole) {
    // Map WorkspaceRole to UserRole for legacy permission check
    // TODO: Migrate PERMISSIONS constant to use WorkspaceRole directly
    const mappedRole = WORKSPACE_ROLE_TO_USER_ROLE[workspaceRole]
    if (!hasPermission(mappedRole, permission)) {
      return {
        error: NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: `Your workspace role (${workspaceRole}) does not have permission to perform this action`,
            required: permission,
          },
          { status: 403 }
        )
      }
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
      workspaceMember: {
        workspaceId: workspaceMember.workspaceId,
        workspaceRole,
      },
      ...(companyMemberRole ? { companyMember: { role: companyMemberRole } } : {}),
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
