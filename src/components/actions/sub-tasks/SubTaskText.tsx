'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubTaskTextProps {
  stepId: string
  title: string
  completed: boolean
  responseText: string | null
  placeholder: string | null
  onUpdate: (stepId: string, data: { responseText: string; completed: boolean }) => void
}

export function SubTaskText({ stepId, title, completed, responseText, placeholder, onUpdate }: SubTaskTextProps) {
  const [isEditing, setIsEditing] = useState(!completed && !responseText)
  const [text, setText] = useState(responseText || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text, isEditing])

  const doSave = useCallback(() => {
    if (text.trim()) {
      onUpdate(stepId, { responseText: text.trim(), completed: true })
      setIsEditing(false)
    }
  }, [stepId, text, onUpdate])

  // Debounced auto-save on blur
  const handleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        doSave()
      }
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (completed && !isEditing) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Check className="w-4 h-4 mt-0.5 text-[var(--burnt-orange)] shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground line-through">{title}</span>
          {responseText && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 bg-muted/30 rounded px-2 py-1">
              {responseText}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="py-2">
      <p className="text-sm text-foreground mb-2">{title}</p>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder || 'Type your response...'}
        rows={3}
        className={cn(
          'w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm resize-none',
          'focus:outline-none focus:ring-2 focus:ring-[var(--burnt-orange)]/30 focus:border-[var(--burnt-orange)]/50',
          'placeholder:text-muted-foreground/50'
        )}
      />
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={doSave}
          disabled={!text.trim()}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            text.trim()
              ? 'bg-[var(--burnt-orange)] text-white hover:bg-[var(--burnt-orange)]/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          Save
        </button>
      </div>
    </div>
  )
}
