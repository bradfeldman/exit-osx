'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfidenceDots } from './ConfidenceDots'
import { CategoryAssessmentFlow } from './CategoryAssessmentFlow'
import { AnimatePresence } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils/currency'
import { PlaybookLinkInPanel } from '@/components/playbook/PlaybookLinkInPanel'
import { getPlaybooksForCategory } from '@/lib/playbook/playbook-surface-mapping'
import type { PlanTier } from '@/lib/pricing'

const CATEGORY_DOT_COLORS: Record<string, string> = {
  FINANCIAL: 'bg-blue-500',
  TRANSFERABILITY: 'bg-green-500',
  OPERATIONAL: 'bg-yellow-500',
  MARKET: 'bg-purple-500',
  LEGAL_TAX: 'bg-red-500',
  PERSONAL: 'bg-orange-500',
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-primary'
  if (score >= 40) return 'text-amber-700'
  return 'text-destructive'
}

interface CategoryPanelProps {
  category: string
  label: string
  score: number
  dollarImpact: number | null
  isAssessed: boolean
  confidence: {
    dots: number
    label: string
    questionsAnswered: number
    questionsTotal: number
    lastUpdated: string | null
    daysSinceUpdate: number | null
    isStale: boolean
    hasUnansweredAiQuestions: boolean
  }
  isLowestConfidence: boolean
  assessmentId: string | null
  companyId: string | null
  onAssessmentComplete: () => void
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
  /** PROD-017: Next cadence-based prompt date (ISO string or null) */
  nextPromptDate?: string | null
  financialContext?: {
    tier: string
    metric: { label: string; value: string; source: string } | null
    benchmark: { range: string; source: string } | null
    dollarContext: string | null
  } | null
  planTier?: PlanTier
  /** C5: Playbook-driven BRI category boost (points on 0-100 scale) */
  playbookBoost?: { points: number; playbookTitle: string } | null
}

