'use client'

import { useState, useEffect, useCallback } from 'react'
import { ActivityItem } from './ActivityItem'
import { Button } from '@/components/ui/button'

interface Activity {
  id: string
  type: string
  buyerName: string | null
  buyerId: string | null
  contactName: string | null
  description: string
  metadata: Record<string, unknown>
  timestamp: string
  engagementSignal: 'positive' | 'neutral' | 'warning' | null
}

interface ActivityFeedProps {
  companyId: string
}

/** Group activities by date label (Today, Yesterday, or formatted date) */
function groupByDate(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const activity of activities) {
    const date = new Date(activity.timestamp)
    let label: string

    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const existing = groups.get(label)
    if (existing) {
      existing.push(activity)
    } else {
      groups.set(label, [activity])
    }
  }

  return groups
}

export function ActivityFeed({ companyId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchActivities = useCallback(async (loadMore = false) => {
    if (!companyId) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (loadMore && cursor) params.set('cursor', cursor)
      if (typeFilter !== 'all') params.set('type', typeFilter)

      const res = await fetch(`/api/companies/${companyId}/deal-room/activity?${params}`)
      const data = await res.json()

      if (loadMore) {
        setActivities(prev => [...prev, ...data.activities])
      } else {
        setActivities(data.activities)
      }
      setCursor(data.cursor)
      setHasMore(data.hasMore)
    } catch {
      // Silently fail, activity feed is supplementary
    } finally {
      setIsLoading(false)
    }
  }, [companyId, cursor, typeFilter])

  useEffect(() => {
    fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, typeFilter])

  const grouped = groupByDate(activities)

  const filterTypes = [
    { id: 'all', label: 'All' },
    { id: 'stage_change', label: 'Stage Changes' },
    { id: 'document_view', label: 'Documents' },
    { id: 'meeting', label: 'Meetings' },
    { id: 'offer', label: 'Offers' },
  ]

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          ACTIVITY
        </h2>
        <div className="flex items-center gap-1">
          {filterTypes.map(ft => (
            <button
              key={ft.id}
              onClick={() => setTypeFilter(ft.id)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                typeFilter === ft.id
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Groups */}
      {activities.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No activity yet. Add buyers and start the process.
        </p>
      )}

      {Array.from(grouped.entries()).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background py-2">
            {dateLabel}
          </h3>
          <div className="space-y-1">
            {items.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchActivities(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
