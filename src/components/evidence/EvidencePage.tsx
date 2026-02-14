'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { HeroEvidenceBar } from './HeroEvidenceBar'
import { EvidenceCategoryTable } from './EvidenceCategoryTable'
import { MissingDocumentsSection } from './MissingDocumentsSection'
import { RecentlyAddedSection } from './RecentlyAddedSection'
import { DealRoomTeaser } from './DealRoomTeaser'
import { EvidenceLoading } from './EvidenceLoading'
import { EvidenceError } from './EvidenceError'
import { EvidenceEmptyState } from './EvidenceEmptyState'

interface UploadedDoc {
  id: string
  name: string
  uploadedAt: string
  source: 'direct' | 'task' | 'integration'
  sourceLabel: string | null
  isStale: boolean
  staleReason: string | null
  mimeType: string | null
  fileSize: number | null
  version: number
  matchedExpectedId: string | null
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

interface TopMissing {
  id: string
  name: string
  category: string
  categoryLabel: string
  buyerExplanation: string
  importance: 'required' | 'expected' | 'helpful'
}

interface RecentDoc {
  id: string
  name: string
  category: string
  categoryLabel: string
  addedAt: string
  source: 'direct' | 'task' | 'integration'
}

interface EvidenceData {
  score: {
    percentage: number
    label: string
    documentsUploaded: number
    documentsExpected: number
    lastUploadAt: string | null
  }
  categories: EvidenceCategory[]
  topMissing: TopMissing[]
  totalMissing: number
  recentlyAdded: RecentDoc[]
  dealRoom: {
    eligible: boolean
    scoreReady: boolean
    canActivate: boolean
    isActivated: boolean
    documentsToUnlock: number | null
  }
}

export function EvidencePage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<EvidenceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/evidence`)
      if (!response.ok) throw new Error('Failed to fetch evidence data')
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) return <EvidenceLoading />
  if (error || !data) return <EvidenceError onRetry={fetchData} />

  const isEmpty = data.score.documentsUploaded === 0
  const showGuidance = data.score.percentage < 50

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8">
      <AnimatedStagger className="space-y-8" staggerDelay={0.1}>
        <AnimatedItem>
          <HeroEvidenceBar
            percentage={data.score.percentage}
            documentsUploaded={data.score.documentsUploaded}
            documentsExpected={data.score.documentsExpected}
            lastUploadAt={data.score.lastUploadAt}
          />
        </AnimatedItem>

        {/* Contextual guidance (BF-009) — shows when evidence is low */}
        {showGuidance && (
          <AnimatedItem>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Why build your evidence?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-0.5">Higher Valuation</p>
                  <p className="text-xs">Well-documented businesses sell for 20-30% more. Buyers pay a premium for transparency.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-0.5">Faster Deal Close</p>
                  <p className="text-xs">Pre-organized evidence can cut due diligence time in half, keeping deal momentum alive.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-0.5">Fewer Deal Killers</p>
                  <p className="text-xs">Missing documents are the #1 reason deals fall through. Get ahead of it now.</p>
                </div>
              </div>
              {isEmpty && (
                <p className="text-xs text-muted-foreground mt-4 border-t border-primary/10 pt-3">
                  Start with <span className="font-medium text-foreground">Financial</span> documents (tax returns, P&amp;L) &mdash; buyers request these in every deal. Then work through each category below.
                </p>
              )}
            </div>
          </AnimatedItem>
        )}

        {isEmpty ? (
          <AnimatedItem>
            <EvidenceEmptyState onUploadSuccess={fetchData} />
          </AnimatedItem>
        ) : (
          <>
            <AnimatedItem>
              <EvidenceCategoryTable categories={data.categories} onUploadSuccess={fetchData} />
            </AnimatedItem>

            {data.topMissing.length > 0 && (
              <AnimatedItem>
                <MissingDocumentsSection
                  documents={data.topMissing}
                  totalMissing={data.totalMissing}
                  onUploadSuccess={fetchData}
                />
              </AnimatedItem>
            )}

            {data.recentlyAdded.length > 0 && (
              <AnimatedItem>
                <RecentlyAddedSection documents={data.recentlyAdded} />
              </AnimatedItem>
            )}

            {data.dealRoom.eligible && data.score.percentage >= 60 && (
              <AnimatedItem>
                <DealRoomTeaser
                  percentage={data.score.percentage}
                  canActivate={data.dealRoom.canActivate}
                  isActivated={data.dealRoom.isActivated}
                  documentsToUnlock={data.dealRoom.documentsToUnlock}
                />
              </AnimatedItem>
            )}
          </>
        )}
      </AnimatedStagger>
    </div>
  )
}
