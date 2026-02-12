// Role-Based Access Control (RBAC) Permission Definitions
// Maps roles to allowed actions across the application

import type { WorkspaceRole } from './workspace-roles'

// ============================================
// WORKSPACE PERMISSIONS
// ============================================

// Permission definitions - which workspace roles can perform each action
export const PERMISSIONS = {
  // Company operations
  COMPANY_CREATE: ['OWNER', 'ADMIN'] as const,
  COMPANY_UPDATE: ['OWNER', 'ADMIN', 'MEMBER'] as const,
  COMPANY_DELETE: ['OWNER', 'ADMIN'] as const,
  COMPANY_VIEW: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,

  // Assessment operations
  ASSESSMENT_CREATE: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,
  ASSESSMENT_COMPLETE: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,
  ASSESSMENT_VIEW: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,

  // Task operations
  TASK_UPDATE: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,
  TASK_ASSIGN: ['OWNER', 'ADMIN'] as const,
  TASK_VIEW: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,

  // Workspace management (formerly Organization)
  ORG_VIEW: ['OWNER', 'ADMIN', 'BILLING', 'MEMBER'] as const,
  ORG_MANAGE_MEMBERS: ['OWNER', 'ADMIN'] as const,
  ORG_INVITE_USERS: ['OWNER', 'ADMIN'] as const,
  ORG_UPDATE_ROLES: ['OWNER', 'ADMIN'] as const,
  ORG_DELETE: ['OWNER'] as const,
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission]
  return (allowedRoles as readonly string[]).includes(role)
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: WorkspaceRole): Permission[] {
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
export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  BILLING: 2,
  MEMBER: 1,
}

/**
 * Check if one role is higher or equal in hierarchy to another
 */
export function isRoleAtLeast(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: WorkspaceRole): string {
  const displayNames: Record<WorkspaceRole, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    BILLING: 'Billing',
    MEMBER: 'Member',
  }
  return displayNames[role]
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: WorkspaceRole): string {
  const descriptions: Record<WorkspaceRole, string> = {
    OWNER: 'Full access to all features and workspace management',
    ADMIN: 'Can manage companies, assessments, and team members',
    BILLING: 'Can manage subscription and billing',
    MEMBER: 'Can complete assessments and update tasks',
  }
  return descriptions[role]
}

// ============================================
// GRANULAR PERMISSIONS (module.resource:action format)
// ============================================

/**
 * Granular Permission Format: module.resource:action
 *
 * Modules:
 * - assessments: Company and personal assessments
 * - financials: Business financial data
 * - personal: Personal financial data (sensitive)
 * - valuation: Valuation reports
 * - dataroom: Data room documents
 * - playbook: Action plan tasks
 * - team: Team management
 */

// All available granular permissions
export const GRANULAR_PERMISSIONS = {
  // Assessments
  'assessments.company:view': 'View company assessments',
  'assessments.company:edit': 'Edit company assessments',
  'assessments.personal:view': 'View personal readiness assessments',
  'assessments.personal:edit': 'Edit personal readiness assessments',

  // Business Financials
  'financials.statements:view': 'View financial statements',
  'financials.statements:edit': 'Edit financial statements',
  'financials.adjustments:view': 'View EBITDA adjustments',
  'financials.adjustments:edit': 'Edit EBITDA adjustments',
  'financials.dcf:view': 'View DCF analysis',
  'financials.dcf:edit': 'Edit DCF assumptions',

  // Personal Financials (sensitive)
  'personal.retirement:view': 'View retirement accounts',
  'personal.retirement:edit': 'Edit retirement accounts',
  'personal.net_worth:view': 'View net worth',
  'personal.net_worth:edit': 'Edit net worth data',

  // Valuation
  'valuation.summary:view': 'View valuation summary',
  'valuation.detailed:view': 'View detailed valuation breakdown',

  // Data Room - by category
  'dataroom.financial:view': 'View financial documents',
  'dataroom.financial:upload': 'Upload financial documents',
  'dataroom.legal:view': 'View legal documents',
  'dataroom.legal:upload': 'Upload legal documents',
  'dataroom.operations:view': 'View operations documents',
  'dataroom.operations:upload': 'Upload operations documents',
  'dataroom.customers:view': 'View customer documents',
  'dataroom.customers:upload': 'Upload customer documents',
  'dataroom.employees:view': 'View employee documents',
  'dataroom.employees:upload': 'Upload employee documents',
  'dataroom.ip:view': 'View IP documents',
  'dataroom.ip:upload': 'Upload IP documents',

  // Playbook (Action Plan)
  'playbook.tasks:view': 'View action plan tasks',
  'playbook.tasks:complete': 'Complete tasks',
  'playbook.tasks:create': 'Create new tasks',
  'playbook.tasks:assign': 'Assign tasks to team members',

  // Team Management
  'team.members:view': 'View team members',
  'team.members:invite': 'Invite new members',
  'team.members:manage': 'Manage member permissions',
  'team.members:remove': 'Remove team members',
} as const

