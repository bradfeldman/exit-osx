// Role-Based Access Control (RBAC) Permission Definitions
// Maps roles to allowed actions across the application

import { UserRole } from '@prisma/client'

// Permission definitions - which roles can perform each action
export const PERMISSIONS = {
  // Company operations
  COMPANY_CREATE: ['SUPER_ADMIN', 'ADMIN'] as const,
  COMPANY_UPDATE: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER'] as const,
  COMPANY_DELETE: ['SUPER_ADMIN', 'ADMIN'] as const,
  COMPANY_VIEW: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER'] as const,

  // Assessment operations
  ASSESSMENT_CREATE: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER'] as const,
  ASSESSMENT_COMPLETE: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER'] as const,
  ASSESSMENT_VIEW: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER'] as const,

  // Task operations
  TASK_UPDATE: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER'] as const,
  TASK_ASSIGN: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER'] as const,
  TASK_VIEW: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER'] as const,

  // Organization management
  ORG_VIEW: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER'] as const,
  ORG_MANAGE_MEMBERS: ['SUPER_ADMIN', 'ADMIN'] as const,
  ORG_INVITE_USERS: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER'] as const,
  ORG_UPDATE_ROLES: ['SUPER_ADMIN', 'ADMIN'] as const,
  ORG_DELETE: ['SUPER_ADMIN'] as const,
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission]
  return (allowedRoles as readonly string[]).includes(role)
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  const permissions: Permission[] = []
  for (const [permission, roles] of Object.entries(PERMISSIONS)) {
    if ((roles as readonly string[]).includes(role)) {
      permissions.push(permission as Permission)
    }
  }
  return permissions
}

/**
 * Role hierarchy - higher roles include permissions of lower roles
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  TEAM_LEADER: 3,
  MEMBER: 2,
  VIEWER: 1,
}

/**
 * Check if one role is higher or equal in hierarchy to another
 */
export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    TEAM_LEADER: 'Team Leader',
    MEMBER: 'Member',
    VIEWER: 'Viewer',
  }
  return displayNames[role]
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    SUPER_ADMIN: 'Full access to all features and organization management',
    ADMIN: 'Can manage companies, assessments, and team members',
    TEAM_LEADER: 'Can create assessments, manage tasks, and invite members',
    MEMBER: 'Can complete assessments and update tasks',
    VIEWER: 'Read-only access to view data',
  }
  return descriptions[role]
}
