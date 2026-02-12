'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/ui/user-avatar'
import { CompanyRole } from '@prisma/client'
import { UserPlus, Shield, Eye, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface TeamMember {
  id: string
  userId: string
  role: CompanyRole
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
  assignedBy?: {
    id: string
    name: string | null
    email: string
  } | null
  createdAt: string
}

interface WorkspaceMember {
  id: string
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

const roleIcons: Record<CompanyRole, React.ElementType> = {
  LEAD: Shield,
  CONTRIBUTOR: Edit3,
  VIEWER: Eye,
}

const roleLabels: Record<CompanyRole, string> = {
  LEAD: 'Lead',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
}

const roleDescriptions: Record<CompanyRole, string> = {
  LEAD: 'Full control of this company and can manage team',
  CONTRIBUTOR: 'Can edit company data and complete tasks',
  VIEWER: 'Read-only access to this company',
}

const roleColors: Record<CompanyRole, string> = {
  LEAD: 'bg-purple-100 text-purple-800 border-purple-200',
  CONTRIBUTOR: 'bg-blue-100 text-blue-800 border-blue-200',
  VIEWER: 'bg-gray-100 text-gray-800 border-gray-200',
}

interface CompanyTeamProps {
  companyId: string
}

export function CompanyTeam({ companyId }: CompanyTeamProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<CompanyRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)

  // Workspace members (for adding to company)
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<CompanyRole>('CONTRIBUTOR')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const loadTeam = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/team`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
        setCurrentUserRole(data.currentUserRole)
      }
    } catch (error) {
      console.error('Failed to load team:', error)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const loadWorkspaceMembers = useCallback(async () => {
    try {
      // Load workspace members to show in add member dialog
      const response = await fetch('/api/workspaces')
      if (response.ok) {
        const data = await response.json()
        if (data.workspaces.length > 0) {
          const workspace = data.workspaces[0]
          setWorkspaceMembers(workspace.users.map((u: any) => ({
            id: u.id,
            user: u.user,
          })))
        }
      }
    } catch (error) {
      console.error('Failed to load workspace members:', error)
    }
  }, [])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  async function handleRoleChange(memberId: string, newRole: CompanyRole) {
    try {
      const response = await fetch(`/api/companies/${companyId}/team`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })

      if (response.ok) {
        loadTeam()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('Failed to update role')
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member from the company team?')) return

    try {
      const response = await fetch(
        `/api/companies/${companyId}/team?memberId=${memberId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadTeam()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member')
    }
  }

  function openAddMemberDialog() {
    loadWorkspaceMembers()
    setAddMemberDialogOpen(true)
    setAddError(null)
    setSelectedUserId('')
    setSelectedRole('CONTRIBUTOR')
  }

  async function handleAddMember() {
    if (!selectedUserId) return

    setAdding(true)
    setAddError(null)

    try {
      const response = await fetch(`/api/companies/${companyId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      })

      if (response.ok) {
        setAddMemberDialogOpen(false)
        loadTeam()
      } else {
        const data = await response.json()
        setAddError(data.error || 'Failed to add member')
      }
    } catch (error) {
      setAddError('Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const canManageTeam = currentUserRole === 'LEAD'

  // Filter workspace members to exclude those already on the team
  const availableMembers = workspaceMembers.filter(
    wm => !members.some(m => m.userId === wm.user.id)
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Company Team</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} with access to this company
          </CardDescription>
        </div>
        {canManageTeam && (
          <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddMemberDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a workspace member to this company team
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Member Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Member</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          All workspace members are already on this team
                        </div>
                      ) : (
                        availableMembers.map(member => (
                          <SelectItem key={member.user.id} value={member.user.id}>
                            <div className="flex items-center gap-2">
                              <UserAvatar
                                email={member.user.email}
                                name={member.user.name || undefined}
                                size="xs"
                              />
                              <div className="flex flex-col">
                                <span>{member.user.name || 'No name'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {member.user.email}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as CompanyRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['LEAD', 'CONTRIBUTOR', 'VIEWER'] as CompanyRole[]).map(role => {
                        const Icon = roleIcons[role]
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span>{roleLabels[role]}</span>
                                <span className="text-xs text-muted-foreground">
                                  {roleDescriptions[role]}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {addError && (
                  <p className="text-sm text-destructive">{addError}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddMemberDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={adding || !selectedUserId || availableMembers.length === 0}
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team members yet. {canManageTeam && 'Add members to collaborate on this company.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                {canManageTeam && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role]
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          email={member.user.email}
                          name={member.user.name || undefined}
                          size="sm"
                        />
                        <div>
                          <div className="font-medium">
                            {member.user.name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageTeam ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.id, value as CompanyRole)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['LEAD', 'CONTRIBUTOR', 'VIEWER'] as CompanyRole[]).map(role => {
                              const Icon = roleIcons[role]
                              return (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {roleLabels[role]}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border',
                          roleColors[member.role]
                        )}>
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[member.role]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManageTeam && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Role descriptions */}
        <div className="mt-6 pt-6 border-t space-y-3">
          <h4 className="text-sm font-medium">Company Roles</h4>
          {(['LEAD', 'CONTRIBUTOR', 'VIEWER'] as CompanyRole[]).map(role => {
            const Icon = roleIcons[role]
            return (
              <div key={role} className="flex items-start gap-3 text-sm">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <span className="font-medium">{roleLabels[role]}:</span>{' '}
                  <span className="text-muted-foreground">{roleDescriptions[role]}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
