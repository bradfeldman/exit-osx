'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalStatus } from '@prisma/client'
import { APPROVAL_STATUS_LABELS } from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  Pause,
  Clock,
  History,
  User,
} from 'lucide-react'

interface ApprovalEvent {
  id: string
  activityType: string
  subject: string
  description: string | null
  metadata: {
    previousStatus?: ApprovalStatus
    newStatus?: ApprovalStatus
    note?: string
    bulkAction?: boolean
  } | null
  performedByUserId: string
  performedAt: string
}

interface ApprovalHistoryProps {
  dealId: string
  buyerId: string
  className?: string
}

// Icon mapping for approval status
const STATUS_ICONS: Record<ApprovalStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4 text-green-600" />,
  HOLD: <Pause className="h-4 w-4 text-orange-600" />,
  DENIED: <XCircle className="h-4 w-4 text-red-600" />,
}

// Color mapping for status badges
const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  DENIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

export function ApprovalHistory({ dealId, buyerId, className }: ApprovalHistoryProps) {
  const [events, setEvents] = useState<ApprovalEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch activities filtered to approval-related ones
        const res = await fetch(
          `/api/deals/${dealId}/buyers/${buyerId}/activities?types=APPROVAL_GRANTED,APPROVAL_DENIED,NOTE_ADDED`
        )
        if (res.ok) {
          const data = await res.json()
          // Filter to only approval-related activities
          const approvalEvents = (data.activities || []).filter(
            (a: ApprovalEvent) =>
              a.activityType === 'APPROVAL_GRANTED' ||
              a.activityType === 'APPROVAL_DENIED' ||
              (a.activityType === 'NOTE_ADDED' &&
                ((a.metadata as ApprovalEvent['metadata'])?.newStatus === 'HOLD' ||
                 (a.metadata as ApprovalEvent['metadata'])?.newStatus === 'PENDING'))
          )
          setEvents(approvalEvents)
        }
      } catch (error) {
        console.error('Error fetching approval history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [dealId, buyerId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Approval History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Approval History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No approval changes recorded yet
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <AnimatePresence>
              <motion.div
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {events.map((event, index) => {
                  const meta = event.metadata as ApprovalEvent['metadata']
                  const newStatus = meta?.newStatus
                  const previousStatus = meta?.previousStatus

                  return (
                    <motion.div
                      key={event.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex gap-3 pl-2"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-[11px] w-2.5 h-2.5 rounded-full bg-background border-2 border-border z-10" />

                      {/* Content */}
                      <div className="flex-1 ml-6 bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {newStatus && STATUS_ICONS[newStatus]}
                          <span className="text-sm font-medium">
                            {newStatus
                              ? APPROVAL_STATUS_LABELS[newStatus]
                              : event.activityType.replace(/_/g, ' ')}
                          </span>
                          {meta?.bulkAction && (
                            <Badge variant="outline" className="text-xs">
                              Bulk
                            </Badge>
                          )}
                        </div>

                        {/* Status transition */}
                        {previousStatus && newStatus && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Badge
                              variant="outline"
                              className={cn('text-xs', STATUS_COLORS[previousStatus])}
                            >
                              {APPROVAL_STATUS_LABELS[previousStatus]}
                            </Badge>
                            <span>→</span>
                            <Badge
                              variant="outline"
                              className={cn('text-xs', STATUS_COLORS[newStatus])}
                            >
                              {APPROVAL_STATUS_LABELS[newStatus]}
                            </Badge>
                          </div>
                        )}

                        {/* Note */}
                        {meta?.note && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            "{meta.note}"
                          </p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{event.performedByUserId || 'System'}</span>
                          <span>•</span>
                          <span>
                            {new Date(event.performedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
