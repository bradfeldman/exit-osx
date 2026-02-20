'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Send, User, UserCog } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

interface TicketDetailClientProps {
  ticket: {
    id: string
    ticketNumber: string
    subject: string
    userEmail: string
    status: string
    priority: string
    category: string | null
    createdAt: string
    updatedAt: string
    resolvedAt: string | null
    user: {
      id: string
      email: string
      name: string | null
      avatarUrl: string | null
      workspaces: Array<{
        workspace: {
          id: string
          name: string
        }
      }>
    } | null
    assignedTo: {
      id: string
      email: string
      name: string | null
    } | null
    messages: Array<{
      id: string
      authorEmail: string
      content: string
      isInternal: boolean
      createdAt: string
      author: {
        id: string
        email: string
        name: string | null
      } | null
    }>
  }
  admins: Array<{
    id: string
    email: string
    name: string | null
  }>
}

const statusBadgeClass: Record<string, string> = {
  open: 'bg-accent-light text-primary',
  in_progress: 'bg-orange-light text-orange-dark',
  waiting: 'bg-purple-light text-purple-dark',
  resolved: 'bg-green-light text-green-dark',
  closed: 'bg-muted text-foreground',
}

const priorityBadgeClass: Record<string, string> = {
  low: 'bg-muted text-foreground',
  normal: 'bg-accent-light text-primary',
  high: 'bg-orange-light text-orange-dark',
  urgent: 'bg-red-light text-red-dark',
}

export function TicketDetailClient({ ticket, admins }: TicketDetailClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState(ticket.status)
  const [priority, setPriority] = useState(ticket.priority)
  const [assignedToId, setAssignedToId] = useState(ticket.assignedTo?.id || '')
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleUpdateTicket = async () => {
    setIsSaving(true)
    try {
      await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          assignedToId: assignedToId || null,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to update ticket:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSending(true)
    try {
      await fetch(`/api/admin/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          isInternal,
        }),
      })
      setMessage('')
      setIsInternal(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const hasStatusChanges =
    status !== ticket.status ||
    priority !== ticket.priority ||
    (assignedToId || null) !== (ticket.assignedTo?.id || null)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className={styles.detailHeaderText}>
          <h1 className={styles.detailTitle}>#{ticket.ticketNumber}</h1>
          <p className={styles.detailSubtitle}>{ticket.subject}</p>
        </div>
        <div className={styles.detailHeaderBadges}>
          <Badge className={statusBadgeClass[ticket.status]}>
            {ticket.status.replace('_', ' ')}
          </Badge>
          <Badge className={priorityBadgeClass[ticket.priority]}>
            {ticket.priority}
          </Badge>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.detailGrid}>
        {/* Main — conversation */}
        <div className={styles.detailMain}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Conversation</p>
                <p className={styles.cardDescription}>{ticket.messages.length} messages</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              {ticket.messages.length === 0 ? (
                <p className={styles.pageSubtitle}>No messages yet</p>
              ) : (
                <div className={styles.messageList}>
                  {ticket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={msg.isInternal ? styles.messageInternal : styles.message}
                    >
                      <div className={styles.messageHeader}>
                        <div className={styles.messageAuthorRow}>
                          <div className={styles.messageAvatar}>
                            {(msg.author?.name?.[0] || msg.authorEmail[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className={styles.messageAuthorName}>
                              {msg.author?.name || msg.authorEmail}
                            </p>
                            {msg.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                Internal Note
                              </Badge>
                            )}
                          </div>
                        </div>
                        <time className={styles.messageTimestamp}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <p className={styles.messageBody}>{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <form onSubmit={handleSendMessage} className={styles.replyForm}>
                <Textarea
                  placeholder="Type your reply..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-24"
                />
                <div className={styles.replyFormFooter}>
                  <div className={styles.replyFormCheckbox}>
                    <Checkbox
                      id="internal"
                      checked={isInternal}
                      onCheckedChange={(checked) => setIsInternal(checked === true)}
                    />
                    <Label htmlFor="internal" className="text-sm">
                      Internal note (not visible to user)
                    </Label>
                  </div>
                  <Button type="submit" disabled={!message.trim() || isSending}>
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.detailSidebar}>
          {/* User info */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>
                  <User className="h-4 w-4" />
                  User
                </p>
              </div>
            </div>
            <div className={styles.cardContent}>
              {ticket.user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <p className={styles.cellPrimary}>{ticket.user.name || 'No name'}</p>
                    <p className={styles.cellSecondary}>{ticket.user.email}</p>
                  </div>
                  {ticket.user.workspaces.length > 0 && (
                    <div>
                      <p className={styles.cellSecondary}>Workspaces:</p>
                      <ul style={{ fontSize: 14 }}>
                        {ticket.user.workspaces.map((wu) => (
                          <li key={wu.workspace.id}>
                            <Link
                              href={`/admin/workspaces/${wu.workspace.id}`}
                              style={{ color: 'var(--accent)', textDecoration: 'none' }}
                            >
                              {wu.workspace.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${ticket.user.id}`}>
                        View Profile
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${ticket.user.id}`}>
                        <UserCog className="mr-1 h-3 w-3" />
                        Impersonate
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={styles.cellSecondary}>User: {ticket.userEmail}</p>
              )}
            </div>
          </div>

          {/* Manage ticket */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Manage Ticket</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className={styles.fieldGroup}>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={styles.fieldGroup}>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={styles.fieldGroup}>
                  <Label>Assigned To</Label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.name || admin.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleUpdateTicket}
                  disabled={!hasStatusChanges || isSaving}
                  className="w-full"
                >
                  {isSaving ? 'Saving...' : 'Update Ticket'}
                </Button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Details</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <dl className={styles.infoList}>
                <div className={styles.infoRow}>
                  <dt className={styles.infoLabel}>Created</dt>
                  <dd className={styles.infoValue}>{new Date(ticket.createdAt).toLocaleString()}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt className={styles.infoLabel}>Updated</dt>
                  <dd className={styles.infoValue}>{new Date(ticket.updatedAt).toLocaleString()}</dd>
                </div>
                {ticket.resolvedAt && (
                  <div className={styles.infoRow}>
                    <dt className={styles.infoLabel}>Resolved</dt>
                    <dd className={styles.infoValue}>{new Date(ticket.resolvedAt).toLocaleString()}</dd>
                  </div>
                )}
                {ticket.category && (
                  <div className={styles.infoRow}>
                    <dt className={styles.infoLabel}>Category</dt>
                    <dd className={styles.infoValue}>{ticket.category}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
