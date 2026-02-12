/**
 * Workspace Role Definitions
 *
 * Phase 1 of workspace migration. These roles will eventually replace the
 * legacy UserRole enum on OrganizationUser for workspace-level (organization-level)
 * access control. This file is ADDITIVE ONLY -- it does not modify existing
 * permission checks or the UserRole enum.
 *
 * WorkspaceRole governs what a user can do at the organization/workspace level:
 * billing, member management, workspace settings, etc.
 */

/**
 * Legacy UserRole type (removed from Prisma schema, kept here for mapping functions).
 * This type is used only for the USER_ROLE_TO_WORKSPACE_ROLE migration mapping.
 */
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEADER' | 'MEMBER' | 'VIEWER'

/**
 * Local type definition matching the Prisma WorkspaceRole enum.
 * After running `prisma generate` post-migration, this can be replaced
 * with a re-export: `export type { WorkspaceRole } from '@prisma/client'`
 */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'BILLING' | 'MEMBER'

// ---------------------------------------------------------------------------
// Hierarchy
// ---------------------------------------------------------------------------

/**
 * Numeric hierarchy for WorkspaceRole comparisons.
 * Higher number = more authority.
 */
export const WORKSPACE_ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  BILLING: 2,
  MEMBER: 1,
} as const

// ---------------------------------------------------------------------------
// Migration map: legacy UserRole -> WorkspaceRole
// ---------------------------------------------------------------------------

/**
 * Maps each legacy UserRole value to its equivalent WorkspaceRole.
 * Used during the data migration phase (Phase 2+) to populate the new
 * WorkspaceRole column on OrganizationUser.
 *
 * NOTE: UserRole enum has been removed from the Prisma schema as of
 * migration 20260212000000_invite_role_to_workspace_role. This mapping
 * is kept for backward compatibility with any legacy code.
 *
 * Rationale:
 * - SUPER_ADMIN was the owner-equivalent role.
 * - ADMIN retains admin-level authority.
 * - TEAM_LEADER had limited management rights, maps to MEMBER in the
 *   workspace context (company-level LEAD gives them per-company power).
 * - MEMBER and VIEWER both map to MEMBER at the workspace level.
 *   VIEWER's read-only restriction is now expressed at the CompanyRole level.
 */
export const USER_ROLE_TO_WORKSPACE_ROLE: Record<UserRole, string> = {
  SUPER_ADMIN: 'OWNER',
  ADMIN: 'ADMIN',
  TEAM_LEADER: 'MEMBER',
  MEMBER: 'MEMBER',
  VIEWER: 'MEMBER',
} as const

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns true when the role has OWNER or ADMIN authority.
 * Useful for gating workspace-level settings pages, member management, etc.
 */
export function isWorkspaceAdmin(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/**
 * Returns true when the role can invite/remove/update workspace members.
 * OWNER and ADMIN can manage members. BILLING and MEMBER cannot.
 */
export function canManageMembers(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/**
 * Returns true when the role can manage billing, subscription, and plan changes.
 * OWNER, ADMIN, and BILLING can manage billing. MEMBER cannot.
 */
export function canManageBilling(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'BILLING'
}

/**
 * Compare two workspace roles. Returns true if `userRole` is at least as
 * high in the hierarchy as `requiredRole`.
 */
export function isWorkspaceRoleAtLeast(userRole: string, requiredRole: string): boolean {
  const userLevel = WORKSPACE_ROLE_HIERARCHY[userRole] ?? 0
  const requiredLevel = WORKSPACE_ROLE_HIERARCHY[requiredRole] ?? 0
  return userLevel >= requiredLevel
}

/**
 * Get display name for a workspace role.
 */
export function getWorkspaceRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    BILLING: 'Billing',
    MEMBER: 'Member',
  }
  return displayNames[role] ?? role
}

/**
 * Get description for a workspace role.
 */
export function getWorkspaceRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    OWNER: 'Full workspace control including billing, members, and all companies',
    ADMIN: 'Manage members, workspace settings, and all companies',
    BILLING: 'Manage subscription, invoices, and plan changes',
    MEMBER: 'Access assigned companies based on their company-level role',
  }
  return descriptions[role] ?? ''
}
