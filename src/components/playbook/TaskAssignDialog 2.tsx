'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TeamMember {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: string
}

interface TaskAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  taskTitle: string
  companyId: string
  currentAssigneeId?: string | null
  currentDueDate?: string | null
  onSave: () => void
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email[0].toUpperCase()
}

export function TaskAssignDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  companyId,
  currentAssigneeId,
  currentDueDate,
  onSave,
}: TaskAssignDialogProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(currentAssigneeId || null)
  const [dueDate, setDueDate] = useState<string>(
    currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : ''
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open && companyId) {
      fetchTeamMembers()
    }
  }, [open, companyId])

  useEffect(() => {
    if (open) {
      setSelectedMemberId(currentAssigneeId || null)
      setDueDate(currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : '')
      setError(null)
      setSuccessMessage(null)
      setShowInviteForm(false)
      setInviteEmail('')
    }
  }, [open, currentAssigneeId, currentDueDate])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/team`)
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.members || [])
      }
    } catch (err) {
      console.error('Error fetching team members:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryAssigneeId: selectedMemberId || null,
          dueDate: dueDate || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save changes')
        return
      }

      onSave()
      onOpenChange(false)
    } catch (err) {
      setError('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    setIsInviting(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          isPrimary: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invite')
        return
      }

      if (data.assigned) {
        setSuccessMessage('User is already a team member and has been assigned')
        await fetchTeamMembers()
      } else {
        setSuccessMessage(`Invite sent to ${inviteEmail}`)
      }

      setInviteEmail('')
      setShowInviteForm(false)
      setTimeout(() => {
        onSave()
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      setError('Failed to send invite')
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{taskTitle}</p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              {successMessage}
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label>Assign to Team Member</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading team members...</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* Unassigned option */}
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(null)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    selectedMemberId === null
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500">Unassigned</span>
                </button>

                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                      selectedMemberId === member.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name || member.email}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                        {getInitials(member.name, member.email)}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        {member.name || member.email.split('@')[0]}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invite New User */}
          <div className="border-t pt-4">
            {!showInviteForm ? (
              <button
                type="button"
                onClick={() => setShowInviteForm(true)}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite someone new
              </button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Invite by Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleInvite}
                    disabled={isInviting}
                  >
                    {isInviting ? 'Sending...' : 'Send'}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="text-xs text-muted-foreground hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
