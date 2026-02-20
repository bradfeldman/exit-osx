'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, MapPin, Receipt, UserCircle, Scale, AlertTriangle, Repeat } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

const FLAG_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  OWNER_PERSONAL: { label: 'Personal', bg: 'bg-purple-light dark:bg-purple-dark/30', text: 'text-purple-dark dark:text-purple-light', icon: UserCircle },
  ONE_TIME: { label: 'One-Time', bg: 'bg-orange-light dark:bg-orange-dark/30', text: 'text-orange-dark dark:text-orange-light', icon: Receipt },
  RELATED_PARTY: { label: 'Related Party', bg: 'bg-orange-light dark:bg-orange-dark/30', text: 'text-orange-dark dark:text-orange-light', icon: Repeat },
  TRANSACTION_COST: { label: 'M&A Cost', bg: 'bg-accent-light dark:bg-primary/30', text: 'text-primary dark:text-accent-light', icon: Scale },
  NORMALIZATION: { label: 'Normalize', bg: 'bg-muted dark:bg-foreground/30', text: 'text-foreground dark:text-muted', icon: AlertTriangle },
  LOCATION_ANOMALY: { label: 'Location', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', icon: MapPin },
  REVIEW_NEEDED: { label: 'Review', bg: 'bg-secondary dark:bg-foreground/30', text: 'text-foreground dark:text-muted', icon: AlertTriangle },
}

export interface TransactionFlagData {
  id: string
  flagType: string
  category: string | null
  description: string
  suggestedAmount: number | null
  personalPct: number | null
  confidence: number
  aiGenerated: boolean
  vendorName: string | null
  vendorTxnCount: number | null
  vendorTotalSpend: number | null
}

interface TransactionFlagCardProps {
  flag: TransactionFlagData
  onAccept: (flagId: string, amount: number) => void
  onDismiss: (flagId: string) => void
  isAccepting: boolean
  evMultiple?: number
}

export function TransactionFlagCard({
  flag,
  onAccept,
  onDismiss,
  isAccepting,
  evMultiple,
}: TransactionFlagCardProps) {
  const suggestedNum = flag.suggestedAmount || 0
  const effectiveAmount = flag.personalPct != null && flag.personalPct < 1
    ? suggestedNum * flag.personalPct
    : suggestedNum
  const [amount, setAmount] = useState(effectiveAmount > 0 ? String(Math.round(effectiveAmount)) : '')

  const config = FLAG_TYPE_CONFIG[flag.flagType] || FLAG_TYPE_CONFIG.REVIEW_NEEDED
  const Icon = config.icon

  const confidenceColor =
    flag.confidence >= 0.8 ? 'bg-green'
    : flag.confidence >= 0.5 ? 'bg-orange'
    : 'bg-muted-foreground'

  const handleAccept = () => {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    onAccept(flag.id, parsed)
  }

  const evImpact = evMultiple && parseFloat(amount) > 5000
    ? parseFloat(amount) * evMultiple
    : null

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Header: flag type badge + confidence + vendor stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${confidenceColor}`} />
            {Math.round(flag.confidence * 100)}%
          </span>
          {flag.aiGenerated && (
            <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">AI</span>
          )}
        </div>
        {flag.vendorTxnCount != null && flag.vendorTotalSpend != null && (
          <span className="text-xs text-muted-foreground">
            {flag.vendorTxnCount} txn{flag.vendorTxnCount !== 1 ? 's' : ''} &middot; {formatCurrency(flag.vendorTotalSpend)}
          </span>
        )}
      </div>

      {/* Vendor name + description */}
      {flag.vendorName && (
        <p className="text-sm font-medium text-foreground">{flag.vendorName}</p>
      )}
      <p className="text-sm text-muted-foreground">{flag.description}</p>

      {/* Partial add-back note */}
      {flag.personalPct != null && flag.personalPct < 1 && flag.personalPct > 0 && (
        <p className="text-xs text-muted-foreground/80 border-l-2 border-muted pl-2">
          {Math.round(flag.personalPct * 100)}% personal — partial add-back of {formatCurrency(effectiveAmount)} from {formatCurrency(suggestedNum)} total
        </p>
      )}

      {/* EV impact line */}
      {evImpact && (
        <p className="text-xs font-medium text-green-dark dark:text-green">
          EV impact: +{formatCurrency(evImpact)} at {evMultiple}x multiple
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
            step={100}
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
          onClick={() => onDismiss(flag.id)}
          disabled={isAccepting}
          className="h-8"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
