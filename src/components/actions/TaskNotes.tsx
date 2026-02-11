'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddNoteDialog } from './AddNoteDialog'

interface TaskNote {
  id: string
  content: string
  noteType: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

interface TaskNotesProps {
  taskId: string
  taskTitle: string
  disabled?: boolean
}

export function TaskNotes({ taskId, taskTitle, disabled = false }: TaskNotesProps) {
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/notes`)
      if (!response.ok) throw new Error('Failed to fetch notes')
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleNoteAdded = () => {
    setShowAddDialog(false)
    fetchNotes()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'COMPLETION':
        return 'Completion'
      case 'BLOCKER':
        return 'Blocker'
      case 'PROGRESS':
        return 'Progress'
      default:
        return 'Note'
    }
  }

  const getNoteTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'COMPLETION':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      case 'BLOCKER':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'PROGRESS':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Loading notes...
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Notes</span>
          </div>
          {!disabled && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddDialog(true)}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Note
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">No notes yet. Add context about progress, blockers, or outcomes.</p>

        {showAddDialog && (
          <AddNoteDialog
            taskId={taskId}
            taskTitle={taskTitle}
            onSuccess={handleNoteAdded}
            onCancel={() => setShowAddDialog(false)}
          />
        )}
      </div>
    )
  }

  const displayedNotes = isExpanded ? notes : notes.slice(0, 3)

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Notes ({notes.length})
          </span>
        </div>
        {!disabled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddDialog(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {displayedNotes.map((note) => (
          <div key={note.id} className="border-l-2 border-border pl-3 py-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {note.user.name || note.user.email}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${getNoteTypeBadgeColor(note.noteType)}`}
                >
                  {getNoteTypeLabel(note.noteType)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(note.createdAt)}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}
      </div>

      {notes.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[var(--burnt-orange)] hover:underline mt-3"
        >
          {isExpanded ? 'Show less' : `Show ${notes.length - 3} more`}
        </button>
      )}

      {showAddDialog && (
        <AddNoteDialog
          taskId={taskId}
          taskTitle={taskTitle}
          onSuccess={handleNoteAdded}
          onCancel={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}
