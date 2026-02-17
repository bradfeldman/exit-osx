'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { EbitdaBridgeChart, buildWaterfallData, type WaterfallItem } from './EbitdaBridgeChart'
import { BridgeSuggestionCard } from './BridgeSuggestionCard'
import type { BridgeAnalysis, AdjustmentReview } from '@/lib/ai/ebitda-bridge'

interface Adjustment {
  id: string
  description: string
  amount: number
  type: string
  category: string | null
  aiSuggested: boolean
}

interface IncomeStatement {
  ebitda: number
  grossRevenue: number
}

interface Period {
  id: string
  fiscalYear: number
  periodType: string
  incomeStatement?: IncomeStatement | null
}

interface CompanyData {
  ownerCompensation: number
  annualRevenue: number
  annualEbitda: number
  coreFactors?: { revenueSizeCategory: string } | null
}

interface EbitdaBridgePanelProps {
  companyId: string
}

// Market salary benchmarks (matching recalculate-snapshot.ts)
const MARKET_SALARY_BY_REVENUE: Record<string, number> = {
  UNDER_500K: 80000,
  FROM_500K_TO_1M: 120000,
  FROM_1M_TO_3M: 150000,
  FROM_3M_TO_10M: 200000,
  FROM_10M_TO_25M: 300000,
  OVER_25M: 400000,
}

const CATEGORY_LABELS: Record<string, string> = {
  OWNER_COMPENSATION: 'Owner Comp',
  PERSONAL_EXPENSES: 'Personal',
  ONE_TIME_CHARGES: 'One-Time',
  RELATED_PARTY: 'Related Party',
  NON_OPERATING: 'Non-Operating',
  DISCRETIONARY: 'Discretionary',
  OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  OWNER_COMPENSATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PERSONAL_EXPENSES: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ONE_TIME_CHARGES: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  RELATED_PARTY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  NON_OPERATING: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  DISCRETIONARY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
}

