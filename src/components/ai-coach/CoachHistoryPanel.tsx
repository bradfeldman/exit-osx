'use client'

import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Pencil, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

interface CoachHistoryPanelProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, title: string) => void
}

function groupConversations(conversations: ConversationSummary[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const c of conversations) {
    const d = new Date(c.updatedAt)
    if (d >= today) groups[0].items.push(c)
    else if (d >= yesterday) groups[1].items.push(c)
    else if (d >= weekAgo) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter(g => g.items.length > 0)
}

export function CoachHistoryPanel({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: CoachHistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const groups = groupConversations(conversations)

  const startRename = (c: ConversationSummary) => {
    setEditingId(c.id)
    setEditTitle(c.title)
  }

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <button
          onClick={onNewConversation}
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'group relative rounded-lg px-3 py-2 cursor-pointer transition-colors',
                    activeConversationId === c.id
                      ? 'bg-muted'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => onSelectConversation(c.id)}
                >
                  {editingId === c.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 text-sm bg-background border border-input rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button onClick={(e) => { e.stopPropagation(); confirmRename() }} className="p-0.5 text-green-600 hover:text-green-700">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }} className="p-0.5 text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                        <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                        <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                          {c.messageCount}
                        </span>
                      </div>
                      {/* Hover actions */}
                      <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 bg-background rounded border border-border shadow-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(c) }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id) }}
                          className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            No conversations yet. Start one to get AI-powered exit advice.
          </p>
        )}
      </div>
    </div>
  )
}
