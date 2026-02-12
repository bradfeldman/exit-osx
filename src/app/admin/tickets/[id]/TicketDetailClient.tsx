'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            #{ticket.ticketNumber}
          </h1>
          <p className="text-muted-foreground">{ticket.subject}</p>
        </div>
        <Badge className={statusColors[ticket.status]}>
          {ticket.status.replace('_', ' ')}
        </Badge>
        <Badge className={priorityColors[ticket.priority]}>
          {ticket.priority}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                {ticket.messages.length} messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet</p>
              ) : (
                <div className="space-y-4">
                  {ticket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-4 ${
                        msg.isInternal
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                            {(msg.author?.name?.[0] || msg.authorEmail[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {msg.author?.name || msg.authorEmail}
                            </p>
                            {msg.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                Internal Note
                              </Badge>
                            )}
                          </div>
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <form onSubmit={handleSendMessage} className="space-y-3 pt-4 border-t">
                <Textarea
                  placeholder="Type your reply..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-24"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* User info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                User
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.user ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{ticket.user.name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{ticket.user.email}</p>
                  </div>
                  {ticket.user.workspaces.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Workspaces:</p>
                      <ul className="text-sm">
                        {ticket.user.workspaces.map((wu) => (
                          <li key={wu.workspace.id}>
                            <Link
                              href={`/admin/workspaces/${wu.workspace.id}`}
                              className="hover:underline"
                            >
                              {wu.workspace.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
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
                <p className="text-sm text-muted-foreground">
                  User: {ticket.userEmail}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ticket management */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
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

              <div className="space-y-2">
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
            </CardContent>
          </Card>

          {/* Ticket info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Resolved</dt>
                    <dd>{new Date(ticket.resolvedAt).toLocaleString()}</dd>
                  </div>
                )}
                {ticket.category && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>{ticket.category}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
