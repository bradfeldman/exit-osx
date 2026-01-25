'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'

interface ImpersonationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    name: string | null
  }
}

export function ImpersonationModal({ open, onOpenChange, user }: ImpersonationModalProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (reason.length < 10) {
      setError('Please provide a reason with at least 10 characters')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start impersonation')
      }

      // Redirect to dashboard as the impersonated user
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Login as User
          </DialogTitle>
          <DialogDescription>
            You are about to impersonate <strong>{user.name || user.email}</strong>.
            This action will be logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for impersonation *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Investigating user-reported bug in assessment flow..."
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. This will be recorded in the audit log.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600">
              <p className="font-medium">Important:</p>
              <ul className="mt-1 list-inside list-disc">
                <li>Session will expire after 1 hour</li>
                <li>All actions will be logged</li>
                <li>A yellow banner will indicate impersonation mode</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || reason.length < 10}>
              {isLoading ? 'Starting...' : 'Start Impersonation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
