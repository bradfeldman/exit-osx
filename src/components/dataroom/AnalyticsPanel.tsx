'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAccessReport } from './UserAccessReport'

interface EngagementData {
  summary: {
    totalViews: number
    totalDownloads: number
    uniqueViewers: number
    periodDays: number
  }
  mostViewed: Array<{
    document: { id: string; documentName: string; fileName: string; folder?: { name: string; category: string } } | null
    viewCount: number
  }>
  mostDownloaded: Array<{
    document: { id: string; documentName: string; fileName: string; folder?: { name: string; category: string } } | null
    downloadCount: number
  }>
  activityOverTime: Array<{ date: string; views: number; downloads: number }>
  userEngagement: Array<{ email: string; name?: string; views: number; downloads: number }>
}

interface AnalyticsPanelProps {
  companyId: string
  onDocumentClick?: (documentId: string) => void
}

export function AnalyticsPanel({ companyId, onDocumentClick }: AnalyticsPanelProps) {
  const [data, setData] = useState<EngagementData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState('30')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/analytics?type=engagement&days=${days}`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, days])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/dataroom/analytics/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `data-room-activity-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load analytics
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Engagement Analytics</h3>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <DownloadIcon className="h-4 w-4 mr-1" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.summary.totalViews}</div>
            <p className="text-sm text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.summary.totalDownloads}</div>
            <p className="text-sm text-muted-foreground">Total Downloads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.summary.uniqueViewers}</div>
            <p className="text-sm text-muted-foreground">Unique Viewers</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity chart */}
      {data.activityOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1">
              {data.activityOverTime.map((day, i) => {
                const maxActivity = Math.max(
                  ...data.activityOverTime.map((d) => d.views + d.downloads),
                  1
                )
                const height = ((day.views + day.downloads) / maxActivity) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 rounded-t relative"
                      style={{ height: `${height}%`, minHeight: day.views + day.downloads > 0 ? 4 : 0 }}
                      title={`${day.date}: ${day.views} views, ${day.downloads} downloads`}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t"
                        style={{ height: `${day.downloads / (day.views + day.downloads || 1) * 100}%` }}
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
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/20 rounded" />
                <span>Views</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary rounded" />
                <span>Downloads</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top documents and users */}
      <div className="grid grid-cols-2 gap-4">
        {/* Most viewed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Viewed Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mostViewed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No views yet</p>
            ) : (
              <div className="space-y-3">
                {data.mostViewed.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded -mx-1"
                    onClick={() => item.document && onDocumentClick?.(item.document.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.document?.documentName || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.document?.folder?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                      {item.viewCount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most downloaded */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Downloaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mostDownloaded.length === 0 ? (
              <p className="text-sm text-muted-foreground">No downloads yet</p>
            ) : (
              <div className="space-y-3">
                {data.mostDownloaded.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded -mx-1"
                    onClick={() => item.document && onDocumentClick?.(item.document.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.document?.documentName || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.document?.folder?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <DownloadIcon className="h-4 w-4 text-muted-foreground" />
                      {item.downloadCount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">User Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          {data.userEngagement.length === 0 ? (
            <p className="text-sm text-muted-foreground">No user activity yet</p>
          ) : (
            <div className="space-y-2">
              {data.userEngagement.slice(0, 10).map((user, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded"
                  onClick={() => setSelectedUserId(user.email)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                    {user.name && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      {user.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <DownloadIcon className="h-4 w-4" />
                      {user.downloads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User access report modal */}
      {selectedUserId && (
        <UserAccessReport
          companyId={companyId}
          userEmail={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onDocumentClick={onDocumentClick}
        />
      )}
    </div>
  )
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
