'use client'

import { useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'
import { EvidenceUploadDialog } from './EvidenceUploadDialog'

interface MissingDoc {
  id: string
  name: string
  category: string
  categoryLabel: string
  buyerExplanation: string
  importance: 'required' | 'expected'
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
          <div key={doc.id} className="rounded-lg border border-border/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-foreground">{doc.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{doc.categoryLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground italic leading-relaxed mt-2 pl-6">
              &ldquo;{doc.buyerExplanation}&rdquo;
            </p>
            <div className="mt-3 pl-6">
              <button
                type="button"
                onClick={() => setUploadingDoc(doc)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--burnt-orange)] hover:underline"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload {doc.name}
              </button>
            </div>
          </div>
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

      {/* Upload Dialog */}
      {uploadingDoc && (
        <EvidenceUploadDialog
          documentName={uploadingDoc.name}
          evidenceCategory={uploadingDoc.category}
          expectedDocumentId={uploadingDoc.id}
          onSuccess={() => onUploadSuccess?.()}
          onClose={() => setUploadingDoc(null)}
        />
      )}
    </div>
  )
}
