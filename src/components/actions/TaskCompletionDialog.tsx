'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

interface TaskCompletionDialogProps {
  task: {
    id: string
    title: string
    normalizedValue: number
  }
  onConfirm: (taskId: string, notes: string) => void
  onCancel: () => void
}

export function TaskCompletionDialog({ task, onConfirm, onCancel }: TaskCompletionDialogProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    await onConfirm(task.id, notes)
    setIsSubmitting(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onCancel()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-dark">
            <Check className="h-5 w-5" />
            <span>Task Complete</span>
          </DialogTitle>
        </DialogHeader>

        {/* Task info */}
        <p className="text-base font-medium text-foreground mt-3">{task.title}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Estimated value recovered: <span className="font-medium text-foreground">~{formatCurrency(task.normalizedValue)}</span>
        </p>

        <div className="border-t border-border my-4" />

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="completion-notes">
            Completion Notes (optional)
          </label>
          <textarea
            id="completion-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What did you accomplish? Any follow-up items?"
            className="mt-1.5 w-full text-sm rounded-lg border border-border bg-background px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/30"
          />
        </div>

        <div className="border-t border-border my-4" />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Complete Task'}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
