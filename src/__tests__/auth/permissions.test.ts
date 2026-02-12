/**
 * Permissions Tests
 * Tests RBAC permission definitions and role hierarchies
 *
 * SECURITY: Ensures role-based access control is correctly configured
 */

import { describe, it, expect } from 'vitest'
import {
  PERMISSIONS,
  hasPermission,
  getPermissionsForRole,
  ROLE_HIERARCHY,
  isRoleAtLeast,
  getRoleDisplayName,
  getRoleDescription,
  GRANULAR_PERMISSIONS,
  ROLE_TEMPLATES,
  parsePermission,
  getModulePermissions,
  isSensitivePermission,
} from '@/lib/auth/permissions'
import type { Permission, GranularPermission } from '@/lib/auth/permissions'
import type { WorkspaceRole } from '@/lib/auth/workspace-roles'

describe('Permissions Module', () => {
  describe('PERMISSIONS (Workspace RBAC)', () => {
    it('has all core permission categories defined', () => {
      expect(PERMISSIONS.COMPANY_CREATE).toBeDefined()
      expect(PERMISSIONS.COMPANY_UPDATE).toBeDefined()
      expect(PERMISSIONS.COMPANY_DELETE).toBeDefined()
      expect(PERMISSIONS.COMPANY_VIEW).toBeDefined()
      expect(PERMISSIONS.ASSESSMENT_CREATE).toBeDefined()
      expect(PERMISSIONS.TASK_UPDATE).toBeDefined()
      expect(PERMISSIONS.ORG_MANAGE_MEMBERS).toBeDefined()
    })

    it('OWNER has all permissions', () => {
      const permissions = Object.keys(PERMISSIONS) as Permission[]

      for (const permission of permissions) {
        expect(hasPermission('OWNER', permission)).toBe(true)
      }
    })

    it('MEMBER has view and update permissions but not admin permissions', () => {
      expect(hasPermission('MEMBER', 'COMPANY_VIEW')).toBe(true)
      expect(hasPermission('MEMBER', 'ASSESSMENT_VIEW')).toBe(true)
      expect(hasPermission('MEMBER', 'TASK_VIEW')).toBe(true)
      expect(hasPermission('MEMBER', 'TASK_UPDATE')).toBe(true)

      expect(hasPermission('MEMBER', 'TASK_ASSIGN')).toBe(false)
      expect(hasPermission('MEMBER', 'COMPANY_CREATE')).toBe(false)
      expect(hasPermission('MEMBER', 'ORG_MANAGE_MEMBERS')).toBe(false)
    })

    it('BILLING has same access as MEMBER for most operations', () => {
      expect(hasPermission('BILLING', 'TASK_UPDATE')).toBe(true)
      expect(hasPermission('BILLING', 'COMPANY_VIEW')).toBe(true)
      expect(hasPermission('BILLING', 'ASSESSMENT_CREATE')).toBe(true)

      expect(hasPermission('BILLING', 'TASK_ASSIGN')).toBe(false)
      expect(hasPermission('BILLING', 'ORG_MANAGE_MEMBERS')).toBe(false)
    })

    it('only OWNER and ADMIN can assign tasks', () => {
      expect(hasPermission('OWNER', 'TASK_ASSIGN')).toBe(true)
      expect(hasPermission('ADMIN', 'TASK_ASSIGN')).toBe(true)
      expect(hasPermission('BILLING', 'TASK_ASSIGN')).toBe(false)
      expect(hasPermission('MEMBER', 'TASK_ASSIGN')).toBe(false)
    })

    it('only OWNER can delete workspace', () => {
      expect(hasPermission('OWNER', 'ORG_DELETE')).toBe(true)
      expect(hasPermission('ADMIN', 'ORG_DELETE')).toBe(false)
      expect(hasPermission('BILLING', 'ORG_DELETE')).toBe(false)
      expect(hasPermission('MEMBER', 'ORG_DELETE')).toBe(false)
    })

    it('only OWNER and ADMIN can manage members', () => {
      expect(hasPermission('OWNER', 'ORG_MANAGE_MEMBERS')).toBe(true)
      expect(hasPermission('ADMIN', 'ORG_MANAGE_MEMBERS')).toBe(true)
      expect(hasPermission('BILLING', 'ORG_MANAGE_MEMBERS')).toBe(false)
      expect(hasPermission('MEMBER', 'ORG_MANAGE_MEMBERS')).toBe(false)
    })
  })

  describe('getPermissionsForRole', () => {
    it('returns all permissions for OWNER', () => {
      const permissions = getPermissionsForRole('OWNER')
      const allPermissions = Object.keys(PERMISSIONS)

      expect(permissions.length).toBe(allPermissions.length)
    })

    it('returns empty array for invalid role', () => {
      const permissions = getPermissionsForRole('INVALID' as WorkspaceRole)

      expect(permissions).toEqual([])
    })

    it('returns subset for MEMBER', () => {
      const permissions = getPermissionsForRole('MEMBER')

      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions.length).toBeLessThan(Object.keys(PERMISSIONS).length)
      // Member has view permissions and some update permissions
      expect(permissions.some(p => p.includes('VIEW'))).toBe(true)
    })

    it('BILLING has slightly fewer permissions than MEMBER', () => {
      const billingPerms = getPermissionsForRole('BILLING')
      const memberPerms = getPermissionsForRole('MEMBER')

      // BILLING cannot update companies, but MEMBER can
      expect(billingPerms.length).toBe(memberPerms.length - 1)
      expect(billingPerms.includes('COMPANY_UPDATE' as Permission)).toBe(false)
      expect(memberPerms.includes('COMPANY_UPDATE' as Permission)).toBe(true)

      // But BILLING has most of the same view/update permissions otherwise
      expect(billingPerms.includes('TASK_UPDATE' as Permission)).toBe(true)
      expect(billingPerms.includes('ASSESSMENT_CREATE' as Permission)).toBe(true)
    })
  })

  describe('ROLE_HIERARCHY', () => {
    it('has all workspace roles defined', () => {
      expect(ROLE_HIERARCHY.OWNER).toBeDefined()
      expect(ROLE_HIERARCHY.ADMIN).toBeDefined()
      expect(ROLE_HIERARCHY.BILLING).toBeDefined()
      expect(ROLE_HIERARCHY.MEMBER).toBeDefined()
    })

    it('has correct hierarchy order', () => {
      expect(ROLE_HIERARCHY.OWNER).toBeGreaterThan(ROLE_HIERARCHY.ADMIN)
      expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.BILLING)
      expect(ROLE_HIERARCHY.BILLING).toBeGreaterThan(ROLE_HIERARCHY.MEMBER)
    })

    it('OWNER is highest level', () => {
      const levels = Object.values(ROLE_HIERARCHY)
      const maxLevel = Math.max(...levels)

      expect(ROLE_HIERARCHY.OWNER).toBe(maxLevel)
    })

    it('MEMBER is lowest level', () => {
      const levels = Object.values(ROLE_HIERARCHY)
      const minLevel = Math.min(...levels)

      expect(ROLE_HIERARCHY.MEMBER).toBe(minLevel)
    })
  })

  describe('isRoleAtLeast', () => {
    it('OWNER is at least any role', () => {
      expect(isRoleAtLeast('OWNER', 'OWNER')).toBe(true)
      expect(isRoleAtLeast('OWNER', 'ADMIN')).toBe(true)
      expect(isRoleAtLeast('OWNER', 'BILLING')).toBe(true)
      expect(isRoleAtLeast('OWNER', 'MEMBER')).toBe(true)
    })

    it('MEMBER is not at least higher roles', () => {
      expect(isRoleAtLeast('MEMBER', 'OWNER')).toBe(false)
      expect(isRoleAtLeast('MEMBER', 'ADMIN')).toBe(false)
      expect(isRoleAtLeast('MEMBER', 'BILLING')).toBe(false)
    })

    it('role is at least itself', () => {
      expect(isRoleAtLeast('ADMIN', 'ADMIN')).toBe(true)
      expect(isRoleAtLeast('MEMBER', 'MEMBER')).toBe(true)
      expect(isRoleAtLeast('BILLING', 'BILLING')).toBe(true)
    })

    it('BILLING is at least MEMBER but not ADMIN', () => {
      expect(isRoleAtLeast('BILLING', 'MEMBER')).toBe(true)
      expect(isRoleAtLeast('BILLING', 'ADMIN')).toBe(false)
      expect(isRoleAtLeast('BILLING', 'OWNER')).toBe(false)
    })

    it('ADMIN is at least BILLING and MEMBER but not OWNER', () => {
      expect(isRoleAtLeast('ADMIN', 'BILLING')).toBe(true)
      expect(isRoleAtLeast('ADMIN', 'MEMBER')).toBe(true)
      expect(isRoleAtLeast('ADMIN', 'OWNER')).toBe(false)
    })
  })

  describe('getRoleDisplayName and getRoleDescription', () => {
    it('returns display names for all roles', () => {
      expect(getRoleDisplayName('OWNER')).toBe('Owner')
      expect(getRoleDisplayName('ADMIN')).toBe('Admin')
      expect(getRoleDisplayName('BILLING')).toBe('Billing')
      expect(getRoleDisplayName('MEMBER')).toBe('Member')
    })

    it('returns descriptions for all roles', () => {
      const ownerDesc = getRoleDescription('OWNER')
      expect(ownerDesc).toContain('Full access')

      const billingDesc = getRoleDescription('BILLING')
      expect(billingDesc).toContain('billing')

      const memberDesc = getRoleDescription('MEMBER')
      expect(memberDesc).toContain('assessments')
    })
  })

  describe('GRANULAR_PERMISSIONS', () => {
    it('has expected module permissions', () => {
      const permissionKeys = Object.keys(GRANULAR_PERMISSIONS)

      expect(permissionKeys.some(p => p.startsWith('assessments.'))).toBe(true)
      expect(permissionKeys.some(p => p.startsWith('financials.'))).toBe(true)
      expect(permissionKeys.some(p => p.startsWith('personal.'))).toBe(true)
      expect(permissionKeys.some(p => p.startsWith('dataroom.'))).toBe(true)
      expect(permissionKeys.some(p => p.startsWith('playbook.'))).toBe(true)
      expect(permissionKeys.some(p => p.startsWith('team.'))).toBe(true)
    })

    it('all permissions follow module.resource:action format', () => {
      const permissionKeys = Object.keys(GRANULAR_PERMISSIONS) as GranularPermission[]

      for (const key of permissionKeys) {
        expect(key).toMatch(/^[a-z_]+\.[a-z_]+:[a-z_]+$/)
      }
    })

    it('has view and edit permissions for sensitive data', () => {
      expect(GRANULAR_PERMISSIONS['personal.net_worth:view']).toBeDefined()
      expect(GRANULAR_PERMISSIONS['personal.net_worth:edit']).toBeDefined()
      expect(GRANULAR_PERMISSIONS['personal.retirement:view']).toBeDefined()
      expect(GRANULAR_PERMISSIONS['personal.retirement:edit']).toBeDefined()
    })

    it('has all data room category permissions', () => {
      expect(GRANULAR_PERMISSIONS['dataroom.financial:view']).toBeDefined()
      expect(GRANULAR_PERMISSIONS['dataroom.financial:upload']).toBeDefined()
      expect(GRANULAR_PERMISSIONS['dataroom.legal:view']).toBeDefined()
      expect(GRANULAR_PERMISSIONS['dataroom.legal:upload']).toBeDefined()
    })
  })

  describe('parsePermission', () => {
    it('parses permission correctly', () => {
      const parsed = parsePermission('financials.statements:view')

      expect(parsed.module).toBe('financials')
      expect(parsed.resource).toBe('statements')
      expect(parsed.action).toBe('view')
    })

    it('parses complex resource names', () => {
      const parsed = parsePermission('personal.net_worth:edit')

      expect(parsed.module).toBe('personal')
      expect(parsed.resource).toBe('net_worth')
      expect(parsed.action).toBe('edit')
    })
  })

  describe('getModulePermissions', () => {
    it('returns all permissions for a module', () => {
      const financials = getModulePermissions('financials')

      expect(financials.length).toBeGreaterThan(0)
      expect(financials.every(p => p.startsWith('financials.'))).toBe(true)
    })

    it('returns empty array for non-existent module', () => {
      const permissions = getModulePermissions('nonexistent')

      expect(permissions).toEqual([])
    })
  })

  describe('isSensitivePermission', () => {
    it('returns true for personal data permissions', () => {
      expect(isSensitivePermission('personal.retirement:view')).toBe(true)
      expect(isSensitivePermission('personal.net_worth:edit')).toBe(true)
    })

    it('returns false for non-personal permissions', () => {
      expect(isSensitivePermission('financials.statements:view')).toBe(false)
      expect(isSensitivePermission('dataroom.legal:upload')).toBe(false)
    })
  })

  describe('ROLE_TEMPLATES', () => {
    it('has all expected role templates', () => {
      expect(ROLE_TEMPLATES.owner).toBeDefined()
      expect(ROLE_TEMPLATES.cpa).toBeDefined()
      expect(ROLE_TEMPLATES.attorney).toBeDefined()
      expect(ROLE_TEMPLATES.wealth_advisor).toBeDefined()
      expect(ROLE_TEMPLATES.ma_advisor).toBeDefined()
      expect(ROLE_TEMPLATES.consultant).toBeDefined()
      expect(ROLE_TEMPLATES.internal_team).toBeDefined()
      expect(ROLE_TEMPLATES.view_only).toBeDefined()
    })

    describe('owner template', () => {
      it('has full access to all permissions', () => {
        const template = ROLE_TEMPLATES.owner
        const permissions = Object.keys(template.defaultPermissions)

        expect(permissions.length).toBe(Object.keys(GRANULAR_PERMISSIONS).length)

        const allGranted = Object.values(template.defaultPermissions).every(v => v === true)
        expect(allGranted).toBe(true)
      })

      it('is marked as internal', () => {
        expect(ROLE_TEMPLATES.owner.isExternal).toBe(false)
      })
    })

    describe('cpa template', () => {
      it('has full access to financials', () => {
        const template = ROLE_TEMPLATES.cpa

        expect(template.defaultPermissions['financials.statements:view']).toBe(true)
        expect(template.defaultPermissions['financials.statements:edit']).toBe(true)
        expect(template.defaultPermissions['financials.adjustments:edit']).toBe(true)
        expect(template.defaultPermissions['financials.dcf:edit']).toBe(true)
      })

      it('has no access to personal financials', () => {
        const template = ROLE_TEMPLATES.cpa

        expect(template.defaultPermissions['personal.retirement:view']).toBe(false)
        expect(template.defaultPermissions['personal.net_worth:view']).toBe(false)
      })

      it('has view-only access to valuation', () => {
        const template = ROLE_TEMPLATES.cpa

        expect(template.defaultPermissions['valuation.summary:view']).toBe(true)
        expect(template.defaultPermissions['valuation.detailed:view']).toBe(true)
      })

      it('is marked as external', () => {
        expect(ROLE_TEMPLATES.cpa.isExternal).toBe(true)
      })
    })

    describe('attorney template', () => {
      it('has access to legal documents', () => {
        const template = ROLE_TEMPLATES.attorney

        expect(template.defaultPermissions['dataroom.legal:view']).toBe(true)
        expect(template.defaultPermissions['dataroom.legal:upload']).toBe(true)
      })

      it('has no access to financials', () => {
        const template = ROLE_TEMPLATES.attorney

        expect(template.defaultPermissions['financials.statements:view']).toBe(false)
        expect(template.defaultPermissions['financials.dcf:view']).toBe(false)
      })

      it('has access to operations and IP documents', () => {
        const template = ROLE_TEMPLATES.attorney

        expect(template.defaultPermissions['dataroom.operations:view']).toBe(true)
        expect(template.defaultPermissions['dataroom.ip:view']).toBe(true)
        expect(template.defaultPermissions['dataroom.ip:upload']).toBe(true)
      })
    })

    describe('wealth_advisor template', () => {
      it('has full access to personal financials', () => {
        const template = ROLE_TEMPLATES.wealth_advisor

        expect(template.defaultPermissions['personal.retirement:view']).toBe(true)
        expect(template.defaultPermissions['personal.retirement:edit']).toBe(true)
        expect(template.defaultPermissions['personal.net_worth:view']).toBe(true)
        expect(template.defaultPermissions['personal.net_worth:edit']).toBe(true)
      })

      it('has view-only access to business financials', () => {
        const template = ROLE_TEMPLATES.wealth_advisor

        expect(template.defaultPermissions['financials.statements:view']).toBe(true)
        expect(template.defaultPermissions['financials.statements:edit']).toBe(false)
      })

      it('can view personal assessments', () => {
        const template = ROLE_TEMPLATES.wealth_advisor

        expect(template.defaultPermissions['assessments.personal:view']).toBe(true)
        expect(template.defaultPermissions['assessments.personal:edit']).toBe(true)
      })
    })

    describe('ma_advisor template', () => {
      it('has full business access', () => {
        const template = ROLE_TEMPLATES.ma_advisor

        expect(template.defaultPermissions['financials.statements:edit']).toBe(true)
        expect(template.defaultPermissions['financials.dcf:edit']).toBe(true)
        expect(template.defaultPermissions['assessments.company:edit']).toBe(true)
      })

      it('has no access to personal financials', () => {
        const template = ROLE_TEMPLATES.ma_advisor

        expect(template.defaultPermissions['personal.retirement:view']).toBe(false)
        expect(template.defaultPermissions['personal.net_worth:view']).toBe(false)
        expect(template.defaultPermissions['assessments.personal:view']).toBe(false)
      })

      it('has full data room access', () => {
        const template = ROLE_TEMPLATES.ma_advisor

        expect(template.defaultPermissions['dataroom.financial:upload']).toBe(true)
        expect(template.defaultPermissions['dataroom.legal:upload']).toBe(true)
        expect(template.defaultPermissions['dataroom.operations:upload']).toBe(true)
      })

      it('has full playbook access', () => {
        const template = ROLE_TEMPLATES.ma_advisor

        expect(template.defaultPermissions['playbook.tasks:create']).toBe(true)
        expect(template.defaultPermissions['playbook.tasks:assign']).toBe(true)
        expect(template.defaultPermissions['playbook.tasks:complete']).toBe(true)
      })
    })

    describe('view_only template', () => {
      it('has only view permissions', () => {
        const template = ROLE_TEMPLATES.view_only
        const permissions = Object.entries(template.defaultPermissions)

        const allViewOrFalse = permissions.every(([key, value]) =>
          !value || key.includes(':view')
        )

        expect(allViewOrFalse).toBe(true)
      })

      it('cannot edit anything', () => {
        const template = ROLE_TEMPLATES.view_only
        const permissions = Object.entries(template.defaultPermissions)

        const hasNoEditAccess = permissions.every(([key, value]) =>
          !key.includes(':edit') || value === false
        )

        expect(hasNoEditAccess).toBe(true)
      })
    })
  })

  describe('Permission Matrix Consistency', () => {
    it('every permission in templates exists in GRANULAR_PERMISSIONS', () => {
      const templates = Object.values(ROLE_TEMPLATES)
      const validPermissions = Object.keys(GRANULAR_PERMISSIONS)

      for (const template of templates) {
        const templatePermissions = Object.keys(template.defaultPermissions)

        for (const permission of templatePermissions) {
          expect(validPermissions).toContain(permission)
        }
      }
    })

    it('all templates have complete permission sets', () => {
      const allPermissions = Object.keys(GRANULAR_PERMISSIONS)
      const templates = Object.values(ROLE_TEMPLATES)

      for (const template of templates) {
        const templatePermissions = Object.keys(template.defaultPermissions)

        expect(templatePermissions.length).toBe(allPermissions.length)
      }
    })

    it('external advisors cannot manage team', () => {
      const externalTemplates = Object.values(ROLE_TEMPLATES).filter(t => t.isExternal)

      for (const template of externalTemplates) {
        expect(template.defaultPermissions['team.members:manage']).toBe(false)
        expect(template.defaultPermissions['team.members:remove']).toBe(false)
      }
    })

    it('only owner and ma_advisor can assign tasks', () => {
      const canAssign = ['owner', 'ma_advisor']
      const templates = Object.entries(ROLE_TEMPLATES)

      for (const [slug, template] of templates) {
        const shouldAllow = canAssign.includes(slug)
        expect(template.defaultPermissions['playbook.tasks:assign']).toBe(shouldAllow)
      }
    })
  })
})
