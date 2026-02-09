'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfidenceDots } from './ConfidenceDots'
import { CategoryAssessmentFlow } from './CategoryAssessmentFlow'
import { AnimatePresence } from '@/lib/motion'

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
  if (score >= 40) return 'text-amber-600'
  return 'text-destructive'
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

interface CategoryPanelProps {
  category: string
  label: string
  score: number
  dollarImpact: number | null
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
}

export function CategoryPanel({
  category,
  label,
  score,
  dollarImpact,
  confidence,
  isLowestConfidence,
  assessmentId,
  companyId,
  onAssessmentComplete,
  isExpanded: controlledIsExpanded,
  onExpand,
  onCollapse,
}: CategoryPanelProps) {
  // Fully controlled mode when parent provides onExpand/onCollapse
  const isControlled = onExpand !== undefined && onCollapse !== undefined
  const [localIsExpanded, setLocalIsExpanded] = useState(false)

  // In controlled mode, always use parent state; otherwise use local state
  const isExpanded = isControlled ? (controlledIsExpanded ?? false) : localIsExpanded

  const getCtaLabel = (): string => {
    if (confidence.questionsAnswered === 0) return 'Start Assessment'
    if (confidence.isStale) return 'Review & Refresh'
    if (confidence.hasUnansweredAiQuestions) return 'Sharpen Diagnosis'
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
      'bg-card border border-border rounded-xl p-5 transition-all',
      'hover:border-primary/20 hover:shadow-sm',
      isLowestConfidence && 'border-amber-300/50',
      isExpanded && 'border-primary/40 shadow-md'
    )}>
      {/* Header: Dot + Label + Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('h-2.5 w-2.5 rounded-full', CATEGORY_DOT_COLORS[category] || 'bg-gray-400')} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <span className={cn('text-lg font-bold', getScoreColor(score))}>
          {score}/100
        </span>
      </div>

      {/* Confidence */}
      <div className="mt-3">
        <ConfidenceDots dots={confidence.dots} label={confidence.label} />
      </div>

      {/* Dollar Impact */}
      {dollarImpact !== null && dollarImpact > 0 && (
        <p className="text-sm font-medium mt-2 text-muted-foreground">
          Costing you ~{formatCurrency(dollarImpact)}
        </p>
      )}
      {category === 'PERSONAL' && (
        <p className="text-xs text-muted-foreground mt-2">
          Affects your exit timeline, not buyer pricing
        </p>
      )}

      {/* Questions progress */}
      <p className="text-xs text-muted-foreground mt-2">
        {confidence.questionsAnswered} of {confidence.questionsTotal} questions answered
      </p>

      {/* Last updated */}
      <p className={cn('text-xs mt-1', confidence.isStale ? 'text-amber-600' : 'text-muted-foreground')}>
        {confidence.lastUpdated
          ? `Last updated: ${new Date(confidence.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${confidence.isStale ? ' — may need refresh' : ''}`
          : 'Not yet assessed'}
      </p>

      {/* Lowest confidence highlight */}
      {isLowestConfidence && confidence.dots < 4 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Lowest confidence — improve this first</span>
        </div>
      )}

      {/* CTAs - hidden when expanded */}
      {!isExpanded && (
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant={isMaintaining ? 'ghost' : 'default'}
            disabled={isMaintaining || !assessmentId || !companyId}
            onClick={handlePrimaryClick}
          >
            {ctaLabel} {!isMaintaining && '→'}
          </Button>
          {showSecondary && (
            <Button variant="ghost" size="sm" onClick={handleSecondaryClick}>
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
