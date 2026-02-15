'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  FileText,
  Eye,
  Download,
  Upload,
  FolderOpen,
  LogIn,
  RefreshCw,
  Clock,
  User,
  File,
} from 'lucide-react'

interface VDRActivity {
  id: string
  action: string
  documentId: string | null
  folderId: string | null
  userEmail: string
  metadata: {
    documentName?: string
    folderName?: string
    pageCount?: number
    duration?: number
  } | null
  createdAt: string
}

interface VDRActivityTimelineProps {
  dealId: string
  buyerId: string
  limit?: number
  showHeader?: boolean
  className?: string
}

// Action labels
const ACTION_LABELS: Record<string, string> = {
  VIEWED: 'Viewed Document',
  DOWNLOADED: 'Downloaded Document',
  UPLOADED: 'Uploaded Document',
  FOLDER_ACCESSED: 'Accessed Folder',
  LOGGED_IN: 'Logged In',
  LOGGED_OUT: 'Logged Out',
  SEARCH: 'Searched',
  PRINT: 'Printed Document',
}

// Action icons
const ACTION_ICONS: Record<string, React.ReactNode> = {
  VIEWED: <Eye className="h-4 w-4" />,
  DOWNLOADED: <Download className="h-4 w-4" />,
  UPLOADED: <Upload className="h-4 w-4" />,
  FOLDER_ACCESSED: <FolderOpen className="h-4 w-4" />,
  LOGGED_IN: <LogIn className="h-4 w-4" />,
  LOGGED_OUT: <LogIn className="h-4 w-4 rotate-180" />,
  SEARCH: <FileText className="h-4 w-4" />,
  PRINT: <FileText className="h-4 w-4" />,
}

// Action colors
const ACTION_COLORS: Record<string, string> = {
  VIEWED: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  DOWNLOADED: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  UPLOADED: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  FOLDER_ACCESSED: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  LOGGED_IN: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
  LOGGED_OUT: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
  SEARCH: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
  PRINT: 'text-red-600 bg-red-100 dark:bg-red-900/30',
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

export function VDRActivityTimeline({
  dealId,
  buyerId,
  limit = 10,
  showHeader = true,
  className,
}: VDRActivityTimelineProps) {
  const [activities, setActivities] = useState<VDRActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/deals/${dealId}/buyers/${buyerId}/vdr-activity?limit=${limit}`
      )
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching VDR activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, buyerId, limit])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              VDR Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            VDR Activity
            {total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {total}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchActivities}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No VDR activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <AnimatePresence>
              <motion.div
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {activities.map((activity, index) => {
                  const icon = ACTION_ICONS[activity.action] || <File className="h-4 w-4" />
                  const colorClass = ACTION_COLORS[activity.action] || 'text-gray-600 bg-gray-100'
                  const label = ACTION_LABELS[activity.action] || activity.action
                  const meta = activity.metadata as VDRActivity['metadata']

                  return (
                    <motion.div
                      key={activity.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.03 }}
                      className="relative flex gap-3 pl-2"
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                          colorClass
                        )}
                      >
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{label}</p>
                            {meta?.documentName && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {meta.documentName}
                              </p>
                            )}
                            {meta?.folderName && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Folder: {meta.folderName}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(activity.createdAt)}
                          </span>
                        </div>

                        {/* User info */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{activity.userEmail}</span>
                          {meta?.duration && (
                            <>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              <span>{Math.round(meta.duration / 60)}m</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>

            {total > limit && (
              <div className="pt-2 pl-11">
                <Button variant="link" size="sm" className="text-xs h-auto p-0">
                  View all {total} activities
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
