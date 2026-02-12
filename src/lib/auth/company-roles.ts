/**
 * Company Role Definitions
 *
 * Phase 1 of workspace migration. CompanyRole defines what a user can do
 * within a specific company. This replaces the implicit role derivation
 * from CompanyOwnership / CompanyStaffAccess / OrganizationUser membership
 * with an explicit, per-company role stored in the new CompanyMember model.
 *
 * This file is ADDITIVE ONLY -- it does not modify existing permission
 * checks or access control flows.
 */

import type { UserRole } from '@prisma/client'

/**
 * Local type definition matching the Prisma CompanyRole enum.
 * After running `prisma generate` post-migration, this can be replaced
 * with a re-export: `export type { CompanyRole } from '@prisma/client'`
 */
export type CompanyRole = 'LEAD' | 'CONTRIBUTOR' | 'VIEWER'

// ---------------------------------------------------------------------------
// Hierarchy
// ---------------------------------------------------------------------------

/**
 * Numeric hierarchy for CompanyRole comparisons.
 * Higher number = more authority within a company.
 */
export const COMPANY_ROLE_HIERARCHY: Record<string, number> = {
  LEAD: 3,
  CONTRIBUTOR: 2,
  VIEWER: 1,
} as const

// ---------------------------------------------------------------------------
// Migration map: legacy data -> CompanyRole
// ---------------------------------------------------------------------------

/**
 * Determines the CompanyRole for a user based on their legacy access records.
 * Used during the data migration phase (Phase 2+) to populate CompanyMember rows.
 *
 * Priority order (first match wins):
 * 1. CompanyOwnership with isSubscribingOwner = true  -> LEAD
 * 2. CompanyOwnership with isSubscribingOwner = false -> CONTRIBUTOR
 * 3. CompanyStaffAccess record                        -> CONTRIBUTOR (default)
 * 4. OrganizationUser with SUPER_ADMIN/ADMIN role     -> LEAD
 * 5. OrganizationUser with TEAM_LEADER/MEMBER role    -> CONTRIBUTOR
 * 6. OrganizationUser with VIEWER role                -> VIEWER
 */

/**
 * Maps a legacy OrganizationUser role to a CompanyRole.
 * This is the fallback when no CompanyOwnership or CompanyStaffAccess record exists.
 */
export const ORG_ROLE_TO_COMPANY_ROLE: Record<UserRole, string> = {
  SUPER_ADMIN: 'LEAD',
  ADMIN: 'LEAD',
  TEAM_LEADER: 'CONTRIBUTOR',
  MEMBER: 'CONTRIBUTOR',
  VIEWER: 'VIEWER',
} as const

/**
 * Derives a CompanyRole from legacy ownership data.
 * Returns the role string or null if no ownership record applies.
 */
export function deriveCompanyRoleFromOwnership(opts: {
  isSubscribingOwner?: boolean
  hasOwnership?: boolean
  hasStaffAccess?: boolean
}): string | null {
  if (opts.hasOwnership) {
    return opts.isSubscribingOwner ? 'LEAD' : 'CONTRIBUTOR'
  }
  if (opts.hasStaffAccess) {
    return 'CONTRIBUTOR'
  }
  return null
}

/**
 * Derives a CompanyRole from a legacy OrganizationUser role.
 * Used as the fallback when no direct ownership/staff record exists.
 */
export function deriveCompanyRoleFromOrgRole(orgRole: UserRole): string {
  return ORG_ROLE_TO_COMPANY_ROLE[orgRole] ?? 'VIEWER'
}

// ---------------------------------------------------------------------------
// Permission map
// ---------------------------------------------------------------------------

/**
 * Defines what each CompanyRole can do within a company.
 *
 * These are coarse-grained capability flags. The granular permission system
 * (module.resource:action) from permissions.ts still applies on top of this
 * for fine-grained control.
 */
export const COMPANY_ROLE_PERMISSIONS: Record<string, {
  view: boolean
  edit: boolean
  manageTeam: boolean
  manageSettings: boolean
  delete: boolean
}> = {
  LEAD: {
    view: true,
    edit: true,
    manageTeam: true,
    manageSettings: true,
    delete: true,
  },
  CONTRIBUTOR: {
    view: true,
    edit: true,
    manageTeam: false,
    manageSettings: false,
    delete: false,
  },
  VIEWER: {
    view: true,
    edit: false,
    manageTeam: false,
    manageSettings: false,
    delete: false,
  },
} as const

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Check if a company role can perform a specific action.
 */
export function hasCompanyPermission(
  role: string,
  action: 'view' | 'edit' | 'manageTeam' | 'manageSettings' | 'delete'
): boolean {
  const permissions = COMPANY_ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions[action]
}

/**
 * Compare two company roles. Returns true if `userRole` is at least as
 * high in the hierarchy as `requiredRole`.
 */
export function isCompanyRoleAtLeast(userRole: string, requiredRole: string): boolean {
  const userLevel = COMPANY_ROLE_HIERARCHY[userRole] ?? 0
  const requiredLevel = COMPANY_ROLE_HIERARCHY[requiredRole] ?? 0
  return userLevel >= requiredLevel
}

/**
 * Get display name for a company role.
 */
export function getCompanyRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    LEAD: 'Lead',
    CONTRIBUTOR: 'Contributor',
    VIEWER: 'Viewer',
  }
  return displayNames[role] ?? role
}

/**
 * Get description for a company role.
 */
export function getCompanyRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    LEAD: 'Full access to company data, settings, and team management',
    CONTRIBUTOR: 'Can view and edit company data, complete tasks, and upload evidence',
    VIEWER: 'Read-only access to company data and reports',
  }
  return descriptions[role] ?? ''
}
