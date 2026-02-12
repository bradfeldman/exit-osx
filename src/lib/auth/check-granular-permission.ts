// Granular Permission Resolution System
// Resolves permissions using: Template Defaults + Custom Overrides
//
// Phase 3 additions:
// - checkCompanyRolePermission(): checks a high-level Permission against CompanyRole
// - resolveCompanyMemberPermissions(): resolves granular permissions for a CompanyMember

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { GranularPermission, ROLE_TEMPLATES, Permission } from './permissions'
import { type CompanyRole, COMPANY_ROLE_PERMISSIONS, hasCompanyPermission } from './company-roles'

export interface PermissionContext {
  userId: string
  workspaceMemberId: string
  workspaceId: string
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
 * Get all resolved permissions for a user in a workspace
 * Resolution order: Custom Override > Template Default > Default Deny
 */
export async function resolveUserPermissions(
  workspaceMemberId: string
): Promise<ResolvedPermissions> {
  // Fetch the workspace member with their role template and custom permissions
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { id: workspaceMemberId },
    include: {
      roleTemplate: true,
      customPermissions: true,
    },
  })

  if (!workspaceMember) {
    throw new Error('Workspace member not found')
  }

  // Start with template defaults or empty if no template
  let permissions: Record<GranularPermission, boolean> = {} as Record<GranularPermission, boolean>

  if (workspaceMember.roleTemplate) {
    // Get template defaults from database
    const templateDefaults = workspaceMember.roleTemplate.defaultPermissions as Record<string, boolean>
    permissions = { ...templateDefaults } as Record<GranularPermission, boolean>
  } else if (workspaceMember.roleTemplateId === null) {
    // ADMIN and SUPER_ADMIN roles get full owner permissions without explicit template
    // These are typically the account owner who created the workspace
    // MEMBER roles must have an explicit role template assigned
    if (workspaceMember.role === 'SUPER_ADMIN' || workspaceMember.role === 'ADMIN') {
      const ownerTemplate = ROLE_TEMPLATES.owner
      permissions = { ...ownerTemplate.defaultPermissions }
    }
    // MEMBER roles without templates get NO granular permissions by default
    // They must be assigned an explicit role template
  }

  // Apply custom overrides
  const customOverrides = workspaceMember.customPermissions || []
  for (const override of customOverrides) {
    permissions[override.permission as GranularPermission] = override.granted
  }

  return {
    permissions,
    templateSlug: workspaceMember.roleTemplate?.slug,
    hasCustomOverrides: customOverrides.length > 0,
  }
}

/**
 * Check if a user has a specific granular permission
 */
