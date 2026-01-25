'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UserAccessData {
  user: {
    id: string
    name: string | null
    email: string
  }
  summary: {
    totalViews: number
    totalDownloads: number
    uniqueDocuments: number
    totalActivities: number
    periodDays: number
  }
  documentAccess: Array<{
    document: {
      id: string
      documentName: string
      fileName: string
      folder?: { name: string; category: string }
    } | null
    views: number
    downloads: number
    firstAccess: string
    lastAccess: string
  }>
  activityOverTime: Array<{ date: string; views: number; downloads: number }>
  recentActivity: Array<{
    id: string
    action: string
    document: { id: string; documentName: string; folder?: { name: string } } | null
    timestamp: string
  }>
}

interface UserAccessReportProps {
  companyId: string
  userEmail: string
  userId?: string
  onClose: () => void
  onDocumentClick?: (documentId: string) => void
}

export function UserAccessReport({
  companyId,
  userEmail,
  userId: _userId,
  onClose,
  onDocumentClick,
}: UserAccessReportProps) {
  const [data, setData] = useState<UserAccessData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days] = useState(30)
  const [activeTab, setActiveTab] = useState<'documents' | 'activity'>('documents')

  const fetchReport = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch user's data room activity via export endpoint
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/analytics/export?type=all`
      )

      if (res.ok) {
        // Parse CSV to find user's activities
        const csvText = await res.text()
        const lines = csvText.split('\n')
        // Skip header row (line 0)

        const userActivities = lines
          .slice(1)
          .filter((line) => line.toLowerCase().includes(userEmail.toLowerCase()))
          .map((line) => {
            const values = line.split(',')
            return {
              timestamp: values[0],
              action: values[1],
              userEmail: values[2],
              userName: values[3],
              documentName: values[4],
              fileName: values[5],
              folder: values[6],
              category: values[7],
            }
          })

        // Aggregate data
        const documentMap: Record<string, { views: number; downloads: number; lastAccess: string; firstAccess: string; name: string; folder: string }> = {}
        const activityByDate: Record<string, { views: number; downloads: number }> = {}

        userActivities.forEach((a) => {
          const docKey = a.documentName || 'Unknown'
          if (!documentMap[docKey]) {
            documentMap[docKey] = {
              views: 0,
              downloads: 0,
              lastAccess: a.timestamp,
              firstAccess: a.timestamp,
              name: a.documentName,
              folder: a.folder,
            }
          }
          if (a.action === 'View') documentMap[docKey].views++
          else documentMap[docKey].downloads++

          if (a.timestamp > documentMap[docKey].lastAccess) {
            documentMap[docKey].lastAccess = a.timestamp
          }
          if (a.timestamp < documentMap[docKey].firstAccess) {
            documentMap[docKey].firstAccess = a.timestamp
          }

          const date = a.timestamp.split('T')[0]
          if (!activityByDate[date]) activityByDate[date] = { views: 0, downloads: 0 }
          if (a.action === 'View') activityByDate[date].views++
          else activityByDate[date].downloads++
        })

        setData({
          user: { id: '', name: userActivities[0]?.userName || null, email: userEmail },
          summary: {
            totalViews: userActivities.filter((a) => a.action === 'View').length,
            totalDownloads: userActivities.filter((a) => a.action === 'Download').length,
            uniqueDocuments: Object.keys(documentMap).length,
            totalActivities: userActivities.length,
            periodDays: days,
          },
          documentAccess: Object.entries(documentMap).map(([, doc]) => ({
            document: {
              id: '',
              documentName: doc.name,
              fileName: '',
              folder: { name: doc.folder, category: '' },
            },
            views: doc.views,
            downloads: doc.downloads,
            firstAccess: doc.firstAccess,
            lastAccess: doc.lastAccess,
          })),
          activityOverTime: Object.entries(activityByDate)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date)),
          recentActivity: userActivities.slice(0, 50).map((a, i) => ({
            id: String(i),
            action: a.action === 'View' ? 'VIEWED_DOCUMENT' : 'DOWNLOADED_DOCUMENT',
            document: {
              id: '',
              documentName: a.documentName,
              folder: { name: a.folder },
            },
            timestamp: a.timestamp,
          })),
        })
      }
    } catch (error) {
      console.error('Error fetching user access report:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, userEmail, days])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExport = async () => {
    try {
      const res = await fetch(
        `/api/companies/${companyId}/dataroom/analytics/export`
      )
      if (res.ok) {
        const csvText = await res.text()
        const lines = csvText.split('\n')
        const headers = lines[0]

        const userLines = lines
          .slice(1)
          .filter((line) => line.toLowerCase().includes(userEmail.toLowerCase()))

        const filteredCsv = [headers, ...userLines].join('\n')

        const blob = new Blob([filteredCsv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `user-access-${userEmail.replace('@', '_at_')}-${new Date().toISOString().split('T')[0]}.csv`
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
            User Access Report: {data?.user?.name || userEmail}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity found for this user
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Export button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <DownloadIcon className="h-4 w-4 mr-1" />
                Export User Activity
              </Button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{data.summary.totalViews}</div>
                <p className="text-xs text-blue-600/70">Views</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{data.summary.totalDownloads}</div>
                <p className="text-xs text-green-600/70">Downloads</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-600">{data.summary.uniqueDocuments}</div>
                <p className="text-xs text-purple-600/70">Documents</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-orange-600">{data.summary.totalActivities}</div>
                <p className="text-xs text-orange-600/70">Total Actions</p>
              </div>
            </div>

            {/* Activity chart */}
            {data.activityOverTime.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Activity Over Time</h4>
                <div className="h-20 flex items-end gap-1">
                  {data.activityOverTime.slice(-30).map((day, i) => {
                    const maxActivity = Math.max(
                      ...data.activityOverTime.slice(-30).map((d) => d.views + d.downloads),
                      1
                    )
                    const totalHeight = ((day.views + day.downloads) / maxActivity) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-primary/30 rounded-t"
                          style={{ height: `${totalHeight}%`, minHeight: day.views + day.downloads > 0 ? 4 : 0 }}
                          title={`${day.date}: ${day.views} views, ${day.downloads} downloads`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b flex gap-4">
              <button
                className={`pb-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('documents')}
              >
                Documents Accessed
              </button>
              <button
                className={`pb-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === 'activity'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('activity')}
              >
                Recent Activity
              </button>
            </div>

            {/* Documents list */}
            {activeTab === 'documents' && (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {data.documentAccess.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No documents accessed</p>
                ) : (
                  <div className="divide-y">
                    {data.documentAccess
                      .sort((a, b) => new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime())
                      .map((item, i) => (
                        <div
                          key={i}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => item.document?.id && onDocumentClick?.(item.document.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {item.document?.documentName || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.document?.folder?.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1 text-blue-600">
                                <EyeIcon className="h-4 w-4" />
                                {item.views}
                              </span>
                              <span className="flex items-center gap-1 text-green-600">
                                <DownloadIcon className="h-4 w-4" />
                                {item.downloads}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last accessed: {formatTime(item.lastAccess)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity timeline */}
            {activeTab === 'activity' && (
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  <div className="divide-y">
                    {data.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
                      >
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
                            {activity.document?.documentName || 'Unknown document'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.document?.folder?.name}
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
            )}
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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
