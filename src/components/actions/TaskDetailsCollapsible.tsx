'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDetailsCollapsibleProps {
  successCriteria: {
    overview: string
    outcomes: string[]
  } | null
  outputFormat: {
    description: string
    formats: string[]
    guidance: string
  } | null
  description: string
}

export function TaskDetailsCollapsible({
  successCriteria,
  outputFormat,
  description,
}: TaskDetailsCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-4 border border-border/30 rounded-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>More Details</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30">
          {/* Description */}
          <div className="pt-3">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
              Description
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          {/* Success Criteria */}
          {successCriteria && (
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
                Success Criteria
              </p>
              <p className="text-sm text-muted-foreground mb-2">{successCriteria.overview}</p>
              <ul className="space-y-1">
                {successCriteria.outcomes.map((outcome, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">&#x2713;</span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Output Format */}
          {outputFormat && (
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
                Required Output
              </p>
              <p className="text-sm text-muted-foreground mb-2">{outputFormat.description}</p>
              <ul className="space-y-1">
                {outputFormat.formats.map((format, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    &bull; {format}
                  </li>
                ))}
              </ul>
              {outputFormat.guidance && (
                <p className="text-xs text-muted-foreground mt-2 italic">{outputFormat.guidance}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
