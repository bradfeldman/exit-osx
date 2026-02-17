'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CategorySectionHeader } from './CategorySectionHeader'
import { DocumentSlotCard } from './DocumentSlotCard'
import { AddDocumentDialog } from './AddDocumentDialog'

interface DocumentSlot {
  expectedDocId: string
  slotName: string
  importance: 'required' | 'expected' | 'helpful' | 'custom'
  buyerExplanation: string
  sortOrder: number
  refreshCadence: string
  isFilled: boolean
  placeholderDocumentId?: string | null
  document: {
    id: string
    fileName: string
    fileSize: number | null
    mimeType: string | null
    uploadedAt: string
    uploadedByName: string | null
    source: 'direct' | 'task' | 'integration'
    sourceLabel: string | null
    freshnessState: 'fresh' | 'current' | 'due_soon' | 'overdue'
    nextUpdateDue: string | null
    version: number
    hasPreviousVersions: boolean
  } | null
  pendingRequest: null
  linkedActionItem: null
}

interface DocumentShelfProps {
  category: {
    id: string
    label: string
    buyerImpact: 'critical' | 'important' | 'moderate'
    documentsUploaded: number
    documentsExpected: number
    percentage: number
    documentSlots: DocumentSlot[]
  }
  isDetailMode: boolean
  onUploadSuccess?: () => void
  onViewDocument?: (docId: string) => void
  onDownloadDocument?: (docId: string) => void
}

export function DocumentShelf({
  category,
  isDetailMode,
  onUploadSuccess,
  onViewDocument,
  onDownloadDocument,
}: DocumentShelfProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  const sortedSlots = [...category.documentSlots].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )

  return (
    <div className="space-y-4">
      <CategorySectionHeader
        id={category.id}
        label={category.label}
        buyerImpact={category.buyerImpact}
        documentsUploaded={category.documentsUploaded}
        documentsExpected={category.documentsExpected}
        percentage={category.percentage}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedSlots.map((slot) => (
          <DocumentSlotCard
            key={slot.expectedDocId}
            slot={slot}
            categoryId={category.id}
            showBuyerExplanation={isDetailMode}
            onUploadSuccess={onUploadSuccess}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
          />
        ))}
      </div>

      {/* Add custom document */}
      <button
        type="button"
        onClick={() => setShowAddDialog(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto"
      >
        <Plus className="w-3.5 h-3.5" />
        Add a document to {category.label}
      </button>

      {showAddDialog && (
        <AddDocumentDialog
          evidenceCategory={category.id}
          categoryLabel={category.label}
          onSuccess={() => {
            setShowAddDialog(false)
            onUploadSuccess?.()
          }}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}
