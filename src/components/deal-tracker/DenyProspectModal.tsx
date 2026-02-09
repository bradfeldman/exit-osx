'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DenyProspectModalProps {
  isOpen: boolean
  prospectName: string
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function DenyProspectModal({
  isOpen,
  prospectName,
  onClose,
  onConfirm,
}: DenyProspectModalProps) {
  const [reason, setReason] = useState('')

  const handleClose = () => {
    setReason('')
    onClose()
  }

  const handleConfirm = () => {
    onConfirm(reason)
    setReason('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deny Prospect</DialogTitle>
          <DialogDescription>
            Denying: <strong>{prospectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Direct competitor - too risky"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be visible to the team.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Confirm Deny
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
