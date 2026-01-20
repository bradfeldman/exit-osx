'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useCompany } from './CompanyContext'

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEADER' | 'MEMBER' | 'VIEWER'

interface OrganizationMembership {
  role: UserRole
  organizationId: string
  organization: {
    id: string
    name: string
  }
}

interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  isSuperAdmin: boolean
  organizations: OrganizationMembership[]
}

interface UserRoleContextType {
  user: CurrentUser | null
  isLoading: boolean
  isSuperAdmin: boolean
  currentOrgRole: UserRole | null
  isOrgAdmin: boolean
  refreshUser: () => Promise<void>
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined)

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { selectedCompanyId, companies } = useCompany()

  const loadUser = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  // Find the organization for the currently selected company
  const getCurrentOrgRole = (): UserRole | null => {
    if (!user || !selectedCompanyId) return null

    // Find the company to get its organizationId
    const selectedCompany = companies.find(c => c.id === selectedCompanyId)
    if (!selectedCompany) return null

    // This requires the company to have organizationId - we may need to fetch it
    // For now, assume the first organization (most users have one org)
    const membership = user.organizations[0]
    return membership?.role || null
  }

  const currentOrgRole = getCurrentOrgRole()
  const isSuperAdmin = user?.isSuperAdmin || false
  const isOrgAdmin = currentOrgRole === 'ADMIN' || currentOrgRole === 'SUPER_ADMIN' || isSuperAdmin

  return (
    <UserRoleContext.Provider
      value={{
        user,
        isLoading,
        isSuperAdmin,
        currentOrgRole,
        isOrgAdmin,
        refreshUser: loadUser,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  const context = useContext(UserRoleContext)
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider')
  }
  return context
}
