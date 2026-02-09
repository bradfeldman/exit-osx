'use client'

import { useState } from 'react'
import { EvidenceUploadDialog } from './EvidenceUploadDialog'
import { MissingDocumentCard } from './MissingDocumentCard'

interface MissingDoc {
  id: string
  name: string
  category: string
  categoryLabel: string
  buyerExplanation: string
  importance: 'required' | 'expected' | 'helpful'
}

interface MissingDocumentsSectionProps {
  documents: MissingDoc[]
  totalMissing: number
  onUploadSuccess?: () => void
}

export function MissingDocumentsSection({ documents, totalMissing, onUploadSuccess }: MissingDocumentsSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState<MissingDoc | null>(null)
  const visible = showAll ? documents : documents.slice(0, 4)

  return (
    <div>
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap">
          MISSING (HIGHEST IMPACT FIRST)
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Missing items */}
      <div className="mt-4 space-y-4">
        {visible.map(doc => (
          <MissingDocumentCard
            key={doc.id}
            id={doc.id}
            name={doc.name}
            category={doc.category}
            buyerExplanation={doc.buyerExplanation}
            importance={doc.importance}
            categoryLabel={doc.categoryLabel}
            onUploadSuccess={onUploadSuccess}
            onUploadClick={() => setUploadingDoc(doc)}
          />
        ))}
      </div>

      {/* Show all link */}
      {totalMissing > 4 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Showing {visible.length} of {totalMissing} missing · View all missing documents
        </button>
      )}

      {/* Upload Dialog (fallback for click-to-upload) */}
      {uploadingDoc && (
        <EvidenceUploadDialog
          documentName={uploadingDoc.name}
          evidenceCategory={uploadingDoc.category}
          expectedDocumentId={uploadingDoc.id}
          onSuccess={() => {
            setUploadingDoc(null)
            onUploadSuccess?.()
          }}
          onClose={() => setUploadingDoc(null)}
        />
      )}
    </div>
  )
}
