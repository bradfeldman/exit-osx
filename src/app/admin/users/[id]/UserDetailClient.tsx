'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImpersonationModal } from '@/components/admin/ImpersonationModal'
import { AlertTriangle, ArrowLeft, Building2, Activity, Ticket, UserCog, Save } from 'lucide-react'

interface UserDetailClientProps {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    isSuperAdmin: boolean
    createdAt: string
    updatedAt: string
    workspaces: Array<{
      id: string
      role: string
      joinedAt: string
      workspace: {
        id: string
        name: string
        _count: { users: number; companies: number }
      }
    }>
    auditLogs: Array<{
      id: string
      action: string
      targetType: string
      targetId: string | null
      createdAt: string
    }>
    impersonationsAsTarget: Array<{
      id: string
      reason: string
      startedAt: string
      endedAt: string | null
      admin: {
        email: string
        name: string | null
      }
    }>
    ticketsCreated: Array<{
      id: string
      ticketNumber: string
      subject: string
      status: string
      createdAt: string
    }>
  }
}

export function UserDetailClient({ user }: UserDetailClientProps) {
  const router = useRouter()
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email)
  const [isSuperAdmin, setIsSuperAdmin] = useState(user.isSuperAdmin)
  const [isSaving, setIsSaving] = useState(false)
  const [showImpersonationModal, setShowImpersonationModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, isSuperAdmin }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (deleteConfirmation !== user.email) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmEmail: deleteConfirmation,
          reason: deleteReason || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete user')
      }

      router.push('/admin/users')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete user')
      setIsDeleting(false)
    }
  }

  const isDeleteEnabled = deleteConfirmation === user.email

  const soleWorkspaces = user.workspaces.filter(wu => wu.workspace._count.users === 1)

  const hasChanges =
    name !== (user.name || '') ||
    email !== user.email ||
    isSuperAdmin !== user.isSuperAdmin

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowImpersonationModal(true)}
        >
          <UserCog className="mr-2 h-4 w-4" />
          Login as User
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspaces">
            Workspaces ({user.workspaces.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>
                Edit user profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Super Admin</Label>
                  <p className="text-sm text-muted-foreground">
                    Grants access to the admin dashboard
                  </p>
                </div>
                <Switch
                  checked={isSuperAdmin}
                  onCheckedChange={setIsSuperAdmin}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="font-mono">{user.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(user.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd>{new Date(user.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {user.impersonationsAsTarget.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Impersonation History</CardTitle>
                <CardDescription>
                  Times this user was impersonated by admins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.impersonationsAsTarget.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {session.admin.name || session.admin.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.startedAt).toLocaleString()}
                        </p>
                        <Badge variant={session.endedAt ? 'secondary' : 'default'}>
                          {session.endedAt ? 'Ended' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workspaces">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.workspaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  User is not a member of any workspace
                </p>
              ) : (
                <div className="space-y-3">
                  {user.workspaces.map((wu) => (
                    <div
                      key={wu.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <Link
                          href={`/admin/workspaces/${wu.workspace.id}`}
                          className="font-medium hover:underline"
                        >
                          {wu.workspace.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(wu.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>{wu.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded for this user
                </p>
              ) : (
                <div className="space-y-3">
                  {user.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {log.action.replace('.', ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.targetType}
                          {log.targetId && ` (${log.targetId.slice(0, 8)}...)`}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.ticketsCreated.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No support tickets from this user
                </p>
              ) : (
                <div className="space-y-3">
                  {user.ticketsCreated.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-start justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="font-medium hover:underline"
                        >
                          #{ticket.ticketNumber}: {ticket.subject}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                        {ticket.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription className="text-red-600">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-red-200 bg-white p-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Delete this user</h3>
              <p className="text-sm text-gray-600 mt-1">
                This will permanently delete the user&apos;s account, remove them from all
                organizations, and delete their authentication credentials. This action
                cannot be undone.
              </p>
            </div>

            {soleWorkspaces.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">
                      The following workspaces will also be permanently deleted because
                      this user is the only member:
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      {soleWorkspaces.map(wu => (
                        <li key={wu.workspace.id}>
                          {wu.workspace.name} ({wu.workspace._count.companies}{' '}
                          {wu.workspace._count.companies === 1 ? 'company' : 'companies'})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      All companies, assessments, evidence, and data within these workspaces
                      will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleteError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="delete-reason" className="text-gray-700">
                  Reason for deletion (optional)
                </Label>
                <Input
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Why is this account being deleted?"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation" className="text-gray-700">
                  To confirm, type <span className="font-semibold text-red-700">{user.email}</span> below
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter user email to confirm"
                  className="bg-white"
                />
              </div>

              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={!isDeleteEnabled || isDeleting}
                className="w-full"
              >
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ImpersonationModal
        open={showImpersonationModal}
        onOpenChange={setShowImpersonationModal}
        user={{ id: user.id, email: user.email, name: user.name }}
      />
    </div>
  )
}
