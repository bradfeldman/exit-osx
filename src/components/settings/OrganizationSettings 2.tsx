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
import { UserRole } from '@prisma/client'

interface Member {
  id: string
  role: UserRole
  joinedAt: string
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
}

interface Invite {
  id: string
  email: string
  role: UserRole
  createdAt: string
  expiresAt: string
}

interface Organization {
  id: string
  name: string
  currentUserRole: UserRole
  users: Member[]
  invites: Invite[]
}

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEAM_LEADER: 'Team Leader',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  SUPER_ADMIN: 'default',
  ADMIN: 'default',
  TEAM_LEADER: 'secondary',
  MEMBER: 'secondary',
  VIEWER: 'outline',
}

export function OrganizationSettings() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  useEffect(() => {
    loadOrganization()
  }, [])

  async function loadOrganization() {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        // Use first organization for now
        if (data.organizations.length > 0) {
          setOrganization(data.organizations[0])
        }
      }
    } catch (error) {
      console.error('Failed to load organization:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!organization || !inviteEmail) return

    setInviting(true)
    setInviteError(null)
    setInviteUrl(null)

    try {
      const response = await fetch(`/api/organizations/${organization.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invite')
        return
      }

      setInviteUrl(window.location.origin + data.invite.inviteUrl)
      setInviteEmail('')
      loadOrganization()
    } catch {
      setInviteError('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    if (!organization) return

    try {
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!organization) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/members?userId=${userId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!organization) return

    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/invites?inviteId=${inviteId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  const canManageMembers = organization?.currentUserRole === 'ADMIN' || organization?.currentUserRole === 'SUPER_ADMIN'
  const canInvite = canManageMembers || organization?.currentUserRole === 'TEAM_LEADER'

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No organization found
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
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {organization.users.length} member{organization.users.length !== 1 ? 's' : ''} in {organization.name}
            </CardDescription>
          </div>
          {canInvite && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>Invite Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invite to add someone to your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as UserRole)}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-destructive">{inviteError}</p>
                  )}
                  {inviteUrl && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        Share this invite link:
                      </p>
                      <code className="text-xs break-all">{inviteUrl}</code>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    {inviteUrl ? 'Close' : 'Cancel'}
                  </Button>
                  {!inviteUrl && (
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
                <TableHead>Joined</TableHead>
                {canManageMembers && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organization.users.map((member) => (
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
                    {canManageMembers && member.role !== 'SUPER_ADMIN' ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.user.id, value as UserRole)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={roleBadgeVariant[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell>
                      {member.role !== 'SUPER_ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.user.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canInvite && organization.invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              {organization.invites.length} pending invite{organization.invites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[invite.role]}>
                        {roleLabels[invite.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
