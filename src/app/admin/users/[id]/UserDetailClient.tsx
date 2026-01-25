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
import { ArrowLeft, Building2, Activity, Ticket, UserCog, Save } from 'lucide-react'

interface UserDetailClientProps {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    isSuperAdmin: boolean
    createdAt: string
    updatedAt: string
    organizations: Array<{
      id: string
      role: string
      joinedAt: string
      organization: {
        id: string
        name: string
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
          <TabsTrigger value="organizations">
            Organizations ({user.organizations.length})
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

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  User is not a member of any organization
                </p>
              ) : (
                <div className="space-y-3">
                  {user.organizations.map((ou) => (
                    <div
                      key={ou.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <Link
                          href={`/admin/organizations/${ou.organization.id}`}
                          className="font-medium hover:underline"
                        >
                          {ou.organization.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(ou.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>{ou.role}</Badge>
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

      <ImpersonationModal
        open={showImpersonationModal}
        onOpenChange={setShowImpersonationModal}
        user={{ id: user.id, email: user.email, name: user.name }}
      />
    </div>
  )
}
