'use client'

import { Check } from 'lucide-react'

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
          <div
            key={doc.id}
            className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/20 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-muted-foreground">
                {doc.name}
                {doc.source === 'integration' && ' (auto-synced)'}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              <span className="text-xs text-muted-foreground">{doc.categoryLabel}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(doc.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-muted-foreground">
        &#x2713; {documents.length} documents added this month
      </p>
    </div>
  )
}
