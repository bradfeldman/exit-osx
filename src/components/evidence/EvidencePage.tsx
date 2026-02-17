'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { ReadinessHeader } from './ReadinessHeader'
import { CategoryNav } from './CategoryNav'
import { DocumentShelf } from './DocumentShelf'
import { DealRoomTeaser } from './DealRoomTeaser'
import { EvidenceLoading } from './EvidenceLoading'
import { EvidenceError } from './EvidenceError'
import type { RefreshCadence } from '@/lib/evidence/expected-documents'

interface DocumentSlot {
  expectedDocId: string
  slotName: string
  importance: 'required' | 'expected' | 'helpful' | 'custom'
  buyerExplanation: string
  sortOrder: number
  refreshCadence: RefreshCadence
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

interface EvidenceCategory {
  id: string
  label: string
  buyerImpact: 'critical' | 'important' | 'moderate'
  weight: number
  documentsUploaded: number
  documentsExpected: number
  percentage: number
  documentSlots: DocumentSlot[]
}

interface EvidenceData {
  score: {
    percentage: number
    label: string
    documentsUploaded: number
    documentsExpected: number
    lastUploadAt: string | null
    staleCount: number
    dueSoonCount: number
  }
  categories: EvidenceCategory[]
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<EvidenceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // URL-synced tab state
  const activeTab = searchParams.get('tab') || 'all'

  const setActiveTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

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

  const showGuidance = data.score.percentage < 25
  const isDetailMode = activeTab !== 'all'
  const filteredCategories = isDetailMode
    ? data.categories.filter(c => c.id === activeTab)
    : data.categories

  const handleViewDocument = (docId: string) => {
    if (!selectedCompanyId) return
    window.open(`/api/companies/${selectedCompanyId}/evidence/documents/${docId}/view`, '_blank')
  }

  const handleDownloadDocument = (docId: string) => {
    if (!selectedCompanyId) return
    window.open(`/api/companies/${selectedCompanyId}/evidence/documents/${docId}/view?download=1`, '_blank')
  }

  return (
    <div className="max-w-[960px] mx-auto sm:px-2 py-2 sm:py-8">
      <AnimatedStagger className="space-y-4 sm:space-y-6" staggerDelay={0.1}>
        {/* Readiness Header */}
        <AnimatedItem>
          <ReadinessHeader
            percentage={data.score.percentage}
            documentsUploaded={data.score.documentsUploaded}
            documentsExpected={data.score.documentsExpected}
            lastUploadAt={data.score.lastUploadAt}
            staleCount={data.score.staleCount}
            dueSoonCount={data.score.dueSoonCount}
            categories={data.categories.map(c => ({
              id: c.id,
              label: c.label,
              documentsUploaded: c.documentsUploaded,
              documentsExpected: c.documentsExpected,
              percentage: c.percentage,
            }))}
          />
        </AnimatedItem>

        {/* Guidance card — only when < 25% complete */}
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
              {data.score.documentsUploaded === 0 && (
                <p className="text-xs text-muted-foreground mt-4 border-t border-primary/10 pt-3">
                  Start with <span className="font-medium text-foreground">Financial</span> documents &mdash; buyers request these in every deal.
                </p>
              )}
            </div>
          </AnimatedItem>
        )}

        {/* Category Navigation */}
        <AnimatedItem>
          <CategoryNav
            categories={data.categories.map(c => ({
              id: c.id,
              label: c.label,
              documentsUploaded: c.documentsUploaded,
              documentsExpected: c.documentsExpected,
            }))}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </AnimatedItem>

        {/* Document Shelves */}
        {filteredCategories.map(category => (
          <AnimatedItem key={category.id}>
            <DocumentShelf
              category={category}
              isDetailMode={isDetailMode}
              onUploadSuccess={fetchData}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
            />
          </AnimatedItem>
        ))}

        {/* Deal Room Teaser */}
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
      </AnimatedStagger>
    </div>
  )
}
