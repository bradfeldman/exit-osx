'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DocumentAnalyticsData {
  document: {
    id: string
    name: string
    fileName: string
    folder: string
    category: string
  }
  summary: {
    viewCount: number
    downloadCount: number
    uniqueViewers: number
    periodDays: number
  }
  activityOverTime: Array<{ date: string; views: number; downloads: number }>
  recentActivity: Array<{
    id: string
    action: string
    user: { name?: string; email: string }
    timestamp: string
  }>
}

interface DocumentAnalyticsProps {
  companyId: string
  documentId: string
  documentName?: string
  onClose: () => void
}

export function DocumentAnalytics({
  companyId,
  documentId,
  documentName,
  onClose,
}: DocumentAnalyticsProps) {
  const [data, setData] = useState<DocumentAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/analytics?type=document&documentId=${documentId}&days=${days}`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching document analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, documentId, days])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExport = async () => {
    try {
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/analytics/export?documentId=${documentId}`
      )
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `document-activity-${documentId}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting:', error)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Document Analytics: {documentName || data?.document?.name || 'Loading...'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load analytics
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Period selector */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[7, 30, 90].map((d) => (
                  <Button
                    key={d}
                    variant={days === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <DownloadIcon className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{data.summary.viewCount}</div>
                <p className="text-sm text-blue-600/70">Views</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{data.summary.downloadCount}</div>
                <p className="text-sm text-green-600/70">Downloads</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{data.summary.uniqueViewers}</div>
                <p className="text-sm text-purple-600/70">Unique Viewers</p>
              </div>
            </div>

            {/* Activity chart */}
            {data.activityOverTime.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Activity Over Time</h4>
                <div className="h-24 flex items-end gap-1">
                  {data.activityOverTime.map((day, i) => {
                    const maxActivity = Math.max(
                      ...data.activityOverTime.map((d) => d.views + d.downloads),
                      1
                    )
                    const totalHeight = ((day.views + day.downloads) / maxActivity) * 100
                    const downloadHeight = day.downloads / (day.views + day.downloads || 1) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-200 rounded-t relative"
                          style={{ height: `${totalHeight}%`, minHeight: day.views + day.downloads > 0 ? 4 : 0 }}
                          title={`${day.date}: ${day.views} views, ${day.downloads} downloads`}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t"
                            style={{ height: `${downloadHeight}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{data.activityOverTime[0]?.date}</span>
                  <span>{data.activityOverTime[data.activityOverTime.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 border-b">
                <h4 className="text-sm font-medium">Recent Activity</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  <div className="divide-y">
                    {data.recentActivity.map((activity) => (
                      <div key={activity.id} className="px-4 py-3 flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            activity.action === 'VIEWED_DOCUMENT'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {activity.action === 'VIEWED_DOCUMENT' ? (
                            <EyeIcon className="h-4 w-4" />
                          ) : (
                            <DownloadIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.user.name || activity.user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.action === 'VIEWED_DOCUMENT' ? 'Viewed' : 'Downloaded'}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatTime(dateStr: string): string {
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
