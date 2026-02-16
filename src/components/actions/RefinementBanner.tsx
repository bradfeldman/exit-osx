'use client'

import { useState } from 'react'
import { X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

interface RefinementEvent {
  id: string
  briCategory: string
  tasksAdded: number
  tasksUpdated: number
  tasksRemoved: number
  createdAt: string
}

interface RefinementBannerProps {
  events: RefinementEvent[]
  onDismiss: (eventId: string) => void
}

export function RefinementBanner({ events, onDismiss }: RefinementBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (!events || events.length === 0) return null

  // Aggregate stats across all undismissed events
  const totalAdded = events.reduce((sum, e) => sum + e.tasksAdded, 0)
  const totalRemoved = events.reduce((sum, e) => sum + e.tasksRemoved, 0)
  const totalUpdated = events.reduce((sum, e) => sum + e.tasksUpdated, 0)
  const categories = [...new Set(events.map(e => CATEGORY_LABELS[e.briCategory] || e.briCategory))]

  const handleDismissAll = () => {
    events.forEach(e => onDismiss(e.id))
  }

  // Build summary text
  const parts: string[] = []
  if (totalAdded > 0) parts.push(`${totalAdded} new`)
  if (totalUpdated > 0) parts.push(`${totalUpdated} updated`)
  if (totalRemoved > 0) parts.push(`${totalRemoved} replaced`)
  const summary = parts.join(', ')

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {categories.join(' & ')} assessment complete — your tasks are sharper now
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={handleDismissAll}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline mt-1.5 flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'See'} changes
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {events.map(event => (
                <div key={event.id} className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {CATEGORY_LABELS[event.briCategory] || event.briCategory}:
                  </span>
                  <span>
                    {event.tasksAdded > 0 && `+${event.tasksAdded} tasks`}
                    {event.tasksRemoved > 0 && `, ${event.tasksRemoved} preliminary replaced`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
