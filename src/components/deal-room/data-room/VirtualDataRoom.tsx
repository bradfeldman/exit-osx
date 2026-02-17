'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Loader2, LayoutGrid, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DATA_ROOM_COLUMNS } from '@/lib/deal-room/data-room-stages'
import { DataRoomColumn } from './DataRoomColumn'
import { ProspectAccessPanel } from './ProspectAccessPanel'
import type { DataRoomDoc } from './DataRoomDocCard'

type DataRoomSubTab = 'stage-view' | 'prospect-access'

export function VirtualDataRoom() {
  const { selectedCompanyId } = useCompany()
  const [documents, setDocuments] = useState<DataRoomDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<DataRoomSubTab>('stage-view')

  const fetchDocuments = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(false)

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/data-room`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setDocuments(
        (json.documents || []).map((d: Record<string, unknown>) => ({
          id: d.id as string,
          documentName: d.documentName as string,
          category: d.category as DataRoomDoc['category'],
          fileName: d.fileName as string | null,
          fileUrl: d.fileUrl as string | null,
          dataRoomStage: (d.dataRoomStage as string) || null,
        }))
      )
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Group documents by column
  const columnDocs = useMemo(() => {
    const groups: Record<string, DataRoomDoc[]> = {}
    for (const col of DATA_ROOM_COLUMNS) {
      groups[col.id] = []
    }
    for (const doc of documents) {
      const key = doc.dataRoomStage || 'UNASSIGNED'
      if (groups[key]) {
        groups[key].push(doc)
      } else {
        // Fallback: put in unassigned if stage is unknown
        groups['UNASSIGNED'].push(doc)
      }
    }
    return groups
  }, [documents])

  // Handle drop: optimistic update + PATCH
  const handleDrop = useCallback(
    async (docId: string, targetColumnId: string) => {
      if (!selectedCompanyId) return

      const col = DATA_ROOM_COLUMNS.find((c) => c.id === targetColumnId)
      if (!col) return

      const newStage = col.dbValue // null for UNASSIGNED

      // Find the document
      const doc = documents.find((d) => d.id === docId)
      if (!doc) return

      // Skip if already in same column
      const currentStage = doc.dataRoomStage || null
      if (currentStage === newStage) return

      // Optimistic update
      const previousDocs = [...documents]
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, dataRoomStage: newStage } : d
        )
      )

      try {
        const res = await fetch(
          `/api/companies/${selectedCompanyId}/data-room/${docId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataRoomStage: newStage }),
          }
        )

        if (!res.ok) throw new Error('Failed to update')
        toast.success(`Moved to ${col.label}`)
      } catch {
        // Rollback
        setDocuments(previousDocs)
        toast.error('Failed to move document. Please try again.')
      }
    },
    [selectedCompanyId, documents]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!selectedCompanyId || error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Failed to load virtual data room.
        </p>
        <Button variant="ghost" size="sm" onClick={fetchDocuments} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  const subTabs: { id: DataRoomSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'stage-view', label: 'Stage View', icon: LayoutGrid },
    { id: 'prospect-access', label: 'Prospect Access', icon: Users },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          DATA ROOM
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage which documents prospects can see — by deal stage or individually per prospect.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-0">
        {subTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 pb-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                subTab === tab.id
                  ? 'text-foreground border-[var(--burnt-orange)]'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      {subTab === 'stage-view' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Drag documents between stages to control buyer access. Documents are visible at their assigned stage and all later stages.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {DATA_ROOM_COLUMNS.map((col) => (
              <DataRoomColumn
                key={col.id}
                columnId={col.id}
                label={col.label}
                docs={columnDocs[col.id] || []}
                draggedDocId={draggedDocId}
                onDragStart={setDraggedDocId}
                onDragEnd={() => setDraggedDocId(null)}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}

      {subTab === 'prospect-access' && selectedCompanyId && (
        <ProspectAccessPanel
          companyId={selectedCompanyId}
          documents={documents}
        />
      )}
    </div>
  )
}
