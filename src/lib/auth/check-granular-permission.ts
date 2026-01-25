// Granular Permission Resolution System
// Resolves permissions using: Template Defaults + Custom Overrides

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { GranularPermission, ROLE_TEMPLATES } from './permissions'

export interface PermissionContext {
  userId: string
  organizationUserId: string
  organizationId: string
  companyId?: string
  roleTemplateSlug?: string
  isExternalAdvisor: boolean
}

export interface PermissionCheckResult {
  granted: boolean
  source: 'custom' | 'template' | 'default_deny'
  permission: GranularPermission
}

export interface ResolvedPermissions {
  permissions: Record<GranularPermission, boolean>
  templateSlug?: string
  hasCustomOverrides: boolean
}

/**
 * Get all resolved permissions for a user in an organization
 * Resolution order: Custom Override > Template Default > Default Deny
 */
export async function resolveUserPermissions(
  organizationUserId: string
): Promise<ResolvedPermissions> {
  // Fetch the organization user with their role template and custom permissions
  const orgUser = await prisma.organizationUser.findUnique({
    where: { id: organizationUserId },
    include: {
      roleTemplate: true,
      customPermissions: true,
    },
  })

  if (!orgUser) {
    throw new Error('Organization user not found')
  }

  // Start with template defaults or empty if no template
  let permissions: Record<GranularPermission, boolean> = {} as Record<GranularPermission, boolean>

  if (orgUser.roleTemplate) {
    // Get template defaults from database
    const templateDefaults = orgUser.roleTemplate.defaultPermissions as Record<string, boolean>
    permissions = { ...templateDefaults } as Record<GranularPermission, boolean>
  } else if (orgUser.roleTemplateId === null) {
    // SECURITY: Only SUPER_ADMIN gets full owner permissions without explicit template
    // ADMIN and other roles must have an explicit role template assigned
    // This prevents privilege escalation if an admin's template is accidentally cleared
    if (orgUser.role === 'SUPER_ADMIN') {
      const ownerTemplate = ROLE_TEMPLATES.owner
      permissions = { ...ownerTemplate.defaultPermissions }
    }
    // ADMINs without templates get NO granular permissions by default
    // They must be assigned an explicit role template
  }

  // Apply custom overrides
  const customOverrides = orgUser.customPermissions || []
  for (const override of customOverrides) {
    permissions[override.permission as GranularPermission] = override.granted
  }

  return {
    permissions,
    templateSlug: orgUser.roleTemplate?.slug,
    hasCustomOverrides: customOverrides.length > 0,
  }
}

/**
 * Check if a user has a specific granular permission
 */
export async function checkGranularPermission(
  permission: GranularPermission,
  organizationUserId: string
): Promise<PermissionCheckResult> {
  const resolved = await resolveUserPermissions(organizationUserId)

  const granted = resolved.permissions[permission] ?? false

  // Determine the source
  const orgUser = await prisma.organizationUser.findUnique({
    where: { id: organizationUserId },
    include: {
      customPermissions: {
        where: { permission },
      },
    },
  })

  let source: 'custom' | 'template' | 'default_deny' = 'default_deny'
  if (orgUser?.customPermissions?.length) {
    source = 'custom'
  } else if (resolved.templateSlug) {
    source = 'template'
  }

  return {
    granted,
    source,
    permission,
  }
}

/**
 * Get permission context for the current authenticated user
 */
export async function getPermissionContext(
  companyId?: string
): Promise<PermissionContext | null> {
  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()

  if (error || !authUser) {
    return null
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: {
      organizations: {
        include: {
          organization: {
            include: {
              companies: true,
            },
          },
          roleTemplate: true,
        },
      },
    },
  })

  if (!user || user.organizations.length === 0) {
    return null
  }

  // Find the relevant organization user
  let orgUser = user.organizations[0]

  // If companyId is provided, find the org that owns that company
  if (companyId) {
    const matchingOrg = user.organizations.find(ou =>
      ou.organization.companies.some(c => c.id === companyId)
    )
    if (matchingOrg) {
      orgUser = matchingOrg
    }
  }

  return {
    userId: user.id,
    organizationUserId: orgUser.id,
    organizationId: orgUser.organizationId,
    companyId,
    roleTemplateSlug: orgUser.roleTemplate?.slug,
    isExternalAdvisor: orgUser.isExternalAdvisor,
  }
}

