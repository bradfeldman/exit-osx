'use client'

import { useState, useCallback } from 'react'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
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
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)

  const handleViewDocument = useCallback(async (docId: string) => {
    if (!selectedCompanyId || viewingDocId) return
    setViewingDocId(docId)

    // Open window synchronously to avoid popup blocker
    const win = window.open('about:blank', '_blank')

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/evidence/documents/${docId}/view`)
      if (!response.ok) {
        win?.close()
        throw new Error('Failed to fetch document')
      }

      const contentType = response.headers.get('Content-Type')

      if (contentType === 'application/pdf') {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        if (win) win.location.href = url
        else window.open(url, '_blank')
      } else {
        const data = await response.json()
        if (data.url) {
          if (win) win.location.href = data.url
          else window.open(data.url, '_blank')
        } else {
          win?.close()
        }
      }
    } catch (err) {
      console.error('Error viewing document:', err)
      win?.close()
    } finally {
      setViewingDocId(null)
    }
  }, [selectedCompanyId, viewingDocId])

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
            disabled={viewingDocId === doc.id}
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
              {viewingDocId === doc.id ? (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
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
