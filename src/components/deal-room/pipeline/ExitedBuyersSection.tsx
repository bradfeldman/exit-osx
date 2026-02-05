'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ExitedBuyer {
  id: string
  companyName: string
  exitStage: string
  exitReason: string | null
  exitedAt: string
}

interface ExitedBuyersSectionProps {
  buyers: ExitedBuyer[]
}

function formatExitReason(stage: string, reason: string | null): string {
  if (reason) return reason
  switch (stage) {
    case 'DECLINED': return 'Declined'
    case 'PASSED': return 'Passed'
    case 'IOI_DECLINED': return 'IOI Declined'
    case 'WITHDRAWN': return 'Withdrawn'
    case 'TERMINATED': return 'Terminated'
    default: return 'Exited'
  }
}

export function ExitedBuyersSection({ buyers }: ExitedBuyersSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (buyers.length === 0) return null

  return (
    <div className="mt-4 border-t border-border/30 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        Exited ({buyers.length})
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1">
          {buyers.map(buyer => (
            <div key={buyer.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{buyer.companyName}</span>
              {' '}
              ({formatExitReason(buyer.exitStage, buyer.exitReason)})
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
