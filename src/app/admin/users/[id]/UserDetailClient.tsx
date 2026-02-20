'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImpersonationModal } from '@/components/admin/ImpersonationModal'
import { AlertTriangle, ArrowLeft, Building2, Activity, Ticket, UserCog, Save } from 'lucide-react'
import styles from '@/components/admin/admin-tables.module.css'

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
      workspaceRole: string
      joinedAt: string
      workspace: {
        id: string
        name: string
        _count: { members: number; companies: number }
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

  const soleWorkspaces = user.workspaces.filter(wu => wu.workspace._count.members === 1)

  const hasChanges =
    name !== (user.name || '') ||
    email !== user.email ||
    isSuperAdmin !== user.isSuperAdmin

  return (
    <div className={styles.page}>
      <div className={styles.pageTitleBar}>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className={styles.pageTitleBarContent}>
          <h1>{user.name || user.email}</h1>
          <p>{user.email}</p>
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

        <TabsContent value="profile">
          <div className={styles.tabContent}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>User Details</p>
                <p className={styles.cardDescription}>Edit user profile information</p>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.toggleRow} style={{ marginTop: 16 }}>
                  <div className={styles.toggleRowContent}>
                    <p className={styles.toggleRowLabel}>Super Admin</p>
                    <p className={styles.toggleRowDesc}>
                      Grants access to the admin dashboard
                    </p>
                  </div>
                  <Switch
                    checked={isSuperAdmin}
                    onCheckedChange={setIsSuperAdmin}
                  />
                </div>

                <div className={styles.formActions} style={{ marginTop: 16 }}>
                  <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>Account Info</p>
              </div>
              <div className={styles.cardContent}>
                <dl className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <dt className={styles.detailTerm}>User ID</dt>
                    <dd className={styles.detailValue}>{user.id}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt className={styles.detailTerm}>Created</dt>
                    <dd className={styles.detailValueNormal}>{new Date(user.createdAt).toLocaleString()}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt className={styles.detailTerm}>Last Updated</dt>
                    <dd className={styles.detailValueNormal}>{new Date(user.updatedAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {user.impersonationsAsTarget.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <p className={styles.cardTitle}>Impersonation History</p>
                  <p className={styles.cardDescription}>
                    Times this user was impersonated by admins
                  </p>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.listStack}>
                    {user.impersonationsAsTarget.map((session) => (
                      <div key={session.id} className={styles.listItem}>
                        <div className={styles.listItemBody}>
                          <p className={styles.listItemTitle}>
                            {session.admin.name || session.admin.email}
                          </p>
                          <p className={styles.listItemMeta}>{session.reason}</p>
                        </div>
                        <div className={styles.listItemRight}>
                          <time className={styles.listItemTime}>
                            {new Date(session.startedAt).toLocaleString()}
                          </time>
                          <Badge variant={session.endedAt ? 'secondary' : 'default'}>
                            {session.endedAt ? 'Ended' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workspaces">
          <div className={styles.tabContent}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>
                  <Building2 className="h-5 w-5" />
                  Workspaces
                </p>
              </div>
              <div className={styles.cardContent}>
                {user.workspaces.length === 0 ? (
                  <p className={styles.emptyText}>
                    User is not a member of any workspace
                  </p>
                ) : (
                  <div className={styles.listStack}>
                    {user.workspaces.map((wu) => (
                      <div key={wu.id} className={styles.listItem}>
                        <div className={styles.listItemBody}>
                          <Link
                            href={`/admin/workspaces/${wu.workspace.id}`}
                            className={styles.listItemLink}
                          >
                            {wu.workspace.name}
                          </Link>
                          <p className={styles.listItemMeta}>
                            Joined {new Date(wu.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge>{wu.workspaceRole}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className={styles.tabContent}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </p>
              </div>
              <div className={styles.cardContent}>
                {user.auditLogs.length === 0 ? (
                  <p className={styles.emptyText}>
                    No activity recorded for this user
                  </p>
                ) : (
                  <div className={styles.listStack}>
                    {user.auditLogs.map((log) => (
                      <div key={log.id} className={styles.listItem}>
                        <div className={styles.listItemBody}>
                          <p className={styles.listItemTitle}>
                            {log.action.replace('.', ' ')}
                          </p>
                          <p className={styles.listItemMeta}>
                            {log.targetType}
                            {log.targetId && ` (${log.targetId.slice(0, 8)}...)`}
                          </p>
                        </div>
                        <time className={styles.listItemTime}>
                          {new Date(log.createdAt).toLocaleString()}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <div className={styles.tabContent}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>
                  <Ticket className="h-5 w-5" />
                  Support Tickets
                </p>
              </div>
              <div className={styles.cardContent}>
                {user.ticketsCreated.length === 0 ? (
                  <p className={styles.emptyText}>
                    No support tickets from this user
                  </p>
                ) : (
                  <div className={styles.listStack}>
                    {user.ticketsCreated.map((ticket) => (
                      <div key={ticket.id} className={styles.listItem}>
                        <div className={styles.listItemBody}>
                          <Link
                            href={`/admin/tickets/${ticket.id}`}
                            className={styles.listItemLink}
                          >
                            #{ticket.ticketNumber}: {ticket.subject}
                          </Link>
                          <p className={styles.listItemMeta}>
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
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div className={styles.dangerCard}>
        <div className={styles.dangerCardHeader}>
          <p className={styles.dangerCardTitle}>Danger Zone</p>
          <p className={styles.dangerCardDescription}>
            Irreversible and destructive actions
          </p>
        </div>
        <div className={styles.dangerCardContent}>
          <div className={styles.dangerInner}>
            <div>
              <h3>Delete this user</h3>
              <p>
                This will permanently delete the user&apos;s account, remove them from all
                organizations, and delete their authentication credentials. This action
                cannot be undone.
              </p>
            </div>

            {soleWorkspaces.length > 0 && (
              <div className={styles.warningBox}>
                <div className={styles.warningBoxInner}>
                  <AlertTriangle className={styles.warningBoxIcon} style={{ width: 20, height: 20 }} />
                  <div className={styles.warningBoxBody}>
                    <p>
                      The following workspaces will also be permanently deleted because
                      this user is the only member:
                    </p>
                    <ul>
                      {soleWorkspaces.map(wu => (
                        <li key={wu.workspace.id}>
                          {wu.workspace.name} ({wu.workspace._count.companies}{' '}
                          {wu.workspace._count.companies === 1 ? 'company' : 'companies'})
                        </li>
                      ))}
                    </ul>
                    <p className={styles.warningBoxNote}>
                      All companies, assessments, evidence, and data within these workspaces
                      will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleteError && (
              <div className={styles.errorMessage}>
                {deleteError}
              </div>
            )}

            <div className={styles.deleteFields}>
              <div className={styles.deleteFieldGroup}>
                <Label htmlFor="delete-reason" className={styles.deleteFieldLabel}>
                  Reason for deletion (optional)
                </Label>
                <Input
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Why is this account being deleted?"
                />
              </div>

              <div className={styles.deleteFieldGroup}>
                <Label htmlFor="delete-confirmation" className={styles.deleteFieldLabel}>
                  To confirm, type{' '}
                  <span className={styles.deleteEmailHighlight}>{user.email}</span>{' '}
                  below
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter user email to confirm"
                />
              </div>

              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={!isDeleteEnabled || isDeleting}
                className={styles.deleteFullWidth}
              >
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ImpersonationModal
        open={showImpersonationModal}
        onOpenChange={setShowImpersonationModal}
        user={{ id: user.id, email: user.email, name: user.name }}
      />
    </div>
  )
}
