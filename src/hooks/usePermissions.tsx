'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GranularPermission, PERMISSION_CATEGORIES } from '@/lib/auth/permissions'

interface Permission {
  permission: GranularPermission
  description: string
  granted: boolean
}

interface PermissionData {
  userId: string
  organizationId: string
  companyId?: string
  roleTemplate?: string
  hasCustomOverrides: boolean
  isExternalAdvisor: boolean
  permissions: Permission[]
  permissionsByModule: Record<string, Permission[]>
}

interface UsePermissionsOptions {
  companyId?: string
  enabled?: boolean
}

interface UsePermissionsReturn {
  // Loading state
  isLoading: boolean
  error: Error | null

  // Data
  permissions: PermissionData | null
  roleTemplate: string | null
  isExternalAdvisor: boolean

  // Permission checking helpers
  hasPermission: (permission: GranularPermission) => boolean
  hasAnyPermission: (permissions: GranularPermission[]) => boolean
  hasAllPermissions: (permissions: GranularPermission[]) => boolean

  // Module-level helpers
  canViewModule: (module: keyof typeof PERMISSION_CATEGORIES) => boolean
  canEditModule: (module: keyof typeof PERMISSION_CATEGORIES) => boolean

  // Refresh
  refetch: () => Promise<void>
}

/**
 * Hook for client-side permission checking
 *
 * Usage:
 * ```tsx
 * const { hasPermission, isLoading } = usePermissions()
 *
 * if (isLoading) return <Spinner />
 *
 * if (hasPermission('financials.statements:edit')) {
 *   // Show edit button
 * }
 * ```
 */
export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsReturn {
  const { companyId, enabled = true } = options

  const [permissions, setPermissions] = useState<PermissionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const url = companyId
        ? `/api/permissions?companyId=${companyId}`
        : '/api/permissions'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch permissions')
      }

      const data = await response.json()
      setPermissions(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [companyId, enabled])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Create a Map for O(1) permission lookups
  const permissionMap = useMemo(() => {
    if (!permissions?.permissions) return new Map<GranularPermission, boolean>()

    return new Map(
      permissions.permissions.map((p) => [p.permission, p.granted])
    )
  }, [permissions])

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: GranularPermission): boolean => {
      return permissionMap.get(permission) ?? false
    },
    [permissionMap]
  )

  // Check if user has ANY of the given permissions
  const hasAnyPermission = useCallback(
    (perms: GranularPermission[]): boolean => {
      return perms.some((p) => permissionMap.get(p) ?? false)
    },
    [permissionMap]
  )

  // Check if user has ALL of the given permissions
  const hasAllPermissions = useCallback(
    (perms: GranularPermission[]): boolean => {
      return perms.every((p) => permissionMap.get(p) ?? false)
    },
    [permissionMap]
  )

  // Check if user can view anything in a module
  const canViewModule = useCallback(
    (module: keyof typeof PERMISSION_CATEGORIES): boolean => {
      const category = PERMISSION_CATEGORIES[module]
      return category.permissions.some((p) => {
        if (p.endsWith(':view')) {
          return permissionMap.get(p) ?? false
        }
        return false
      })
    },
    [permissionMap]
  )

  // Check if user can edit anything in a module
  const canEditModule = useCallback(
    (module: keyof typeof PERMISSION_CATEGORIES): boolean => {
      const category = PERMISSION_CATEGORIES[module]
      return category.permissions.some((p) => {
        if (
          p.endsWith(':edit') ||
          p.endsWith(':upload') ||
          p.endsWith(':create') ||
          p.endsWith(':complete')
        ) {
          return permissionMap.get(p) ?? false
        }
        return false
      })
    },
    [permissionMap]
  )

  return {
    isLoading,
    error,
    permissions,
    roleTemplate: permissions?.roleTemplate ?? null,
    isExternalAdvisor: permissions?.isExternalAdvisor ?? false,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewModule,
    canEditModule,
    refetch: fetchPermissions,
  }
}

/**
 * Hook for checking if user has access to any personal financial data
 * This is useful for showing/hiding the personal financials module
 */
export function usePersonalFinancialsAccess(): {
  canView: boolean
  canEdit: boolean
  isLoading: boolean
} {
  const { hasPermission, isLoading } = usePermissions()

  return {
    canView:
      hasPermission('personal.retirement:view') ||
      hasPermission('personal.net_worth:view'),
    canEdit:
      hasPermission('personal.retirement:edit') ||
      hasPermission('personal.net_worth:edit'),
    isLoading,
  }
}

/**
 * Hook for checking team management permissions
 */
export function useTeamManagementAccess(): {
  canView: boolean
  canInvite: boolean
  canManage: boolean
  canRemove: boolean
  isLoading: boolean
} {
  const { hasPermission, isLoading } = usePermissions()

  return {
    canView: hasPermission('team.members:view'),
    canInvite: hasPermission('team.members:invite'),
    canManage: hasPermission('team.members:manage'),
    canRemove: hasPermission('team.members:remove'),
    isLoading,
  }
}

/**
 * Component wrapper that only renders children if user has permission
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: GranularPermission
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { hasPermission, isLoading } = usePermissions()

  if (isLoading) return null
  if (!hasPermission(permission)) return fallback

  return <>{children}</>
}

/**
 * Component wrapper that only renders children if user has any of the permissions
 */
export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
}: {
  permissions: GranularPermission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { hasAnyPermission, isLoading } = usePermissions()

  if (isLoading) return null
  if (!hasAnyPermission(permissions)) return fallback

  return <>{children}</>
}
