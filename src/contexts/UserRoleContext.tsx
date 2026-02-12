'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useCompany } from './CompanyContext'

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'BILLING' | 'MEMBER'

interface WorkspaceMembership {
  workspaceRole: WorkspaceRole
  workspaceId: string
  workspace: {
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
  workspaces: WorkspaceMembership[]
}

interface UserRoleContextType {
  user: CurrentUser | null
  isLoading: boolean
  isSuperAdmin: boolean
  currentWorkspaceRole: WorkspaceRole | null
  isWorkspaceAdmin: boolean
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

  // Find the workspace for the currently selected company
  const getCurrentWorkspaceRole = (): WorkspaceRole | null => {
    if (!user || !selectedCompanyId) return null

    // Find the company to get its workspaceId
    const selectedCompany = companies.find(c => c.id === selectedCompanyId)
    if (!selectedCompany) return null

    // This requires the company to have workspaceId - we may need to fetch it
    // For now, assume the first workspace (most users have one workspace)
    const membership = user.workspaces[0]
    return membership?.workspaceRole || null
  }

  const currentWorkspaceRole = getCurrentWorkspaceRole()
  const isSuperAdmin = user?.isSuperAdmin || false
  const isWorkspaceAdmin = currentWorkspaceRole === 'OWNER' || currentWorkspaceRole === 'ADMIN' || isSuperAdmin

  return (
    <UserRoleContext.Provider
      value={{
        user,
        isLoading,
        isSuperAdmin,
        currentWorkspaceRole,
        isWorkspaceAdmin,
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
