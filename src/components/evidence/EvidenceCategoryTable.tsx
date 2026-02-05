'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DollarSign, Scale, Briefcase, Users, UserCheck, Cpu } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  financial: DollarSign,
  legal: Scale,
  operational: Briefcase,
  customers: Users,
  team: UserCheck,
  ipTech: Cpu,
}

const IMPACT_STYLES: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  important: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  moderate: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}

interface UploadedDoc {
  id: string
  name: string
  uploadedAt: string
  source: 'direct' | 'task' | 'integration'
  sourceLabel: string | null
  isStale: boolean
  staleReason: string | null
}

interface MissingDoc {
  id: string
  name: string
  buyerExplanation: string
  importance: 'required' | 'expected' | 'helpful'
}

interface EvidenceCategory {
  id: string
  label: string
  buyerImpact: 'critical' | 'important' | 'moderate'
  weight: number
  documentsUploaded: number
  documentsExpected: number
  percentage: number
  dots: number
  uploadedDocuments: UploadedDoc[]
  missingDocuments: MissingDoc[]
}

interface EvidenceCategoryTableProps {
  categories: EvidenceCategory[]
}

export function EvidenceCategoryTable({ categories }: EvidenceCategoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border/30 hidden md:grid grid-cols-[1fr_100px_100px_120px] gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Category</span>
        <span>Documents</span>
        <span>Status</span>
        <span>Buyer Impact</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/20">
        {categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat.id] ?? Briefcase
          const isExpanded = expandedId === cat.id

          return (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                className="w-full text-left px-4 py-4 grid grid-cols-1 md:grid-cols-[1fr_100px_100px_120px] gap-2 md:gap-4 items-center hover:bg-muted/20 cursor-pointer transition-colors"
              >
                {/* Category */}
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{cat.label}</span>
                </div>

                {/* Documents count */}
                <span className="text-sm text-muted-foreground">
                  {cat.documentsUploaded} of {cat.documentsExpected}
                </span>

                {/* Status dots */}
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground mr-1">{cat.percentage}%</span>
                  {[0, 1, 2, 3].map(i => (
                    <span
                      key={i}
                      className={cn(
                        'w-2 h-2 rounded-full',
                        i < cat.dots ? 'bg-[var(--burnt-orange)]' : 'bg-muted-foreground/20'
                      )}
                    />
                  ))}
                </div>

                {/* Buyer Impact */}
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full w-fit capitalize', IMPACT_STYLES[cat.buyerImpact])}>
                  {cat.buyerImpact}
                </span>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="bg-muted/10 p-6 border-t border-border/20">
                  {/* Uploaded documents */}
                  {cat.uploadedDocuments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                        UPLOADED
                      </p>
                      <div className="space-y-2">
                        {cat.uploadedDocuments.map(doc => (
                          <div key={doc.id} className="flex items-start justify-between py-2">
                            <div className="flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">&#x2713;</span>
                              <div>
                                <p className="text-sm text-foreground">{doc.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {doc.sourceLabel && ` · Source: ${doc.sourceLabel}`}
                                  {!doc.sourceLabel && doc.source === 'direct' && ' · Source: Direct upload'}
                                </p>
                                {doc.isStale && doc.staleReason && (
                                  <p className="text-xs text-amber-600 mt-0.5">
                                    &#x26A0; {doc.staleReason} &mdash; buyers expect current versions
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing documents */}
                  {cat.missingDocuments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                        MISSING
                      </p>
                      <div className="space-y-3">
                        {cat.missingDocuments.map(doc => (
                          <div key={doc.id} className="rounded-lg border border-border/30 p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-500">&#x26A0;</span>
                              <span className="text-sm font-medium text-foreground">{doc.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground italic mt-1.5 pl-6 leading-relaxed">
                              &ldquo;{doc.buyerExplanation}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
