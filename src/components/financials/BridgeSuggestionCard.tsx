'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X } from 'lucide-react'
import type { SuggestedAdjustment } from '@/lib/ai/ebitda-bridge'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  OWNER_COMPENSATION: { bg: 'bg-accent-light dark:bg-primary/30', text: 'text-primary dark:text-primary' },
  PERSONAL_EXPENSES: { bg: 'bg-purple-light dark:bg-purple/30', text: 'text-purple-dark dark:text-purple' },
  ONE_TIME_CHARGES: { bg: 'bg-orange-light dark:bg-orange/30', text: 'text-orange-dark dark:text-orange' },
  RELATED_PARTY: { bg: 'bg-orange-light dark:bg-orange/30', text: 'text-orange-dark dark:text-orange' },
  NON_OPERATING: { bg: 'bg-muted dark:bg-foreground/30', text: 'text-foreground dark:text-muted' },
  DISCRETIONARY: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  OTHER: { bg: 'bg-muted dark:bg-foreground/30', text: 'text-foreground dark:text-muted' },
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

interface BridgeSuggestionCardProps {
  suggestion: SuggestedAdjustment
  onAccept: (amount: number) => void
  onDismiss: () => void
  isAccepting: boolean
}

export function BridgeSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  isAccepting,
}: BridgeSuggestionCardProps) {
  const [amount, setAmount] = useState(
    suggestion.estimatedAmount !== null ? String(suggestion.estimatedAmount) : ''
  )

  const colors = CATEGORY_COLORS[suggestion.category] || CATEGORY_COLORS.OTHER
  const categoryLabel = CATEGORY_LABELS[suggestion.category] || suggestion.category

  const confidenceColor =
    suggestion.confidence >= 0.8
      ? 'bg-green'
      : suggestion.confidence >= 0.5
        ? 'bg-orange'
        : 'bg-muted-foreground'

  const handleAccept = () => {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    onAccept(parsed)
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Header row: category badge + confidence dot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
            {categoryLabel}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground`}>
            <span className={`w-2 h-2 rounded-full ${confidenceColor}`} />
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {suggestion.type === 'ADD_BACK' ? 'Add-back' : 'Deduction'}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm font-medium text-foreground">{suggestion.description}</p>
      <p className="text-sm text-muted-foreground">{suggestion.explanation}</p>

      {/* Buyer perspective */}
      {suggestion.buyerPerspective && (
        <p className="text-xs italic text-muted-foreground/80 border-l-2 border-muted pl-2">
          {suggestion.buyerPerspective}
        </p>
      )}

      {/* Amount + actions */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1 max-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="pl-7 h-8 text-sm"
            min={0}
            step={1000}
          />
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={handleAccept}
          disabled={isAccepting || !amount || parseFloat(amount) <= 0}
          className="h-8"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          disabled={isAccepting}
          className="h-8"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
