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
  type Permission,
  type GranularPermission,
} from '@/lib/auth/permissions'
import { UserRole } from '@prisma/client'

describe('Permissions Module', () => {
  describe('PERMISSIONS (Legacy RBAC)', () => {
    it('has all core permission categories defined', () => {
      expect(PERMISSIONS.COMPANY_CREATE).toBeDefined()
      expect(PERMISSIONS.COMPANY_UPDATE).toBeDefined()
      expect(PERMISSIONS.COMPANY_DELETE).toBeDefined()
      expect(PERMISSIONS.COMPANY_VIEW).toBeDefined()
      expect(PERMISSIONS.ASSESSMENT_CREATE).toBeDefined()
      expect(PERMISSIONS.TASK_UPDATE).toBeDefined()
      expect(PERMISSIONS.ORG_MANAGE_MEMBERS).toBeDefined()
    })

    it('SUPER_ADMIN has all permissions', () => {
      const permissions = Object.keys(PERMISSIONS) as Permission[]

      for (const permission of permissions) {
        expect(hasPermission('SUPER_ADMIN', permission)).toBe(true)
      }
    })

    it('VIEWER has only view permissions', () => {
      expect(hasPermission('VIEWER', 'COMPANY_VIEW')).toBe(true)
      expect(hasPermission('VIEWER', 'ASSESSMENT_VIEW')).toBe(true)
      expect(hasPermission('VIEWER', 'TASK_VIEW')).toBe(true)

      expect(hasPermission('VIEWER', 'COMPANY_CREATE')).toBe(false)
      expect(hasPermission('VIEWER', 'COMPANY_UPDATE')).toBe(false)
      expect(hasPermission('VIEWER', 'TASK_UPDATE')).toBe(false)
    })

    it('MEMBER can update tasks but not assign them', () => {
      expect(hasPermission('MEMBER', 'TASK_UPDATE')).toBe(true)
      expect(hasPermission('MEMBER', 'TASK_ASSIGN')).toBe(false)
    })

    it('TEAM_LEADER can assign tasks', () => {
      expect(hasPermission('TEAM_LEADER', 'TASK_ASSIGN')).toBe(true)
      expect(hasPermission('TEAM_LEADER', 'TASK_UPDATE')).toBe(true)
    })

    it('only SUPER_ADMIN can delete organization', () => {
      expect(hasPermission('SUPER_ADMIN', 'ORG_DELETE')).toBe(true)
      expect(hasPermission('ADMIN', 'ORG_DELETE')).toBe(false)
      expect(hasPermission('TEAM_LEADER', 'ORG_DELETE')).toBe(false)
    })

    it('only SUPER_ADMIN and ADMIN can manage members', () => {
      expect(hasPermission('SUPER_ADMIN', 'ORG_MANAGE_MEMBERS')).toBe(true)
      expect(hasPermission('ADMIN', 'ORG_MANAGE_MEMBERS')).toBe(true)
      expect(hasPermission('TEAM_LEADER', 'ORG_MANAGE_MEMBERS')).toBe(false)
    })
  })

  describe('getPermissionsForRole', () => {
    it('returns all permissions for SUPER_ADMIN', () => {
      const permissions = getPermissionsForRole('SUPER_ADMIN')
      const allPermissions = Object.keys(PERMISSIONS)

      expect(permissions.length).toBe(allPermissions.length)
    })

    it('returns empty array for invalid role', () => {
      const permissions = getPermissionsForRole('INVALID' as UserRole)

      expect(permissions).toEqual([])
    })

    it('returns subset for VIEWER', () => {
      const permissions = getPermissionsForRole('VIEWER')

      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions.length).toBeLessThan(Object.keys(PERMISSIONS).length)
      expect(permissions.every(p => p.includes('VIEW'))).toBe(true)
    })
  })

  describe('ROLE_HIERARCHY', () => {
    it('has all user roles defined', () => {
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBeDefined()
      expect(ROLE_HIERARCHY.ADMIN).toBeDefined()
      expect(ROLE_HIERARCHY.TEAM_LEADER).toBeDefined()
      expect(ROLE_HIERARCHY.MEMBER).toBeDefined()
      expect(ROLE_HIERARCHY.VIEWER).toBeDefined()
    })

    it('has correct hierarchy order', () => {
      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBeGreaterThan(ROLE_HIERARCHY.ADMIN)
      expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.TEAM_LEADER)
      expect(ROLE_HIERARCHY.TEAM_LEADER).toBeGreaterThan(ROLE_HIERARCHY.MEMBER)
      expect(ROLE_HIERARCHY.MEMBER).toBeGreaterThan(ROLE_HIERARCHY.VIEWER)
    })

    it('SUPER_ADMIN is highest level', () => {
      const levels = Object.values(ROLE_HIERARCHY)
      const maxLevel = Math.max(...levels)

      expect(ROLE_HIERARCHY.SUPER_ADMIN).toBe(maxLevel)
    })

    it('VIEWER is lowest level', () => {
      const levels = Object.values(ROLE_HIERARCHY)
      const minLevel = Math.min(...levels)

      expect(ROLE_HIERARCHY.VIEWER).toBe(minLevel)
    })
  })

  describe('isRoleAtLeast', () => {
    it('SUPER_ADMIN is at least any role', () => {
      expect(isRoleAtLeast('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true)
      expect(isRoleAtLeast('SUPER_ADMIN', 'ADMIN')).toBe(true)
      expect(isRoleAtLeast('SUPER_ADMIN', 'MEMBER')).toBe(true)
      expect(isRoleAtLeast('SUPER_ADMIN', 'VIEWER')).toBe(true)
    })

    it('VIEWER is not at least higher roles', () => {
      expect(isRoleAtLeast('VIEWER', 'SUPER_ADMIN')).toBe(false)
      expect(isRoleAtLeast('VIEWER', 'ADMIN')).toBe(false)
      expect(isRoleAtLeast('VIEWER', 'MEMBER')).toBe(false)
    })

    it('role is at least itself', () => {
      expect(isRoleAtLeast('ADMIN', 'ADMIN')).toBe(true)
      expect(isRoleAtLeast('MEMBER', 'MEMBER')).toBe(true)
    })

    it('TEAM_LEADER is at least MEMBER but not ADMIN', () => {
      expect(isRoleAtLeast('TEAM_LEADER', 'MEMBER')).toBe(true)
      expect(isRoleAtLeast('TEAM_LEADER', 'VIEWER')).toBe(true)
      expect(isRoleAtLeast('TEAM_LEADER', 'ADMIN')).toBe(false)
    })
  })

  describe('getRoleDisplayName and getRoleDescription', () => {
    it('returns display names for all roles', () => {
      expect(getRoleDisplayName('SUPER_ADMIN')).toBe('Super Admin')
      expect(getRoleDisplayName('ADMIN')).toBe('Admin')
      expect(getRoleDisplayName('TEAM_LEADER')).toBe('Team Leader')
      expect(getRoleDisplayName('MEMBER')).toBe('Member')
      expect(getRoleDisplayName('VIEWER')).toBe('Viewer')
    })

    it('returns descriptions for all roles', () => {
      const description = getRoleDescription('SUPER_ADMIN')
      expect(description).toContain('Full access')

      const viewerDesc = getRoleDescription('VIEWER')
      expect(viewerDesc).toContain('Read-only')
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
      })
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
