'use client'

import { Check, ExternalLink } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'

interface RecentDoc {
  id: string
  name: string
  category: string
  categoryLabel: string
  addedAt: string
  source: 'direct' | 'task' | 'integration'
}

interface RecentlyAddedSectionProps {
  documents: RecentDoc[]
}

export function RecentlyAddedSection({ documents }: RecentlyAddedSectionProps) {
  const { selectedCompanyId } = useCompany()

  const handleViewDocument = (docId: string) => {
    if (!selectedCompanyId) return
    window.open(`/api/companies/${selectedCompanyId}/evidence/documents/${docId}/view`, '_blank')
  }

  if (documents.length === 0) return null

  return (
    <div>
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap">
          RECENTLY ADDED
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Rows */}
      <div className="mt-3 space-y-1">
        {documents.map(doc => (
          <button
            key={doc.id}
            type="button"
            onClick={() => handleViewDocument(doc.id)}
            className="w-full text-left flex items-center justify-between py-2 px-2 rounded hover:bg-muted/20 cursor-pointer group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {doc.name}
              </span>
              <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                {doc.source === 'direct' ? 'Direct upload' : doc.source === 'task' ? 'From task' : 'Auto-synced'}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              <span className="text-xs text-muted-foreground">{doc.categoryLabel}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(doc.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-muted-foreground">
        &#x2713; {documents.length} documents added this month
      </p>
    </div>
  )
}
