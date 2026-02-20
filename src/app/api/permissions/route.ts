// GET /api/permissions - Get permissions for current user
// Returns resolved permissions for the authenticated user

import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getPermissionContext, resolveUserPermissions } from '@/lib/auth/check-granular-permission'
import { GRANULAR_PERMISSIONS, GranularPermission, ROLE_TEMPLATES } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Check basic auth
    const result = await checkPermission('ORG_VIEW')
    if (isAuthError(result)) return result.error

    // Get company ID from query params if provided
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || undefined

    // Get permission context
    const context = await getPermissionContext(companyId)
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check workspace's subscription tier and user's role
    // Deal Room tier owners get all permissions automatically
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { id: context.workspaceMemberId },
      include: {
        user: {
          select: {
            userType: true,
          },
        },
        workspace: {
          select: {
            planTier: true,
            subscriptionStatus: true,
          },
        },
      },
    })

    // If user is workspace owner (SUPER_ADMIN/ADMIN) and on Deal Room tier, grant all permissions
    const isOwnerRole = workspaceMember?.workspaceRole === 'OWNER' || workspaceMember?.workspaceRole === 'ADMIN'
    const isComped = workspaceMember?.user.userType === 'COMPED'
    const isDealRoomOrComped = workspaceMember?.workspace.planTier === 'DEAL_ROOM' || isComped
    const hasActiveSubscription = workspaceMember?.workspace.subscriptionStatus !== 'CANCELLED' && workspaceMember?.workspace.subscriptionStatus !== 'EXPIRED'

    // Resolve all permissions for this user
    let resolved = await resolveUserPermissions(context.workspaceMemberId)

    // Override permissions for Deal Room owners
    if (isOwnerRole && isDealRoomOrComped && hasActiveSubscription) {
      // Grant all permissions from owner template
      resolved = {
        ...resolved,
        permissions: { ...ROLE_TEMPLATES.owner.defaultPermissions },
        templateSlug: resolved.templateSlug || 'owner',
      }
    }

    // Build permission list with details
    const permissions = Object.entries(GRANULAR_PERMISSIONS).map(([key, description]) => {
      const permission = key as GranularPermission
      return {
        permission,
        description,
        granted: resolved.permissions[permission] ?? false,
      }
    })

    return NextResponse.json({
      userId: context.userId,
      workspaceId: context.workspaceId,
      companyId: context.companyId,
      roleTemplate: resolved.templateSlug,
      hasCustomOverrides: resolved.hasCustomOverrides,
      isExternalAdvisor: context.isExternalAdvisor,
      permissions,
      // Convenience: grouped by module
      permissionsByModule: groupPermissionsByModule(permissions),
    })
  } catch (error) {
    console.error('Failed to get permissions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to get permissions' },
      { status: 500 }
    )
  }
}

function groupPermissionsByModule(
  permissions: Array<{ permission: GranularPermission; description: string; granted: boolean }>
) {
  const grouped: Record<string, typeof permissions> = {}

  for (const perm of permissions) {
    const moduleName = perm.permission.split('.')[0]
    if (!grouped[moduleName]) {
      grouped[moduleName] = []
    }
    grouped[moduleName].push(perm)
  }

  return grouped
}
