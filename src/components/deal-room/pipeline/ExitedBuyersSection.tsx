'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'

interface ExitedBuyer {
  id: string
  companyName: string
  exitStage: string
  exitReason: string | null
  exitedAt: string
}

interface ExitedBuyersSectionProps {
  buyers: ExitedBuyer[]
  companyId?: string | null
  onRestore?: () => void
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

export function ExitedBuyersSection({ buyers, companyId, onRestore }: ExitedBuyersSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  if (buyers.length === 0) return null

  const handleRestore = async (buyerId: string) => {
    if (!companyId) return
    setRestoringId(buyerId)
    try {
      const res = await fetch(
        `/api/companies/${companyId}/deal-room/buyers/${buyerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        }
      )
      if (res.ok) {
        onRestore?.()
      }
    } finally {
      setRestoringId(null)
    }
  }

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
            <div key={buyer.id} className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground/80">{buyer.companyName}</span>
                {' '}
                ({formatExitReason(buyer.exitStage, buyer.exitReason)})
              </div>
              {buyer.exitReason === 'Archived' && companyId && (
                <button
                  onClick={() => handleRestore(buyer.id)}
                  disabled={restoringId === buyer.id}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  {restoringId === buyer.id ? 'Restoring...' : 'Restore'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
