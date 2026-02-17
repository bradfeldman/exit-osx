'use client'

import { useState } from 'react'
import { DataRoomDocCard, type DataRoomDoc } from './DataRoomDocCard'

interface DataRoomColumnProps {
  columnId: string
  label: string
  docs: DataRoomDoc[]
  draggedDocId: string | null
  onDragStart: (docId: string) => void
  onDragEnd: () => void
  onDrop: (docId: string, columnId: string) => void
}

export function DataRoomColumn({
  columnId,
  label,
  docs,
  draggedDocId,
  onDragStart,
  onDragEnd,
  onDrop,
}: DataRoomColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const docId = e.dataTransfer.getData('text/plain')
    if (docId) {
      onDrop(docId, columnId)
    }
  }

  return (
    <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {docs.length}
        </span>
      </div>

      <div
        className={`flex-1 min-h-[300px] rounded-lg border p-2 space-y-1.5 transition-all
          ${isDragOver
            ? 'bg-[var(--burnt-orange)]/10 border-[var(--burnt-orange)] border-2'
            : 'bg-muted/20 border-border/20'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label={`${label} column`}
      >
        {docs.map(doc => (
          <DataRoomDocCard
            key={doc.id}
            doc={doc}
            isDragging={draggedDocId === doc.id}
            onDragStart={() => onDragStart(doc.id)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  )
}