export type GranularPermission = keyof typeof GRANULAR_PERMISSIONS

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  assessments: {
    label: 'Assessments',
    icon: 'clipboard-check',
    permissions: [
      'assessments.company:view',
      'assessments.company:edit',
      'assessments.personal:view',
      'assessments.personal:edit',
    ] as GranularPermission[],
  },
  financials: {
    label: 'Business Financials',
    icon: 'chart-bar',
    permissions: [
      'financials.statements:view',
      'financials.statements:edit',
      'financials.adjustments:view',
      'financials.adjustments:edit',
      'financials.dcf:view',
      'financials.dcf:edit',
    ] as GranularPermission[],
  },
  personal: {
    label: 'Personal Financials',
    icon: 'lock',
    sensitive: true,
    permissions: [
      'personal.retirement:view',
      'personal.retirement:edit',
      'personal.net_worth:view',
      'personal.net_worth:edit',
    ] as GranularPermission[],
  },
  valuation: {
    label: 'Valuation',
    icon: 'trending-up',
    permissions: [
      'valuation.summary:view',
      'valuation.detailed:view',
    ] as GranularPermission[],
  },
  dataroom: {
    label: 'Data Room',
    icon: 'folder',
    permissions: [
      'dataroom.financial:view',
      'dataroom.financial:upload',
      'dataroom.legal:view',
      'dataroom.legal:upload',
      'dataroom.operations:view',
      'dataroom.operations:upload',
      'dataroom.customers:view',
      'dataroom.customers:upload',
      'dataroom.employees:view',
      'dataroom.employees:upload',
      'dataroom.ip:view',
      'dataroom.ip:upload',
    ] as GranularPermission[],
  },
  playbook: {
    label: 'Action Plan',
    icon: 'list-checks',
    permissions: [
      'playbook.tasks:view',
      'playbook.tasks:complete',
      'playbook.tasks:create',
      'playbook.tasks:assign',
    ] as GranularPermission[],
  },
  team: {
    label: 'Team Management',
    icon: 'users',
    permissions: [
      'team.members:view',
      'team.members:invite',
      'team.members:manage',
      'team.members:remove',
    ] as GranularPermission[],
  },
} as const

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES

// ============================================
// ROLE TEMPLATES
// ============================================

export interface RoleTemplateDefinition {
  slug: string
  name: string
  description: string
  icon: string
  isExternal: boolean // External advisor vs internal team
  defaultPermissions: Record<GranularPermission, boolean>
}