export function EbitdaBridgePanel({ companyId }: EbitdaBridgePanelProps) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [latestEbitda, setLatestEbitda] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [analysis, setAnalysis] = useState<BridgeAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [aiExpanded, setAiExpanded] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set())

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [companyRes, adjRes, periodsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}`),
        fetch(`/api/companies/${companyId}/adjustments`),
        fetch(`/api/companies/${companyId}/financial-periods`),
      ])

      if (companyRes.ok) {
        const data = await companyRes.json()
        setCompany({
          ownerCompensation: Number(data.company?.ownerCompensation || 0),
          annualRevenue: Number(data.company?.annualRevenue || 0),
          annualEbitda: Number(data.company?.annualEbitda || 0),
          coreFactors: data.company?.coreFactors || null,
        })
      }

      if (adjRes.ok) {
        const data = await adjRes.json()
        setAdjustments(
          (data.adjustments || []).map((a: Record<string, unknown>) => ({
            id: a.id as string,
            description: a.description as string,
            amount: Number(a.amount),
            type: a.type as string,
            category: (a.category as string) || null,
            aiSuggested: Boolean(a.aiSuggested),
          }))
        )
      }

      if (periodsRes.ok) {
        const data = await periodsRes.json()
        const periods: Period[] = data.periods || []
        // Find the most recent annual period with an income statement
        const annualPeriods = periods
          .filter((p) => p.periodType === 'ANNUAL' && p.incomeStatement)
          .sort((a, b) => b.fiscalYear - a.fiscalYear)
        if (annualPeriods.length > 0 && annualPeriods[0].incomeStatement) {
          setLatestEbitda(Number(annualPeriods[0].incomeStatement.ebitda))
        }
      }
    } catch (err) {
      console.error('Error loading bridge data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Compute waterfall chart data
  const marketSalary = company?.coreFactors?.revenueSizeCategory
    ? MARKET_SALARY_BY_REVENUE[company.coreFactors.revenueSizeCategory] || 150000
    : 150000
  const ownerCompAdjustment = Math.max(0, (company?.ownerCompensation || 0) - marketSalary)

  // Use the latest income statement EBITDA, or fall back to company.annualEbitda
  const reportedEbitda = latestEbitda || company?.annualEbitda || 0

  const waterfallItems: WaterfallItem[] = reportedEbitda
    ? buildWaterfallData(reportedEbitda, ownerCompAdjustment, adjustments)
    : []

  // Calculate totals for summary row
  const totalAddBacks = adjustments
    .filter((a) => a.type === 'ADD_BACK')
    .reduce((sum, a) => sum + a.amount, 0)
  const totalDeductions = adjustments
    .filter((a) => a.type === 'DEDUCTION')
    .reduce((sum, a) => sum + a.amount, 0)
  const adjustedEbitda = reportedEbitda + ownerCompAdjustment + totalAddBacks - totalDeductions

  // AI analysis
  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalyzeError(null)
    setDismissedSuggestions(new Set())

    try {
      const res = await fetch(`/api/companies/${companyId}/ebitda-bridge`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate analysis')
      }
      setAnalysis(data.analysis)
      setAiExpanded(true)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Accept a suggestion
  const handleAcceptSuggestion = async (index: number, amount: number) => {
    if (!analysis) return
    const suggestion = analysis.suggestedAdjustments[index]
    setAcceptingId(`suggestion-${index}`)

    try {
      const res = await fetch(`/api/companies/${companyId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: suggestion.description,
          amount,
          type: suggestion.type,
          category: suggestion.category,
          aiSuggested: true,
        }),
      })

      if (res.ok) {
        // Remove from suggestions, refetch adjustments
        setDismissedSuggestions((prev) => new Set([...prev, index]))
        await loadData()
      }
    } catch (err) {
      console.error('Error accepting suggestion:', err)
    } finally {
      setAcceptingId(null)
    }
  }

  // Dismiss a suggestion
  const handleDismissSuggestion = (index: number) => {
    setDismissedSuggestions((prev) => new Set([...prev, index]))
  }

  const visibleSuggestions =
    analysis?.suggestedAdjustments.filter((_, i) => !dismissedSuggestions.has(i)) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!reportedEbitda && !company?.annualEbitda) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No Financial Data Yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Enter your income statement in the P&L tab to see the EBITDA bridge chart and get AI-powered adjustment suggestions.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Waterfall Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">EBITDA Bridge</CardTitle>
        </CardHeader>
        <CardContent>
          <EbitdaBridgeChart items={waterfallItems} />

          {/* Summary row */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Reported: </span>
                <span className="font-medium">{formatCurrency(reportedEbitda)}</span>
              </div>
              {ownerCompAdjustment > 0 && (
                <div>
                  <span className="text-muted-foreground">+ Owner Comp: </span>
                  <span className="font-medium text-green-600">{formatCurrency(ownerCompAdjustment)}</span>
                </div>
              )}
              {totalAddBacks > 0 && (
                <div>
                  <span className="text-muted-foreground">+ Add-Backs: </span>
                  <span className="font-medium text-green-600">{formatCurrency(totalAddBacks)}</span>
                </div>
              )}
              {totalDeductions > 0 && (
                <div>
                  <span className="text-muted-foreground">- Deductions: </span>
                  <span className="font-medium text-red-600">{formatCurrency(totalDeductions)}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-muted-foreground text-sm">Adjusted: </span>
              <span className="text-lg font-semibold">{formatCurrency(adjustedEbitda)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              {analysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiExpanded(!aiExpanded)}
                >
                  {aiExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
              <Button
                size="sm"
                variant={analysis ? 'outline' : 'default'}
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Analyzing...
                  </>
                ) : analysis ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Re-analyze
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {analyzeError && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {analyzeError}
            </div>
          </CardContent>
        )}

        {analysis && aiExpanded && (
          <CardContent className="space-y-6">
            {/* Buyer Narrative */}
            {analysis.buyerNarrative && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Buyer Perspective
                </p>
                <blockquote className="text-sm text-foreground italic leading-relaxed">
                  &ldquo;{analysis.buyerNarrative}&rdquo;
                </blockquote>
              </div>
            )}

            {/* Margin Benchmark */}
            {analysis.marginBenchmark && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Margin Benchmark
                </p>
                <MarginBar benchmark={analysis.marginBenchmark} />
              </div>
            )}

            {/* Suggested Adjustments */}
            {visibleSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Suggested Adjustments ({visibleSuggestions.length})
                </p>
                <div className="space-y-3">
                  {analysis.suggestedAdjustments.map((suggestion, index) => {
                    if (dismissedSuggestions.has(index)) return null
                    return (
                      <BridgeSuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onAccept={(amount) => handleAcceptSuggestion(index, amount)}
                        onDismiss={() => handleDismissSuggestion(index)}
                        isAccepting={acceptingId === `suggestion-${index}`}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Existing Adjustment Review */}
            {analysis.existingReview.length > 0 && adjustments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Existing Adjustment Review
                </p>
                <div className="space-y-2">
                  {analysis.existingReview.map((review) => (
                    <ExistingReviewRow
                      key={review.adjustmentId}
                      review={review}
                      adjustment={adjustments.find((a) => a.id === review.adjustmentId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────

function MarginBar({
  benchmark,
}: {
  benchmark: BridgeAnalysis['marginBenchmark']
}) {
  const { industryLow, industryHigh, companyReported, companyAdjusted } = benchmark

  if (industryLow === null || industryHigh === null) {
    return (
      <div className="text-sm text-muted-foreground">
        Industry margin benchmarks not available for this sector.
        <br />
        <span className="text-foreground">
          Reported margin: {(companyReported * 100).toFixed(1)}%
          {companyAdjusted !== companyReported && (
            <> &rarr; Adjusted: {(companyAdjusted * 100).toFixed(1)}%</>
          )}
        </span>
      </div>
    )
  }

  // Scale: 0% to max of (industry high + 10%) or company adjusted + 10%
  const maxVal = Math.max(industryHigh, companyAdjusted, companyReported) + 0.1
  const minVal = 0

  const toPercent = (v: number) => ((v - minVal) / (maxVal - minVal)) * 100

  return (
    <div className="space-y-2">
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        {/* Industry range */}
        <div
          className="absolute top-0 h-full bg-blue-100 dark:bg-blue-900/30"
          style={{
            left: `${toPercent(industryLow)}%`,
            width: `${toPercent(industryHigh) - toPercent(industryLow)}%`,
          }}
        />
        {/* Company reported marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-500"
          style={{ left: `${toPercent(companyReported)}%` }}
        />
        {/* Company adjusted marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-green-500"
          style={{ left: `${toPercent(companyAdjusted)}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" />
          Industry: {(industryLow * 100).toFixed(0)}%-{(industryHigh * 100).toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-500" />
          Reported: {(companyReported * 100).toFixed(1)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-green-500" />
          Adjusted: {(companyAdjusted * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function ExistingReviewRow({
  review,
  adjustment,
}: {
  review: AdjustmentReview
  adjustment?: Adjustment
}) {
  if (!adjustment) return null

  const categoryLabel = CATEGORY_LABELS[review.suggestedCategory] || review.suggestedCategory
  const categoryColor = CATEGORY_COLORS[review.suggestedCategory] || CATEGORY_COLORS.OTHER

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {adjustment.description}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor}`}>
            {categoryLabel}
          </span>
          {adjustment.aiSuggested && (
            <Badge variant="secondary" className="text-[10px]">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              AI
            </Badge>
          )}
        </div>
        {review.buyerRiskFlag && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            {review.buyerRiskFlag}
          </p>
        )}
      </div>
      <span className="text-sm font-medium tabular-nums whitespace-nowrap">
        {adjustment.type === 'ADD_BACK' ? '+' : '-'}${adjustment.amount.toLocaleString()}
      </span>
    </div>
  )
}