export async function checkGranularPermission(
  permission: GranularPermission,
  workspaceMemberId: string
): Promise<PermissionCheckResult> {
  const resolved = await resolveUserPermissions(workspaceMemberId)

  const granted = resolved.permissions[permission] ?? false

  // Determine the source
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { id: workspaceMemberId },
    include: {
      customPermissions: {
        where: { permission },
      },
    },
  })

  let source: 'custom' | 'template' | 'default_deny' = 'default_deny'
  if (workspaceMember?.customPermissions?.length) {
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
      workspaces: {
        include: {
          workspace: {
            include: {
              companies: true,
            },
          },
          roleTemplate: true,
        },
      },
    },
  })

  if (!user || user.workspaces.length === 0) {
    return null
  }

  // Find the relevant workspace member
  let workspaceMember = user.workspaces[0]

  // If companyId is provided, find the workspace that owns that company
  if (companyId) {
    const matchingWorkspace = user.workspaces.find(wm =>
      wm.workspace.companies.some(c => c.id === companyId)
    )
    if (matchingWorkspace) {
      workspaceMember = matchingWorkspace
    }
  }

  return {
    userId: user.id,
    workspaceMemberId: workspaceMember.id,
    workspaceId: workspaceMember.workspaceId,
    companyId,
    roleTemplateSlug: workspaceMember.roleTemplate?.slug,
    isExternalAdvisor: workspaceMember.isExternalAdvisor,
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

  const result = await checkGranularPermission(permission, context.workspaceMemberId)

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
  workspaceMemberId: string
): Promise<Record<GranularPermission, PermissionCheckResult>> {
  const resolved = await resolveUserPermissions(workspaceMemberId)
  const results: Record<string, PermissionCheckResult> = {}

  // Get all custom overrides for this user
  const customOverrides = await prisma.memberPermission.findMany({
    where: {
      workspaceMemberId,
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
  workspaceMemberId: string,
  permission: GranularPermission,
  granted: boolean
): Promise<void> {
  await prisma.memberPermission.upsert({
    where: {
      workspaceMemberId_permission: {
        workspaceMemberId,
        permission,
      },
    },
    update: { granted },
    create: {
      workspaceMemberId,
      permission,
      granted,
    },
  })
}

/**
 * Remove a custom permission override (reverts to template default)
 */
export async function removeCustomPermission(
  workspaceMemberId: string,
  permission: GranularPermission
): Promise<void> {
  await prisma.memberPermission.deleteMany({
    where: {
      workspaceMemberId,
      permission,
    },
  })
}

/**
 * Set role template for a member
 */
export async function setRoleTemplate(
  workspaceMemberId: string,
  roleTemplateId: string | null
): Promise<void> {
  await prisma.workspaceMember.update({
    where: { id: workspaceMemberId },
    data: { roleTemplateId },
  })
}

/**
 * Get all workspaces where a user is an external advisor
 * Used for the advisor portal multi-client view
 */
export async function getAdvisorClients(userId: string): Promise<
  Array<{
    workspaceId: string
    workspaceName: string
    companyId: string
    companyName: string
    roleTemplateSlug?: string
  }>
> {
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      userId,
      isExternalAdvisor: true,
    },
    include: {
      workspace: {
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
    workspaceId: string
    workspaceName: string
    companyId: string
    companyName: string
    roleTemplateSlug?: string
  }> = []

  for (const workspaceMember of workspaceMembers) {
    for (const company of workspaceMember.workspace.companies) {
      clients.push({
        workspaceId: workspaceMember.workspaceId,
        workspaceName: workspaceMember.workspace.name,
        companyId: company.id,
        companyName: company.name,
        roleTemplateSlug: workspaceMember.roleTemplate?.slug,
      })
    }
  }

  return clients
}

/**
 * Check if the current user is an external advisor for any workspace
 */
export async function isExternalAdvisor(userId: string): Promise<boolean> {
  const count = await prisma.workspaceMember.count({
    where: {
      userId,
      isExternalAdvisor: true,
    },
  })
  return count > 0
}

// ============================================
// Phase 3 — CompanyRole Permission Checks
// ============================================

/**
 * Maps high-level Permission names (from the legacy RBAC system) to the
 * coarse-grained CompanyRole capability they require.
 *
 * Permissions that are purely workspace/org-level (ORG_*) are not mapped here
 * and will return false (not applicable at the company level).
 */
const PERMISSION_TO_COMPANY_CAPABILITY: Partial<Record<Permission, keyof typeof COMPANY_ROLE_PERMISSIONS['LEAD']>> = {
  // Company operations
  COMPANY_VIEW: 'view',
  COMPANY_UPDATE: 'edit',
  COMPANY_CREATE: 'manageSettings',
  COMPANY_DELETE: 'delete',

  // Assessment operations
  ASSESSMENT_VIEW: 'view',
  ASSESSMENT_CREATE: 'edit',
  ASSESSMENT_COMPLETE: 'edit',

  // Task operations
  TASK_VIEW: 'view',
  TASK_UPDATE: 'edit',
  TASK_ASSIGN: 'manageTeam',
}

/**
 * Check if a CompanyRole has a specific high-level permission.
 *
 * This maps legacy Permission names (e.g. 'COMPANY_VIEW', 'TASK_UPDATE') to
 * the CompanyRole capability system. Useful for dual-read callers that want
 * to check CompanyMember permissions using the familiar Permission type.
 *
 * Returns false for org-level permissions (ORG_*) that have no CompanyRole
 * equivalent -- those must still be checked via the legacy OrganizationUser path.
 *
 * @param companyRole - The CompanyRole to check (LEAD, CONTRIBUTOR, VIEWER)
 * @param permission - The legacy Permission name to check
 * @returns true if the company role grants this permission
 */
export function checkCompanyRolePermission(companyRole: CompanyRole, permission: Permission): boolean {
  const capability = PERMISSION_TO_COMPANY_CAPABILITY[permission]

  // Org-level permissions are not governed by CompanyRole
  if (!capability) {
    return false
  }

  return hasCompanyPermission(companyRole, capability)
}

/**
 * Resolve granular permissions for a CompanyMember.
 *
 * Maps the CompanyRole to an equivalent set of granular permissions by
 * using the coarse capability flags (view/edit/manageTeam/manageSettings/delete)
 * to derive which granular permissions should be granted.
 *
 * This produces a permission set that parallels what resolveUserPermissions()
 * returns for the legacy OrganizationUser path, enabling dual-read at the
 * granular level.
 */
export function resolveCompanyMemberGranularPermissions(
  companyRole: CompanyRole
): Record<GranularPermission, boolean> {
  const caps = COMPANY_ROLE_PERMISSIONS[companyRole]
  if (!caps) {
    // Unknown role -- deny everything
    return {} as Record<GranularPermission, boolean>
  }

  const result: Partial<Record<GranularPermission, boolean>> = {}

  // Assessments
  result['assessments.company:view'] = caps.view
  result['assessments.company:edit'] = caps.edit
  result['assessments.personal:view'] = caps.view
  result['assessments.personal:edit'] = caps.edit

  // Business Financials
  result['financials.statements:view'] = caps.view
  result['financials.statements:edit'] = caps.edit
  result['financials.adjustments:view'] = caps.view
  result['financials.adjustments:edit'] = caps.edit
  result['financials.dcf:view'] = caps.view
  result['financials.dcf:edit'] = caps.edit

  // Personal Financials — same as capabilities (sensitive gate handled elsewhere)
  result['personal.retirement:view'] = caps.view
  result['personal.retirement:edit'] = caps.edit
  result['personal.net_worth:view'] = caps.view
  result['personal.net_worth:edit'] = caps.edit

  // Valuation
  result['valuation.summary:view'] = caps.view
  result['valuation.detailed:view'] = caps.view

  // Data Room — all categories follow view/edit (upload = edit)
  const drCategories = ['financial', 'legal', 'operations', 'customers', 'employees', 'ip'] as const
  for (const cat of drCategories) {
    result[`dataroom.${cat}:view` as GranularPermission] = caps.view
    result[`dataroom.${cat}:upload` as GranularPermission] = caps.edit
  }

  // Playbook
  result['playbook.tasks:view'] = caps.view
  result['playbook.tasks:complete'] = caps.edit
  result['playbook.tasks:create'] = caps.edit
  result['playbook.tasks:assign'] = caps.manageTeam

  // Team Management
  result['team.members:view'] = caps.view
  result['team.members:invite'] = caps.manageTeam
  result['team.members:manage'] = caps.manageTeam
  result['team.members:remove'] = caps.manageTeam

  return result as Record<GranularPermission, boolean>
}