export function CategoryPanel({
  category,
  label,
  score,
  dollarImpact,
  isAssessed,
  confidence,
  isLowestConfidence,
  assessmentId,
  companyId,
  onAssessmentComplete,
  isExpanded: controlledIsExpanded,
  onExpand,
  onCollapse,
  nextPromptDate,
  financialContext,
  planTier = 'foundation',
  playbookBoost,
}: CategoryPanelProps) {
  // Fully controlled mode when parent provides onExpand/onCollapse
  const isControlled = onExpand !== undefined && onCollapse !== undefined
  const [localIsExpanded, setLocalIsExpanded] = useState(false)

  // In controlled mode, always use parent state; otherwise use local state
  const isExpanded = isControlled ? (controlledIsExpanded ?? false) : localIsExpanded

  const getCtaLabel = (): string => {
    if (confidence.questionsAnswered === 0) return 'Start Assessment'
    if (confidence.isStale) return 'Review & Refresh'
    if (confidence.hasUnansweredAiQuestions) return 'Re-Assess'
    if (confidence.questionsAnswered < confidence.questionsTotal) return 'Continue'
    if (score >= 80 && confidence.questionsAnswered === confidence.questionsTotal) return 'Maintaining'
    return 'Review Answers'
  }

  const showSecondary = confidence.questionsAnswered > 0 && confidence.questionsAnswered < confidence.questionsTotal

  const handlePrimaryClick = () => {
    if (assessmentId && companyId) {
      if (onExpand) {
        onExpand()
      } else {
        setLocalIsExpanded(true)
      }
    }
  }

  const handleSecondaryClick = () => {
    if (assessmentId && companyId) {
      if (onExpand) {
        onExpand()
      } else {
        setLocalIsExpanded(true)
      }
    }
  }

  const handleClose = () => {
    if (onCollapse) {
      onCollapse()
    } else {
      setLocalIsExpanded(false)
    }
  }

  const handleComplete = () => {
    // onAssessmentComplete will handle collapsing and refetch
    onAssessmentComplete()
  }

  const ctaLabel = getCtaLabel()
  const isMaintaining = ctaLabel === 'Maintaining'

  return (
    <div className={cn(
      'bg-card border rounded-xl p-4 sm:p-5 transition-all',
      'border-border hover:border-primary/20 hover:shadow-sm',
      isLowestConfidence && isAssessed && 'border-amber-300/50',
      isExpanded && 'border-primary/40 shadow-md border-solid'
    )}>
      {/* Header: Dot + Label + Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-2.5 w-2.5 rounded-full',
            CATEGORY_DOT_COLORS[category] || 'bg-gray-400'
          )} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        {isAssessed ? (
          <div className="flex items-center gap-1.5">
            {playbookBoost && playbookBoost.points > 0 && (
              <span
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                title={`+${playbookBoost.points} pts from ${playbookBoost.playbookTitle}`}
              >
                +{playbookBoost.points}
              </span>
            )}
            <span className={cn('text-lg font-bold', getScoreColor(score))}>
              {score}/100
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            Not Assessed
          </span>
        )}
      </div>

      {/* Confidence */}
      <div className="mt-3">
        <ConfidenceDots dots={confidence.dots} label={confidence.label} />
      </div>

      {/* Dollar Impact — only shown for assessed categories */}
      {isAssessed && dollarImpact !== null && dollarImpact > 0 && (
        <p className="text-sm font-medium mt-2 text-muted-foreground">
          Costing you ~{formatCurrency(dollarImpact)}
        </p>
      )}
      {isAssessed && category === 'PERSONAL' && (
        <p className="text-xs text-muted-foreground mt-2">
          Affects your exit timeline, not buyer pricing
        </p>
      )}

      {/* Financial context */}
      {isAssessed && financialContext && (
        <div className="mt-2 pt-2 border-t border-border/30">
          {financialContext.metric && (
            <p className="text-xs text-foreground">
              Your {financialContext.metric.label}: <span className="font-semibold">{financialContext.metric.value}</span>
              <span className="text-muted-foreground ml-1">({financialContext.metric.source})</span>
            </p>
          )}
          {financialContext.benchmark && (
            <p className="text-xs text-muted-foreground">
              Industry: {financialContext.benchmark.range}
            </p>
          )}
          {financialContext.dollarContext && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
              {financialContext.dollarContext}
            </p>
          )}
        </div>
      )}

      {/* Questions progress */}
      <p className="text-xs text-muted-foreground mt-2">
        {confidence.questionsAnswered} of {confidence.questionsTotal} questions answered
      </p>

      {/* Last updated */}
      <p className={cn('text-xs mt-1', confidence.isStale ? 'text-amber-700' : 'text-muted-foreground')}>
        {confidence.lastUpdated
          ? `Last updated: ${new Date(confidence.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${confidence.isStale ? ' — may need refresh' : ''}`
          : 'Not yet assessed'}
      </p>

      {/* PROD-017: Next re-assessment date (when cadence suppresses prompt) */}
      {isAssessed && nextPromptDate && !confidence.isStale && (
        <p className="text-xs text-muted-foreground/70 mt-1">
          {new Date(nextPromptDate) <= new Date()
            ? 'Re-assessment available'
            : `Next re-assessment suggested: ${new Date(nextPromptDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </p>
      )}

      {/* Lowest confidence highlight — only for assessed categories */}
      {isAssessed && isLowestConfidence && confidence.dots < 4 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Lowest confidence — improve this first</span>
        </div>
      )}

      {/* Playbook recommendations — shown when score < 70 and assessed */}
      {isAssessed && score < 70 && !isExpanded && (() => {
        const recs = getPlaybooksForCategory(category, 2)
        return recs.length > 0 ? (
          <PlaybookLinkInPanel
            playbooks={recs.map(r => ({ playbook: r.playbook, reason: r.reason }))}
            planTier={planTier}
          />
        ) : null
      })()}

      {/* CTAs - hidden when expanded */}
      {!isExpanded && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
          <Button
            size="sm"
            variant={isMaintaining ? 'ghost' : 'default'}
            disabled={isMaintaining || !assessmentId || !companyId}
            onClick={handlePrimaryClick}
            className="min-h-[44px] sm:min-h-0"
          >
            {ctaLabel} {!isMaintaining && '→'}
          </Button>
          {showSecondary && (
            <Button variant="ghost" size="sm" onClick={handleSecondaryClick} className="min-h-[44px] sm:min-h-0">
              Review Answers
            </Button>
          )}
        </div>
      )}

      {/* Inline Assessment Flow */}
      <AnimatePresence>
        {isExpanded && assessmentId && companyId && (
          <CategoryAssessmentFlow
            category={category}
            categoryLabel={label}
            assessmentId={assessmentId}
            companyId={companyId}
            onClose={handleClose}
            onComplete={handleComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
