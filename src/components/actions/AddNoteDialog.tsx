'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare, X } from 'lucide-react'

interface AddNoteDialogProps {
  taskId: string
  taskTitle: string
  onSuccess: () => void
  onCancel: () => void
}

export function AddNoteDialog({ taskId, taskTitle, onSuccess, onCancel }: AddNoteDialogProps) {
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState<string>('GENERAL')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Note content is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), noteType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add note')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--burnt-orange)]" />
            <h3 className="text-lg font-semibold">Add Note</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{taskTitle}</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Note Type
            </label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/30"
              disabled={isSubmitting}
            >
              <option value="GENERAL">General Note</option>
              <option value="PROGRESS">Progress Update</option>
              <option value="BLOCKER">Blocker / Issue</option>
              <option value="COMPLETION">Completion Summary</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Note Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add context, progress updates, blockers, or outcomes..."
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/30"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <Button onClick={handleSubmit} disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
