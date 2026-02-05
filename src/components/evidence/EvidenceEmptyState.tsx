'use client'

import { FileCheck } from 'lucide-react'

export function EvidenceEmptyState() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <FileCheck className="w-12 h-12 text-muted-foreground/40" />
      <h2 className="text-lg font-semibold text-foreground mt-4">
        Build your buyer-ready evidence
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg">
        Buyers evaluate six categories of evidence during due diligence.
        Start with the documents you already have.
      </p>
    </div>
  )
}
