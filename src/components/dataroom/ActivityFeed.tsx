'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Activity {
  id: string
  userId: string
  userEmail: string
  action: string
  documentId: string | null
  folderId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  document?: { documentName: string } | null
  folder?: { name: string } | null
}

interface ActivityFeedProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
}

const ACTION_INFO: Record<string, { label: string; icon: string; color: string }> = {
  VIEWED_DOCUMENT: { label: 'Viewed', icon: '👁', color: 'text-blue-600 bg-blue-50' },
  DOWNLOADED_DOCUMENT: { label: 'Downloaded', icon: '⬇', color: 'text-green-600 bg-green-50' },
  UPLOADED_DOCUMENT: { label: 'Uploaded', icon: '⬆', color: 'text-purple-600 bg-purple-50' },
  DELETED_DOCUMENT: { label: 'Deleted', icon: '🗑', color: 'text-red-600 bg-red-50' },
  GRANTED_ACCESS: { label: 'Granted access', icon: '🔓', color: 'text-teal-600 bg-teal-50' },
  REVOKED_ACCESS: { label: 'Revoked access', icon: '🔒', color: 'text-orange-600 bg-orange-50' },
  ASKED_QUESTION: { label: 'Asked question', icon: '❓', color: 'text-yellow-600 bg-yellow-50' },
  ANSWERED_QUESTION: { label: 'Answered', icon: '💬', color: 'text-indigo-600 bg-indigo-50' },
}

export function ActivityFeed({ companyId, isOpen, onClose }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'views' | 'downloads' | 'uploads'>('all')

  const fetchActivities = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })

      if (filter === 'views') {
        params.set('action', 'VIEWED_DOCUMENT')
      } else if (filter === 'downloads') {
        params.set('action', 'DOWNLOADED_DOCUMENT')
      } else if (filter === 'uploads') {
        params.set('action', 'UPLOADED_DOCUMENT')
      }

      const res = await fetch(`/api/companies/${companyId}/dataroom/activity?${params}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, filter])

  useEffect(() => {
    if (isOpen) {
      fetchActivities()
    }
  }, [isOpen, fetchActivities])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getActionInfo = (action: string) => {
    return ACTION_INFO[action] || { label: action, icon: '•', color: 'text-gray-600 bg-gray-50' }
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {} as Record<string, Activity[]>)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Activity Feed</DialogTitle>
          <DialogDescription>
            Recent activity in your data room
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 pb-4 border-b">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === 'views' ? 'default' : 'outline'}
            onClick={() => setFilter('views')}
          >
            Views
          </Button>
          <Button
            size="sm"
            variant={filter === 'downloads' ? 'default' : 'outline'}
            onClick={() => setFilter('downloads')}
          >
            Downloads
          </Button>
          <Button
            size="sm"
            variant={filter === 'uploads' ? 'default' : 'outline'}
            onClick={() => setFilter('uploads')}
          >
            Uploads
          </Button>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <ActivityIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Activity will appear here when users view, download, or upload documents
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
                  <div className="space-y-2">
                    {dayActivities.map((activity) => {
                      const actionInfo = getActionInfo(activity.action)
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className={`p-2 rounded-full ${actionInfo.color}`}>
                            <span className="text-sm">{actionInfo.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{activity.userEmail}</span>
                              {' '}
                              <span className="text-muted-foreground">{actionInfo.label.toLowerCase()}</span>
                              {activity.document && (
                                <>
                                  {' '}
                                  <span className="font-medium">{activity.document.documentName}</span>
                                </>
                              )}
                              {activity.folder && !activity.document && (
                                <>
                                  {' in '}
                                  <span className="font-medium">{activity.folder.name}</span>
                                </>
                              )}
                              {activity.action === 'GRANTED_ACCESS' && !!activity.metadata?.grantedTo && (
                                <>
                                  {' to '}
                                  <span className="font-medium">{String(activity.metadata.grantedTo)}</span>
                                </>
                              )}
                              {activity.action === 'REVOKED_ACCESS' && !!activity.metadata?.revokedFrom && (
                                <>
                                  {' from '}
                                  <span className="font-medium">{String(activity.metadata.revokedFrom)}</span>
                                </>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatTime(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {activities.length} activities
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
