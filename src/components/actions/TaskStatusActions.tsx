'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, AlertTriangle, Clock, XCircle, UserPlus, Mail, X } from 'lucide-react'

interface TaskStatusActionsProps {
  taskId: string
  onComplete: () => void
  onBlock: (taskId: string, reason: string) => void
  onDelegate?: (taskId: string, email: string) => void
  assignee: { name: string; role: string | null } | null
  isAssignedToCurrentUser: boolean
  pendingInvite?: { email: string; sentAt: string } | null
  onRefresh?: () => void
}

export function TaskStatusActions({
  taskId,
  onComplete,
  onBlock,
  onDelegate,
  assignee,
  isAssignedToCurrentUser,
  pendingInvite,
  onRefresh,
}: TaskStatusActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showBlockInput, setShowBlockInput] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [showDelegateInput, setShowDelegateInput] = useState(false)
  const [delegateEmail, setDelegateEmail] = useState('')
  const [delegateStatus, setDelegateStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [cancellingInvite, setCancellingInvite] = useState(false)

  const handleBlock = () => {
    if (blockReason.trim()) {
      onBlock(taskId, blockReason.trim())
      setShowBlockInput(false)
      setBlockReason('')
    }
  }

  const handleDelegate = async () => {
    if (!delegateEmail.trim()) return

    if (onDelegate) {
      onDelegate(taskId, delegateEmail.trim())
      setShowDelegateInput(false)
      setDelegateEmail('')
      return
    }

    // Default: use the task invite API directly
    setDelegateStatus('sending')
    try {
      const response = await fetch(`/api/tasks/${taskId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: delegateEmail.trim(), isPrimary: true }),
      })

      if (response.ok) {
        setDelegateStatus('sent')
        setTimeout(() => {
          setShowDelegateInput(false)
          setDelegateEmail('')
          setDelegateStatus('idle')
          onRefresh?.()
        }, 1500)
      } else {
        setDelegateStatus('idle')
      }
    } catch {
      setDelegateStatus('idle')
    }
  }

  const handleResendInvite = async () => {
    if (!pendingInvite) return
    setDelegateStatus('sending')
    try {
      const response = await fetch(`/api/tasks/${taskId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingInvite.email, isPrimary: true }),
      })
      if (response.ok) {
        setDelegateStatus('sent')
        setTimeout(() => {
          setDelegateStatus('idle')
        }, 2000)
      } else {
        setDelegateStatus('idle')
      }
    } catch {
      setDelegateStatus('idle')
    }
  }

  const handleCancelInvite = async () => {
    if (!pendingInvite) return
    setCancellingInvite(true)
    try {
      await fetch(`/api/tasks/${taskId}/invite`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingInvite.email }),
      })
      onRefresh?.()
    } catch {
      // silently fail
    } finally {
      setCancellingInvite(false)
    }
  }

  const hasPendingInvite = !!pendingInvite

  return (
    <div className="mt-6 border-t border-border/50 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={onComplete}>
            Mark Complete
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute left-0 top-full mt-1 z-10 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
                {hasPendingInvite ? (
                  <>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                      onClick={() => {
                        handleResendInvite()
                        setShowMenu(false)
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Re-send Invite
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted/50 flex items-center gap-2"
                      onClick={() => {
                        handleCancelInvite()
                        setShowMenu(false)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel Invite
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => {
                      setShowDelegateInput(true)
                      setShowMenu(false)
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Delegate
                  </button>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                  onClick={() => {
                    setShowBlockInput(true)
                    setShowMenu(false)
                  }}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  I&apos;m Blocked
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-2"
                  onClick={() => setShowMenu(false)}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Defer
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted/50 flex items-center gap-2"
                  onClick={() => setShowMenu(false)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Not Applicable
                </button>
              </div>
            )}
          </div>
        </div>

        <span className="text-sm text-muted-foreground">
          {hasPendingInvite
            ? `Invite sent to ${pendingInvite.email}`
            : assignee && !isAssignedToCurrentUser
              ? `Assigned: ${assignee.name}${assignee.role ? ` (${assignee.role})` : ''}`
              : 'Assigned: You'}
        </span>
      </div>

      {/* Pending invite banner */}
      {hasPendingInvite && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300 flex-1">
            Invite sent to <strong>{pendingInvite.email}</strong>
            {delegateStatus === 'sent' && <span className="ml-2 text-green-600">(re-sent!)</span>}
          </p>
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            onClick={handleCancelInvite}
            disabled={cancellingInvite}
          >
            {cancellingInvite ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      )}

      {showBlockInput && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="What's blocking you?"
            value={blockReason}
            onChange={e => setBlockReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBlock()}
            className="flex-1 text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/30"
          />
          <Button size="sm" onClick={handleBlock}>
            Submit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowBlockInput(false)
              setBlockReason('')
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {showDelegateInput && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="email"
            placeholder="Team member's email"
            value={delegateEmail}
            onChange={e => setDelegateEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDelegate()}
            disabled={delegateStatus !== 'idle'}
            className="flex-1 text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/30 disabled:opacity-50"
          />
          <Button size="sm" onClick={handleDelegate} disabled={delegateStatus !== 'idle'}>
            {delegateStatus === 'sending' ? 'Sending...' : delegateStatus === 'sent' ? 'Sent!' : 'Send Invite'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={delegateStatus === 'sending'}
            onClick={() => {
              setShowDelegateInput(false)
              setDelegateEmail('')
              setDelegateStatus('idle')
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
