'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { UserRole, FunctionalCategory, WorkspaceRole } from '@prisma/client'
import {
  Crown,
  Briefcase,
  UserCheck,
  Copy,
  Check,
  Eye,
  Pencil,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface Member {
  id: string
  role: UserRole // Legacy - still used by invites
  workspaceRole: WorkspaceRole // New role system
  functionalCategories: FunctionalCategory[]
  joinedAt: string
  isExternalAdvisor: boolean
  roleTemplate?: {
    id: string
    slug: string
    name: string
    icon: string
  } | null
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
}

interface Invite {
  id: string
  token: string
  email: string
  role: UserRole
  functionalCategories: FunctionalCategory[]
  createdAt: string
  expiresAt: string
  isExternalAdvisor: boolean
  roleTemplate?: {
    id: string
    slug: string
    name: string
    icon: string
  } | null
}

interface Workspace {
  id: string
  name: string
  currentUserRole: UserRole // Legacy
  currentUserWorkspaceRole: WorkspaceRole // New
  currentUserId: string
  members: Member[]
  invites: Invite[]
}

interface RoleTemplate {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  isBuiltIn: boolean
  defaultPermissions: Record<string, boolean>
  summary: {
    fullAccess: string[]
    viewOnly: string[]
    noAccess: string[]
  }
}

// Simplified types for UI
type Affiliation = 'owner' | 'employee' | 'advisor'
type PermissionLevel = 'edit' | 'view' | 'hide'

// Simplified page permissions - maps to granular permissions behind the scenes
interface PagePermission {
  key: string
  label: string
  viewPermissions: string[]
  editPermissions: string[]
}

const PAGE_PERMISSIONS: PagePermission[] = [
  {
    key: 'scorecard',
    label: 'Exit OSx Scorecard',
    viewPermissions: ['valuation.summary:view', 'valuation.detailed:view'],
    editPermissions: [],
  },
  {
    key: 'baseline',
    label: 'Baseline Assessment',
    viewPermissions: ['assessments.company:view'],
    editPermissions: ['assessments.company:edit'],
  },
  {
    key: 'risk',
    label: 'Risk Assessments',
    viewPermissions: ['assessments.personal:view'],
    editPermissions: ['assessments.personal:edit'],
  },
  {
    key: 'actionplan',
    label: 'Action Plan',
    viewPermissions: ['playbook.tasks:view'],
    editPermissions: ['playbook.tasks:complete', 'playbook.tasks:create', 'playbook.tasks:assign'],
  },
  {
    key: 'financials',
    label: 'Business Financials',
    viewPermissions: ['financials.statements:view', 'financials.adjustments:view'],
    editPermissions: ['financials.statements:edit', 'financials.adjustments:edit'],
  },
  {
    key: 'dcf',
    label: 'DCF Valuation',
    viewPermissions: ['financials.dcf:view'],
    editPermissions: ['financials.dcf:edit'],
  },
  {
    key: 'pfs',
    label: 'Personal Financial Statement',
    viewPermissions: ['personal.net_worth:view'],
    editPermissions: ['personal.net_worth:edit'],
  },
  {
    key: 'retirement',
    label: 'Retirement Calculator',
    viewPermissions: ['personal.retirement:view'],
    editPermissions: ['personal.retirement:edit'],
  },
  {
    key: 'loans',
    label: 'Business Loans',
    viewPermissions: ['financials.statements:view'], // Uses same permission as financials for now
    editPermissions: ['financials.statements:edit'],
  },
  {
    key: 'dataroom',
    label: 'Data Room',
    viewPermissions: [
      'dataroom.financial:view',
      'dataroom.legal:view',
      'dataroom.operations:view',
      'dataroom.customers:view',
      'dataroom.employees:view',
      'dataroom.ip:view',
    ],
    editPermissions: [
      'dataroom.financial:upload',
      'dataroom.legal:upload',
      'dataroom.operations:upload',
      'dataroom.customers:upload',
      'dataroom.employees:upload',
      'dataroom.ip:upload',
    ],
  },
  {
    key: 'dealtracker',
    label: 'Deal Tracker',
    viewPermissions: ['playbook.tasks:view'], // Uses action plan permission for now
    editPermissions: ['playbook.tasks:create'],
  },
  {
    key: 'exitteam',
    label: 'Exit Team',
    viewPermissions: ['team.members:view'],
    editPermissions: ['team.members:invite', 'team.members:manage', 'team.members:remove'],
  },
  {
    key: 'settings',
    label: 'Settings',
    viewPermissions: ['team.members:view'],
    editPermissions: ['team.members:manage'],
  },
]

// Map affiliation to functional categories and external flag
function affiliationToData(affiliation: Affiliation): { categories: FunctionalCategory[]; isExternal: boolean } {
  switch (affiliation) {
    case 'owner':
      return { categories: ['OWNER'], isExternal: false }
    case 'employee':
      return { categories: [], isExternal: false }
    case 'advisor':
      return { categories: ['EXTERNAL'], isExternal: true }
  }
}

// Map member data back to affiliation
function dataToAffiliation(categories: FunctionalCategory[], isExternal: boolean): Affiliation {
  if (categories.includes('OWNER')) return 'owner'
  if (isExternal || categories.includes('EXTERNAL')) return 'advisor'
  return 'employee'
}

// Get default permissions for an affiliation
function getDefaultPermissionsForAffiliation(affiliation: Affiliation): Record<string, PermissionLevel> {
  const defaults: Record<string, PermissionLevel> = {}

  if (affiliation === 'owner') {
    // Owner gets edit on everything
    PAGE_PERMISSIONS.forEach(page => {
      defaults[page.key] = 'edit'
    })
  } else if (affiliation === 'employee') {
    // Employee gets limited view/edit
    PAGE_PERMISSIONS.forEach(page => {
      if (['scorecard', 'baseline', 'actionplan'].includes(page.key)) {
        defaults[page.key] = 'edit'
      } else if (['risk', 'pfs', 'retirement', 'loans'].includes(page.key)) {
        defaults[page.key] = 'hide'
      } else {
        defaults[page.key] = 'view'
      }
    })
  } else {
    // Advisor gets view on business, hide on personal
    PAGE_PERMISSIONS.forEach(page => {
      if (['pfs', 'retirement', 'exitteam', 'settings'].includes(page.key)) {
        defaults[page.key] = 'hide'
      } else {
        defaults[page.key] = 'view'
      }
    })
  }

  return defaults
}

// Convert page permissions to granular permissions
function pagePermissionsToGranular(pagePerms: Record<string, PermissionLevel>): Record<string, boolean> {
  const granular: Record<string, boolean> = {}

  PAGE_PERMISSIONS.forEach(page => {
    const level = pagePerms[page.key] || 'hide'

    // Set view permissions
    page.viewPermissions.forEach(perm => {
      granular[perm] = level === 'view' || level === 'edit'
    })

    // Set edit permissions
    page.editPermissions.forEach(perm => {
      granular[perm] = level === 'edit'
    })
  })

  return granular
}

// Constants for simplified UI
const affiliationLabels: Record<Affiliation, string> = {
  owner: 'Owner',
  employee: 'Employee',
  advisor: 'Advisor',
}

const affiliationIcons: Record<Affiliation, React.ElementType> = {
  owner: Crown,
  employee: Briefcase,
  advisor: UserCheck,
}

const affiliationColors: Record<Affiliation, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  employee: 'bg-blue-100 text-blue-800 border-blue-200',
  advisor: 'bg-purple-100 text-purple-800 border-purple-200',
}

