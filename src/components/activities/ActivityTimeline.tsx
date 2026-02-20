'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityType } from '@prisma/client'
import { ACTIVITY_TYPE_ICONS } from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import {
  Mail,
  MailOpen,
  PhoneOutgoing,
  PhoneIncoming,
  Calendar,
  CalendarCheck,
  CalendarX,
  FileText,
  ArrowRight,
  FileUp,
  FileDown,
  Key,
  KeyRound,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Activity,
} from 'lucide-react'

interface ActivityEvent {
  id: string
  activityType: ActivityType
  subject: string
  description: string | null
  metadata: Record<string, unknown> | null
  performedByUserId: string
  performedAt: string
  person?: {
    firstName: string
    lastName: string
  } | null
}

interface ActivityTimelineProps {
  dealId: string
  buyerId: string
  limit?: number
  showHeader?: boolean
  className?: string
  onLogActivity?: () => void
}

// Icon mapping for activity types
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  'mail': <Mail className="h-4 w-4" />,
  'mail-open': <MailOpen className="h-4 w-4" />,
  'phone-outgoing': <PhoneOutgoing className="h-4 w-4" />,
  'phone-incoming': <PhoneIncoming className="h-4 w-4" />,
  'calendar': <Calendar className="h-4 w-4" />,
  'calendar-check': <CalendarCheck className="h-4 w-4" />,
  'calendar-x': <CalendarX className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  'arrow-right': <ArrowRight className="h-4 w-4" />,
  'file-up': <FileUp className="h-4 w-4" />,
  'file-down': <FileDown className="h-4 w-4" />,
  'key': <Key className="h-4 w-4" />,
  'key-off': <KeyRound className="h-4 w-4" />,
  'clock': <Clock className="h-4 w-4" />,
  'check-circle': <CheckCircle className="h-4 w-4" />,
  'x-circle': <XCircle className="h-4 w-4" />,
}

// Color mapping for activity types
const ACTIVITY_COLORS: Record<ActivityType, string> = {
  EMAIL_SENT: 'text-primary bg-accent-light dark:bg-primary/30',
  EMAIL_RECEIVED: 'text-primary bg-accent-light dark:bg-primary/30',
  CALL_OUTBOUND: 'text-green-dark bg-green-light dark:bg-green-dark/30',
  CALL_INBOUND: 'text-green-dark bg-green-light dark:bg-green-dark/30',
  MEETING_SCHEDULED: 'text-purple-dark bg-purple-light dark:bg-purple-dark/30',
  MEETING_COMPLETED: 'text-purple-dark bg-purple-light dark:bg-purple-dark/30',
  MEETING_CANCELLED: 'text-muted-foreground bg-muted dark:bg-muted',
  NOTE_ADDED: 'text-muted-foreground bg-muted dark:bg-muted',
  STAGE_CHANGED: 'text-orange-dark bg-orange-light dark:bg-orange-dark/30',
  DOCUMENT_SENT: 'text-primary bg-accent-light dark:bg-primary/30',
  DOCUMENT_RECEIVED: 'text-primary bg-accent-light dark:bg-primary/30',
  VDR_ACCESS_GRANTED: 'text-teal bg-teal-light dark:bg-teal/30',
  VDR_ACCESS_REVOKED: 'text-red-dark bg-red-light dark:bg-red-dark/30',
  APPROVAL_REQUESTED: 'text-orange bg-orange-light dark:bg-orange/30',
  APPROVAL_GRANTED: 'text-green-dark bg-green-light dark:bg-green-dark/30',
  APPROVAL_DENIED: 'text-red-dark bg-red-light dark:bg-red-dark/30',
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

export function ActivityTimeline({
  dealId,
  buyerId,
  limit = 10,
  showHeader = true,
  className,
  onLogActivity,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/deals/${dealId}/buyers/${buyerId}/activities?limit=${limit}`
      )
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setHasMore(data.pagination?.hasMore || false)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, buyerId, limit])

  const _getActivityIcon = (activityType: ActivityType) => {
    const iconName = ACTIVITY_TYPE_ICONS[activityType]
    return ACTIVITY_ICONS[iconName] || <Activity className="h-4 w-4" />
  }

  const formatRelativeTime = (dateString: string) => {
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
              <Activity className="h-4 w-4" />
              Activity Timeline
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
            <Activity className="h-4 w-4" />
            Activity Timeline
            {total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {total}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchActivities}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onLogActivity && (
              <Button size="sm" onClick={onLogActivity}>
                Log Activity
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No activities recorded yet</p>
            {onLogActivity && (
              <Button variant="link" size="sm" onClick={onLogActivity}>
                Log first activity
              </Button>
            )}
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
                  const iconName = ACTIVITY_TYPE_ICONS[activity.activityType]
                  const icon = ACTIVITY_ICONS[iconName] || <Activity className="h-4 w-4" />
                  const colorClass = ACTIVITY_COLORS[activity.activityType]

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
                            <p className="text-sm font-medium truncate">
                              {activity.subject}
                            </p>
                            {activity.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(activity.performedAt)}
                          </span>
                        </div>

                        {/* Person and user info */}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {activity.person && (
                            <>
                              <User className="h-3 w-3" />
                              <span>
                                {activity.person.firstName} {activity.person.lastName}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>by {activity.performedByUserId}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>

            {hasMore && (
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