// Built-in role template definitions
export const ROLE_TEMPLATES: Record<string, RoleTemplateDefinition> = {
  owner: {
    slug: 'owner',
    name: 'Owner',
    description: 'Full access to all features and data',
    icon: 'crown',
    isExternal: false,
    defaultPermissions: Object.fromEntries(
      Object.keys(GRANULAR_PERMISSIONS).map(p => [p, true])
    ) as Record<GranularPermission, boolean>,
  },
  cpa: {
    slug: 'cpa',
    name: 'CPA / Accountant',
    description: 'Access to financials, valuation, and financial documents',
    icon: 'calculator',
    isExternal: true,
    defaultPermissions: {
      // Assessments - view only company, no personal
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - full access
      'financials.statements:view': true,
      'financials.statements:edit': true,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': true,
      'financials.dcf:view': true,
      'financials.dcf:edit': true,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - view only
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - financial only
      'dataroom.financial:view': true,
      'dataroom.financial:upload': true,
      'dataroom.legal:view': false,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': false,
      'dataroom.operations:upload': false,
      'dataroom.customers:view': false,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': false,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - view only
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  attorney: {
    slug: 'attorney',
    name: 'Attorney',
    description: 'Access to legal documents and compliance data',
    icon: 'scale',
    isExternal: true,
    defaultPermissions: {
      // Assessments - limited view
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - no access
      'financials.statements:view': false,
      'financials.statements:edit': false,
      'financials.adjustments:view': false,
      'financials.adjustments:edit': false,
      'financials.dcf:view': false,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - no access
      'valuation.summary:view': false,
      'valuation.detailed:view': false,
      // Data Room - legal, operations, IP
      'dataroom.financial:view': false,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': true,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': false,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': true,
      // Playbook - view only
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  wealth_advisor: {
    slug: 'wealth_advisor',
    name: 'Wealth Advisor',
    description: 'Access to personal financials, valuation, and personal readiness',
    icon: 'wallet',
    isExternal: true,
    defaultPermissions: {
      // Assessments - personal focus
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': true,
      'assessments.personal:edit': true,
      // Business Financials - view only
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': true,
      'financials.dcf:edit': false,
      // Personal Financials - full access
      'personal.retirement:view': true,
      'personal.retirement:edit': true,
      'personal.net_worth:view': true,
      'personal.net_worth:edit': true,
      // Valuation - view only
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - limited
      'dataroom.financial:view': true,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': false,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': false,
      'dataroom.operations:upload': false,
      'dataroom.customers:view': false,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': false,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - limited
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  ma_advisor: {
    slug: 'ma_advisor',
    name: 'M&A Advisor',
    description: 'Full business access for deal preparation',
    icon: 'handshake',
    isExternal: true,
    defaultPermissions: {
      // Assessments - full company access
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - full access
      'financials.statements:view': true,
      'financials.statements:edit': true,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': true,
      'financials.dcf:view': true,
      'financials.dcf:edit': true,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - full view
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - full access
      'dataroom.financial:view': true,
      'dataroom.financial:upload': true,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': true,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': true,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': true,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': true,
      // Playbook - full access
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': true,
      'playbook.tasks:assign': true,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  consultant: {
    slug: 'consultant',
    name: 'Consultant',
    description: 'Access to assessments, operations, and playbook',
    icon: 'briefcase',
    isExternal: true,
    defaultPermissions: {
      // Assessments - full company access
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - limited view
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': false,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - summary only
      'valuation.summary:view': true,
      'valuation.detailed:view': false,
      // Data Room - operations focus
      'dataroom.financial:view': false,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': false,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - full access
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': true,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  internal_team: {
    slug: 'internal_team',
    name: 'Internal Team',
    description: 'Access to assessments and assigned tasks',
    icon: 'user',
    isExternal: false,
    defaultPermissions: {
      // Assessments - company only
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - view only
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': false,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - summary only
      'valuation.summary:view': true,
      'valuation.detailed:view': false,
      // Data Room - view only
      'dataroom.financial:view': true,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - can complete tasks
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  view_only: {
    slug: 'view_only',
    name: 'View Only',
    description: 'Read-only access across permitted areas',
    icon: 'eye',
    isExternal: false,
    defaultPermissions: {
      // Assessments - view only
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - view only
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': true,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - view only
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - view only
      'dataroom.financial:view': true,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': false,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': false,
      // Playbook - view only
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
} as const

// Helper to get permission description
export function getPermissionDescription(permission: GranularPermission): string {
  return GRANULAR_PERMISSIONS[permission]
}

// Helper to parse permission into module, resource, and action
export function parsePermission(permission: GranularPermission): {
  module: string
  resource: string
  action: string
} {
  const [moduleResource, action] = permission.split(':')
  const [module, resource] = moduleResource.split('.')
  return { module, resource, action }
}

// Helper to get all permissions for a module
export function getModulePermissions(module: string): GranularPermission[] {
  return (Object.keys(GRANULAR_PERMISSIONS) as GranularPermission[]).filter(
    p => p.startsWith(`${module}.`)
  )
}

// Helper to check if a permission is for sensitive data
export function isSensitivePermission(permission: GranularPermission): boolean {
  return permission.startsWith('personal.')
}