const roleLabels: Record<'ADMIN' | 'MEMBER', string> = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
}

const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  BILLING: 'Billing',
  MEMBER: 'Member',
}

const workspaceRoleDescriptions: Record<WorkspaceRole, string> = {
  OWNER: 'Full control, billing, member management',
  ADMIN: 'Member management, all features',
  BILLING: 'Billing and subscription management',
  MEMBER: 'Standard access to assigned companies',
}

const permissionLevelIcons: Record<PermissionLevel, React.ElementType> = {
  edit: Pencil,
  view: Eye,
  hide: EyeOff,
}

const permissionLevelLabels: Record<PermissionLevel, string> = {
  edit: 'Edit',
  view: 'View',
  hide: 'Hide',
}

export function WorkspaceSettings() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [inviteAffiliation, setInviteAffiliation] = useState<Affiliation>('employee')
  const [invitePagePermissions, setInvitePagePermissions] = useState<Record<string, PermissionLevel>>({})

  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Role templates (for mapping to backend)
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([])

  useEffect(() => {
    loadWorkspace()
    loadRoleTemplates()
  }, [])

  // Update page permissions when affiliation changes
  useEffect(() => {
    setInvitePagePermissions(getDefaultPermissionsForAffiliation(inviteAffiliation))
  }, [inviteAffiliation])

  async function loadWorkspace() {
    try {
      const response = await fetch('/api/workspaces')
      if (response.ok) {
        const data = await response.json()
        if (data.workspaces.length > 0) {
          setWorkspace(data.workspaces[0])
        }
      }
    } catch (error) {
      console.error('Failed to load workspace:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRoleTemplates() {
    try {
      const response = await fetch('/api/role-templates')
      if (response.ok) {
        const data = await response.json()
        setRoleTemplates(data.templates)
      }
    } catch (error) {
      console.error('Failed to load role templates:', error)
    }
  }

  function resetInviteForm() {
    setInviteEmail('')
    setInviteRole('MEMBER')
    setInviteAffiliation('employee')
    setInvitePagePermissions(getDefaultPermissionsForAffiliation('employee'))
    setInviteError(null)
    setInviteUrl(null)
    setInviteCopied(false)
  }

  async function handleInvite() {
    if (!workspace || !inviteEmail) return

    setInviting(true)
    setInviteError(null)
    setInviteUrl(null)

    try {
      const { categories, isExternal } = affiliationToData(inviteAffiliation)

      // Find the appropriate role template based on affiliation
      const templateSlug = inviteAffiliation === 'owner' ? 'owner' :
                          inviteAffiliation === 'advisor' ? 'consultant' : 'internal_team'
      const template = roleTemplates.find(t => t.slug === templateSlug)

      // Convert page permissions to granular permissions
      const granularPermissions = pagePermissionsToGranular(invitePagePermissions)
      const customPermsArray = Object.entries(granularPermissions)
        .map(([permission, granted]) => ({ permission, granted }))

      const response = await fetch(`/api/workspaces/${workspace.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          functionalCategories: categories,
          roleTemplateId: template?.id,
          customPermissions: customPermsArray,
          isExternalAdvisor: isExternal,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invite')
        return
      }

      setInviteUrl(data.invite.inviteUrl)
      loadWorkspace()
    } catch {
      setInviteError('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleAffiliationChange(userId: string, affiliation: Affiliation) {
    if (!workspace) return

    const { categories, isExternal } = affiliationToData(affiliation)

    try {
      // Update functional categories
      await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, functionalCategories: categories }),
      })

      // Update external advisor flag via permissions endpoint
      const member = workspace.members.find(m => m.user.id === userId)
      if (member) {
        await fetch(`/api/workspaces/${workspace.id}/members/${member.id}/permissions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isExternalAdvisor: isExternal }),
        })
      }

      loadWorkspace()
    } catch (error) {
      console.error('Failed to update affiliation:', error)
    }
  }

  async function handleRoleChange(userId: string, newRole: WorkspaceRole) {
    if (!workspace) return

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workspaceRole: newRole }),
      })

      if (response.ok) {
        loadWorkspace()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      alert('Failed to update role')
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!workspace) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/members?userId=${userId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadWorkspace()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!workspace) return

    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/invites?inviteId=${inviteId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadWorkspace()
      }
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  function handleCopyInviteLink(invite: Invite) {
    const baseUrl = window.location.origin
    const inviteUrl = `${baseUrl}/invite/${invite.token}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedInviteId(invite.id)
    setTimeout(() => setCopiedInviteId(null), 2000)
  }

  async function handleLeaveTeam() {
    if (!workspace) return
    if (!confirm('Are you sure you want to leave this team? You will lose access to all shared data.')) return

    try {
      const response = await fetch(
        `/api/workspaces/${workspace.id}/members?userId=${workspace.currentUserId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        // Redirect to dashboard after leaving
        window.location.href = '/dashboard'
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to leave team')
      }
    } catch (error) {
      console.error('Failed to leave team:', error)
      alert('Failed to leave team')
    }
  }

  function openPermissionsDialog(member: Member) {
    setSelectedMember(member)
    setPermissionsDialogOpen(true)
  }

  const canManageMembers = workspace?.currentUserWorkspaceRole === 'ADMIN' || workspace?.currentUserWorkspaceRole === 'OWNER'
  const canInvite = canManageMembers

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (!workspace) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No workspace found
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Members Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Exit Team</CardTitle>
            <CardDescription>
              {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''} in {workspace.name}
            </CardDescription>
          </div>
          {canInvite && (
            <Dialog
              open={inviteDialogOpen}
              onOpenChange={(open) => {
                setInviteDialogOpen(open)
                if (!open) resetInviteForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>Invite Member</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {inviteUrl ? 'Invite Sent!' : 'Invite Team Member'}
                  </DialogTitle>
                  <DialogDescription>
                    {inviteUrl
                      ? 'Share the invite link below'
                      : 'Add a new member to your exit team'
                    }
                  </DialogDescription>
                </DialogHeader>

                {inviteUrl ? (
                  <div className="py-4 space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Share this invite link:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={inviteUrl}
                          className="font-mono text-sm"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            await navigator.clipboard.writeText(inviteUrl)
                            setInviteCopied(true)
                            setTimeout(() => setInviteCopied(false), 2000)
                          }}
                          className="shrink-0"
                        >
                          {inviteCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      An email has also been sent to {inviteEmail}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 py-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value) => setInviteRole(value as 'ADMIN' | 'MEMBER')}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Admins can manage team members and settings
                      </p>
                    </div>

                    {/* Affiliation */}
                    <div className="space-y-2">
                      <Label>Affiliation</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['owner', 'employee', 'advisor'] as Affiliation[]).map((aff) => {
                          const Icon = affiliationIcons[aff]
                          const isSelected = inviteAffiliation === aff
                          return (
                            <button
                              key={aff}
                              type="button"
                              onClick={() => setInviteAffiliation(aff)}
                              className={cn(
                                'p-3 border rounded-lg text-center transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted'
                              )}
                            >
                              <Icon className="h-5 w-5 mx-auto mb-1" />
                              <div className="text-sm font-medium">{affiliationLabels[aff]}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Page Permissions */}
                    <div className="space-y-3">
                      <Label>Permissions</Label>
                      <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                        {PAGE_PERMISSIONS.map((page) => {
                          const currentLevel = invitePagePermissions[page.key] || 'hide'
                          return (
                            <div key={page.key} className="flex items-center justify-between p-3">
                              <span className="text-sm">{page.label}</span>
                              <div className="flex gap-1">
                                {(['edit', 'view', 'hide'] as PermissionLevel[]).map((level) => {
                                  const Icon = permissionLevelIcons[level]
                                  const isSelected = currentLevel === level
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => {
                                        setInvitePagePermissions({
                                          ...invitePagePermissions,
                                          [page.key]: level,
                                        })
                                      }}
                                      className={cn(
                                        'p-2 rounded transition-colors',
                                        isSelected
                                          ? level === 'edit'
                                            ? 'bg-green-100 text-green-700'
                                            : level === 'view'
                                              ? 'bg-blue-100 text-blue-700'
                                              : 'bg-gray-100 text-gray-700'
                                          : 'hover:bg-muted text-muted-foreground'
                                      )}
                                      title={permissionLevelLabels[level]}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Pencil className="h-3 w-3" /> Edit
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </span>
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-3 w-3" /> Hide
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}

                <DialogFooter>
                  {inviteUrl ? (
                    <Button onClick={() => setInviteDialogOpen(false)}>
                      Close
                    </Button>
                  ) : (
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                      {inviting ? 'Sending...' : 'Send Invite'}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Affiliation</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.members.map((member) => {
                const affiliation = dataToAffiliation(member.functionalCategories, member.isExternalAdvisor)
                const AffiliationIcon = affiliationIcons[affiliation]
                const isOwner = member.workspaceRole === 'OWNER'

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
                      {canManageMembers && !isOwner ? (
                        <Select
                          value={member.workspaceRole}
                          onValueChange={(value) => handleRoleChange(member.user.id, value as WorkspaceRole)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">
                              <div className="flex flex-col">
                                <span>Admin</span>
                                <span className="text-xs text-muted-foreground">
                                  {workspaceRoleDescriptions.ADMIN}
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="BILLING">
                              <div className="flex flex-col">
                                <span>Billing</span>
                                <span className="text-xs text-muted-foreground">
                                  {workspaceRoleDescriptions.BILLING}
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="MEMBER">
                              <div className="flex flex-col">
                                <span>Member</span>
                                <span className="text-xs text-muted-foreground">
                                  {workspaceRoleDescriptions.MEMBER}
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isOwner || member.workspaceRole === 'ADMIN' ? 'default' : 'secondary'}>
                          {workspaceRoleLabels[member.workspaceRole]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManageMembers && member.role !== 'SUPER_ADMIN' ? (
                        <Select
                          value={affiliation}
                          onValueChange={(value) => handleAffiliationChange(member.user.id, value as Affiliation)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Owner
                              </div>
                            </SelectItem>
                            <SelectItem value="employee">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Employee
                              </div>
                            </SelectItem>
                            <SelectItem value="advisor">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                Advisor
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border',
                          affiliationColors[affiliation]
                        )}>
                          <AffiliationIcon className="h-3 w-3" />
                          {affiliationLabels[affiliation]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManageMembers && member.role !== 'SUPER_ADMIN' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionsDialog(member)}
                        >
                          Configure
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {member.role === 'SUPER_ADMIN' || member.role === 'ADMIN' ? 'Full Access' : 'Default'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {member.user.id === workspace?.currentUserId ? (
                        // Current user can leave (unless they're the only admin)
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={handleLeaveTeam}
                        >
                          Leave
                        </Button>
                      ) : (
                        // Admins can remove other members
                        canManageMembers && member.role !== 'SUPER_ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.user.id)}
                          >
                            Remove
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canInvite && workspace.invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              {workspace.invites.length} pending invite{workspace.invites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Affiliation</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.invites.map((invite) => {
                  const affiliation = dataToAffiliation(invite.functionalCategories, invite.isExternalAdvisor)
                  const AffiliationIcon = affiliationIcons[affiliation]
                  const displayRole = invite.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'

                  return (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={invite.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {roleLabels[displayRole]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border',
                          affiliationColors[affiliation]
                        )}>
                          <AffiliationIcon className="h-3 w-3" />
                          {affiliationLabels[affiliation]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyInviteLink(invite)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedInviteId === invite.id ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy Link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissions for {selectedMember?.user.name || selectedMember?.user.email}
            </DialogTitle>
            <DialogDescription>
              Configure page access for this team member
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <MemberPermissionsEditor
              workspaceId={workspace.id}
              member={selectedMember}
              roleTemplates={roleTemplates}
              onClose={() => {
                setPermissionsDialogOpen(false)
                loadWorkspace()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Simplified permissions editor component
function MemberPermissionsEditor({
  workspaceId,
  member,
  roleTemplates,
  onClose,
}: {
  workspaceId: string
  member: Member
  roleTemplates: RoleTemplate[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pagePermissions, setPagePermissions] = useState<Record<string, PermissionLevel>>({})

  useEffect(() => {
    loadPermissions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPermissions() {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/members/${member.id}/permissions`
      )
      if (response.ok) {
        const data = await response.json()
        // Convert granular permissions to page permissions
        const pagePerms = granularToPagePermissions(data.resolvedPermissions)
        setPagePermissions(pagePerms)
      }
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Convert granular permissions to simplified page permissions
  function granularToPagePermissions(granular: Record<string, boolean>): Record<string, PermissionLevel> {
    const pagePerms: Record<string, PermissionLevel> = {}

    PAGE_PERMISSIONS.forEach(page => {
      // Check if all edit permissions are granted
      const hasAllEdit = page.editPermissions.length > 0 &&
        page.editPermissions.every(p => granular[p])

      // Check if all view permissions are granted
      const hasAllView = page.viewPermissions.every(p => granular[p])

      if (hasAllEdit && hasAllView) {
        pagePerms[page.key] = 'edit'
      } else if (hasAllView) {
        pagePerms[page.key] = 'view'
      } else {
        pagePerms[page.key] = 'hide'
      }
    })

    return pagePerms
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Find appropriate template based on current affiliation
      const affiliation = dataToAffiliation(member.functionalCategories, member.isExternalAdvisor)
      const templateSlug = affiliation === 'owner' ? 'owner' :
                          affiliation === 'advisor' ? 'consultant' : 'internal_team'
      const template = roleTemplates.find(t => t.slug === templateSlug)

      // Convert page permissions to granular
      const granularPermissions = pagePermissionsToGranular(pagePermissions)
      const customPermsArray = Object.entries(granularPermissions)
        .map(([permission, granted]) => ({ permission, granted }))

      await fetch(
        `/api/workspaces/${workspaceId}/members/${member.id}/permissions`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleTemplateId: template?.id,
            customPermissions: customPermsArray,
          }),
        }
      )

      onClose()
    } catch (error) {
      console.error('Failed to save permissions:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {PAGE_PERMISSIONS.map((page) => {
          const currentLevel = pagePermissions[page.key] || 'hide'
          return (
            <div key={page.key} className="flex items-center justify-between p-3">
              <span className="text-sm">{page.label}</span>
              <div className="flex gap-1">
                {(['edit', 'view', 'hide'] as PermissionLevel[]).map((level) => {
                  const Icon = permissionLevelIcons[level]
                  const isSelected = currentLevel === level
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setPagePermissions({
                          ...pagePermissions,
                          [page.key]: level,
                        })
                      }}
                      className={cn(
                        'p-2 rounded transition-colors',
                        isSelected
                          ? level === 'edit'
                            ? 'bg-green-100 text-green-700'
                            : level === 'view'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          : 'hover:bg-muted text-muted-foreground'
                      )}
                      title={permissionLevelLabels[level]}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Pencil className="h-3 w-3" /> Edit
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" /> View
        </span>
        <span className="flex items-center gap-1">
          <EyeOff className="h-3 w-3" /> Hide
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
