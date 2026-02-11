'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import {
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// --- Types ---

interface UploadedDoc {
  id: string
  name: string
  uploadedAt: string
  mimeType: string | null
  fileSize: number | null
  matchedExpectedId: string | null
  evidenceCategory: string
  evidenceCategoryLabel: string
  // Owner-only fields (absent in buyer preview)
  source?: 'direct' | 'task' | 'integration'
  sourceLabel?: string | null
  isStale?: boolean
  staleReason?: string | null
  version?: number
}

interface MissingDoc {
  id: string
  name: string
  buyerExplanation: string
  importance: 'required' | 'expected' | 'helpful'
  evidenceCategory: string
  evidenceCategoryLabel: string
}

interface DiligenceSection {
  id: string
  label: string
  description: string
  sortOrder: number
  evidenceCategories: string[]
  completeness: number
  documentsUploaded: number
  documentsExpected: number
  uploadedDocuments: UploadedDoc[]
  missingDocuments: MissingDoc[]
}

interface DiligenceData {
  isBuyerPreview: boolean
  overallCompleteness: number
  evidenceScore: number
  totalDocuments: number
  totalExpected: number
  sections: DiligenceSection[]
}

// --- Completeness Bar ---

function CompletenessBar({ percentage }: { percentage: number }) {
  const color =
    percentage >= 80 ? 'bg-emerald-500'
    : percentage >= 50 ? 'bg-amber-500'
    : percentage > 0 ? 'bg-rose-400'
    : 'bg-muted-foreground/20'

  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// --- Section Row ---

function SectionRow({
  section,
  isExpanded,
  onToggle,
  isBuyerPreview,
  companyId,
}: {
  section: DiligenceSection
  isExpanded: boolean
  onToggle: () => void
  isBuyerPreview: boolean
  companyId: string
}) {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  const statusIcon = section.completeness === 100
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
    : section.completeness > 0
    ? <FileText className="w-4 h-4 text-amber-500 shrink-0" />
    : <AlertTriangle className="w-4 h-4 text-muted-foreground/40 shrink-0" />

  const handleViewDocument = (docId: string) => {
    window.open(`/api/companies/${companyId}/evidence/documents/${docId}/view`, '_blank')
  }

  return (
    <div className="border-b border-border/20 last:border-b-0">
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer"
      >
        <ChevronIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {section.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {section.documentsUploaded} of {section.documentsExpected} docs
            </span>
          </div>
          <div className="mt-1.5 max-w-[300px]">
            <CompletenessBar percentage={section.completeness} />
          </div>
        </div>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums shrink-0">
          {section.completeness}%
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 ml-11 space-y-4">
          {/* Description */}
          <p className="text-xs text-muted-foreground">
            {section.description}
          </p>

          {/* Uploaded documents */}
          {section.uploadedDocuments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                UPLOADED
              </p>
              <div className="space-y-1">
                {section.uploadedDocuments.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleViewDocument(doc.id)}
                    className="w-full text-left flex items-start justify-between py-2 px-2 -mx-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {!isBuyerPreview && doc.sourceLabel && (
                            <span className="text-[11px] text-muted-foreground">
                              {doc.sourceLabel}
                            </span>
                          )}
                          {!isBuyerPreview && doc.isStale && doc.staleReason && (
                            <span className="text-[11px] text-amber-600">
                              {doc.staleReason}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                            {doc.evidenceCategoryLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Missing documents (owner view only) */}
          {!isBuyerPreview && section.missingDocuments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                STILL NEEDED
              </p>
              <div className="space-y-2">
                {section.missingDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-2 py-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{doc.name}</span>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize',
                          doc.importance === 'required'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            : doc.importance === 'expected'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                        )}>
                          {doc.importance}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-0.5 leading-relaxed">
                        &ldquo;{doc.buyerExplanation}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {section.uploadedDocuments.length === 0 && (isBuyerPreview || section.missingDocuments.length === 0) && (
            <p className="text-sm text-muted-foreground italic">
              {isBuyerPreview ? 'No documents in this section yet.' : 'No documents uploaded yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main Component ---

export function DiligenceDataRoom() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<DiligenceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isBuyerPreview, setIsBuyerPreview] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(false)

    try {
      const url = `/api/companies/${selectedCompanyId}/deal-room/diligence${isBuyerPreview ? '?buyerPreview=true' : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, isBuyerPreview])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Failed to load data room.</p>
        <Button variant="ghost" size="sm" onClick={fetchData} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with buyer preview toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            DATA ROOM
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {data.totalDocuments} documents across 5 diligence sections
          </p>
        </div>
        <Button
          variant={isBuyerPreview ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsBuyerPreview(!isBuyerPreview)}
          className="gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          {isBuyerPreview ? 'Exit Preview' : 'Buyer Preview'}
        </Button>
      </div>

      {/* Buyer preview banner */}
      {isBuyerPreview && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium text-primary">
            Buyer Preview Mode
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This is how a buyer would see your data room. Missing documents and internal notes are hidden.
          </p>
        </div>
      )}

      {/* Overall completeness */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Overall Diligence Readiness
          </span>
          <span className="text-lg font-bold text-[var(--burnt-orange)]">
            {data.overallCompleteness}%
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              data.overallCompleteness >= 80 ? 'bg-emerald-500'
              : data.overallCompleteness >= 50 ? 'bg-amber-500'
              : 'bg-rose-400'
            )}
            style={{ width: `${data.overallCompleteness}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{data.totalDocuments} documents uploaded</span>
          <span>{data.totalExpected} expected for full diligence</span>
        </div>
      </div>

      {/* Section completeness summary */}
      <div className="grid grid-cols-5 gap-2">
        {data.sections.map(section => (
          <button
            key={section.id}
            type="button"
            onClick={() => {
              const isExpanded = expandedSections.has(section.id)
              if (!isExpanded) {
                setExpandedSections(prev => new Set([...prev, section.id]))
              }
              // Scroll to section
              const el = document.getElementById(`diligence-section-${section.id}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }}
            className="rounded-lg border border-border/50 bg-card p-3 text-center hover:bg-muted/20 transition-colors cursor-pointer"
          >
            <p className="text-lg font-bold text-foreground tabular-nums">
              {section.completeness}%
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {section.label}
            </p>
            <div className="mt-2">
              <CompletenessBar percentage={section.completeness} />
            </div>
          </button>
        ))}
      </div>

      {/* Sections list */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {data.sections.map(section => (
          <div key={section.id} id={`diligence-section-${section.id}`}>
            <SectionRow
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              isBuyerPreview={isBuyerPreview}
              companyId={selectedCompanyId}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
