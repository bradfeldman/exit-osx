'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { DiagnosisHeader } from './DiagnosisHeader'
import { CategoryPanel } from './CategoryPanel'
import { RiskDriversSection } from './RiskDriversSection'
import { DiagnosisLoading } from './DiagnosisLoading'
import { DiagnosisError } from './DiagnosisError'

interface CategoryData {
  category: string
  label: string
  score: number
  scoreDecimal: number
  dollarImpact: number | null
  weight: number
  confidence: {
    dots: number
    label: string
    questionsAnswered: number
    questionsTotal: number
    lastUpdated: string | null
    daysSinceUpdate: number | null
    isStale: boolean
  }
  isLowestConfidence: boolean
}

interface RiskDriver {
  id: string
  name: string
  category: string
  categoryLabel: string
  dollarImpact: number
  currentScore: number
  optionPosition: number
  totalOptions: number
  questionText: string
  buyerLogic: string | null
  hasLinkedTask: boolean
  linkedTaskId: string | null
  linkedTaskTitle: string | null
  linkedTaskStatus: string | null
}

interface DiagnosisData {
  briScore: number | null
  briScoreDecimal: number
  isEstimated: boolean
  categories: CategoryData[]
  riskDrivers: RiskDriver[]
  assessmentId: string | null
  hasAssessment: boolean
  lastAssessmentDate: string | null
  questionCounts: Record<string, { total: number; answered: number; unanswered: number }>
}

export function DiagnosisPage() {
  const { selectedCompanyId } = useCompany()
  const searchParams = useSearchParams()
  const [data, setData] = useState<DiagnosisData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [hasInitializedExpand, setHasInitializedExpand] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/diagnosis`)
      if (!response.ok) throw new Error('Failed to fetch diagnosis data')
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

  // Auto-expand category from URL query param (e.g., /dashboard/diagnosis?expand=FINANCIAL)
  useEffect(() => {
    if (!hasInitializedExpand && data && !isLoading) {
      const expandParam = searchParams.get('expand')
      if (expandParam) {
        // Validate it's a real category
        const validCategory = data.categories.find(c => c.category === expandParam)
        if (validCategory) {
          setExpandedCategory(expandParam)
        }
      }
      setHasInitializedExpand(true)
    }
  }, [searchParams, data, isLoading, hasInitializedExpand])

  // Callback for when an inline assessment completes - refetch all data
  const handleAssessmentComplete = useCallback(() => {
    setExpandedCategory(null)
    fetchData()
  }, [fetchData])

  // Callback to expand a specific category (used by risk driver "Review & Update" buttons)
  const handleExpandCategory = useCallback((category: string) => {
    setExpandedCategory(category)
  }, [])

  if (isLoading) return <DiagnosisLoading />
  if (error || !data) return <DiagnosisError onRetry={fetchData} />

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnimatedStagger className="space-y-8" staggerDelay={0.1}>
        {/* Page Header */}
        <AnimatedItem>
          <DiagnosisHeader
            briScore={data.briScore}
            isEstimated={data.isEstimated}
          />
        </AnimatedItem>

        {/* Category Grid */}
        <AnimatedItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.categories.map(cat => (
              <CategoryPanel
                key={cat.category}
                category={cat.category}
                label={cat.label}
                score={cat.score}
                dollarImpact={cat.dollarImpact}
                confidence={cat.confidence}
                isLowestConfidence={cat.isLowestConfidence}
                assessmentId={data.assessmentId}
                companyId={selectedCompanyId}
                onAssessmentComplete={handleAssessmentComplete}
                isExpanded={expandedCategory === cat.category}
                onExpand={() => setExpandedCategory(cat.category)}
                onCollapse={() => setExpandedCategory(null)}
              />
            ))}
          </div>
        </AnimatedItem>

        {/* Risk Drivers */}
        <AnimatedItem>
          <RiskDriversSection
            riskDrivers={data.riskDrivers}
            hasAssessment={data.hasAssessment}
            onExpandCategory={handleExpandCategory}
          />
        </AnimatedItem>
      </AnimatedStagger>
    </div>
  )
}
