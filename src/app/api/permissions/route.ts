// GET /api/permissions - Get permissions for current user
// Returns resolved permissions for the authenticated user

import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getPermissionContext, resolveUserPermissions } from '@/lib/auth/check-granular-permission'
import { GRANULAR_PERMISSIONS, GranularPermission } from '@/lib/auth/permissions'

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

    // Resolve all permissions for this user
    const resolved = await resolveUserPermissions(context.organizationUserId)

    // DEBUG: Log personal permissions
    console.log('[DEBUG] Resolved permissions for personal:', {
      'personal.retirement:view': resolved.permissions['personal.retirement:view'],
      'personal.net_worth:view': resolved.permissions['personal.net_worth:view'],
      templateSlug: resolved.templateSlug,
      hasCustomOverrides: resolved.hasCustomOverrides,
    })

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
      organizationId: context.organizationId,
      companyId: context.companyId,
      roleTemplate: resolved.templateSlug,
      hasCustomOverrides: resolved.hasCustomOverrides,
      isExternalAdvisor: context.isExternalAdvisor,
      permissions,
      // Convenience: grouped by module
      permissionsByModule: groupPermissionsByModule(permissions),
    })
  } catch (error) {
    console.error('Failed to get permissions:', error)
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