/**
 * Require a specific granular permission - throws if not granted
 */
export async function requireGranularPermission(
  permission: GranularPermission,
  companyId?: string
): Promise<PermissionContext> {
  const context = await getPermissionContext(companyId)

  if (!context) {
    throw new Error('Unauthorized')
  }

  const result = await checkGranularPermission(permission, context.organizationUserId)

  if (!result.granted) {
    throw new Error(`Permission denied: ${permission}`)
  }

  return context
}

/**
 * Check multiple permissions at once - useful for UI rendering
 */
export async function checkMultiplePermissions(
  permissions: GranularPermission[],
  organizationUserId: string
): Promise<Record<GranularPermission, PermissionCheckResult>> {
  const resolved = await resolveUserPermissions(organizationUserId)
  const results: Record<string, PermissionCheckResult> = {}

  // Get all custom overrides for this user
  const customOverrides = await prisma.memberPermission.findMany({
    where: {
      organizationUserId,
      permission: { in: permissions },
    },
  })
  const customPermissionSet = new Set(customOverrides.map(o => o.permission))

  for (const permission of permissions) {
    const granted = resolved.permissions[permission] ?? false

    let source: 'custom' | 'template' | 'default_deny' = 'default_deny'
    if (customPermissionSet.has(permission)) {
      source = 'custom'
    } else if (resolved.templateSlug) {
      source = 'template'
    }

    results[permission] = {
      granted,
      source,
      permission,
    }
  }

  return results as Record<GranularPermission, PermissionCheckResult>
}

/**
 * Set a custom permission override for a member
 */
export async function setCustomPermission(
  organizationUserId: string,
  permission: GranularPermission,
  granted: boolean
): Promise<void> {
  await prisma.memberPermission.upsert({
    where: {
      organizationUserId_permission: {
        organizationUserId,
        permission,
      },
    },
    update: { granted },
    create: {
      organizationUserId,
      permission,
      granted,
    },
  })
}

/**
 * Remove a custom permission override (reverts to template default)
 */
export async function removeCustomPermission(
  organizationUserId: string,
  permission: GranularPermission
): Promise<void> {
  await prisma.memberPermission.deleteMany({
    where: {
      organizationUserId,
      permission,
    },
  })
}

/**
 * Set role template for a member
 */
export async function setRoleTemplate(
  organizationUserId: string,
  roleTemplateId: string | null
): Promise<void> {
  await prisma.organizationUser.update({
    where: { id: organizationUserId },
    data: { roleTemplateId },
  })
}

/**
 * Get all organizations where a user is an external advisor
 * Used for the advisor portal multi-client view
 */
export async function getAdvisorClients(userId: string): Promise<
  Array<{
    organizationId: string
    organizationName: string
    companyId: string
    companyName: string
    roleTemplateSlug?: string
  }>
> {
  const orgUsers = await prisma.organizationUser.findMany({
    where: {
      userId,
      isExternalAdvisor: true,
    },
    include: {
      organization: {
        include: {
          companies: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      roleTemplate: true,
    },
  })

  const clients: Array<{
    organizationId: string
    organizationName: string
    companyId: string
    companyName: string
    roleTemplateSlug?: string
  }> = []

  for (const orgUser of orgUsers) {
    for (const company of orgUser.organization.companies) {
      clients.push({
        organizationId: orgUser.organizationId,
        organizationName: orgUser.organization.name,
        companyId: company.id,
        companyName: company.name,
        roleTemplateSlug: orgUser.roleTemplate?.slug,
      })
    }
  }

  return clients
}

/**
 * Check if the current user is an external advisor for any organization
 */
export async function isExternalAdvisor(userId: string): Promise<boolean> {
  const count = await prisma.organizationUser.count({
    where: {
      userId,
      isExternalAdvisor: true,
    },
  })
  return count > 0
}
