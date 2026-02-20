'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  BarChart3,
  Clock,
} from 'lucide-react'

interface OutreachStatsProps {
  dealId: string
  buyerId?: string // If provided, shows stats for single buyer
  className?: string
}

interface ActivityStats {
  totalActivities: number
  emailsSent: number
  emailsReceived: number
  callsMade: number
  callsReceived: number
  meetingsScheduled: number
  meetingsCompleted: number
  lastActivityAt: string | null
  averageResponseTime: number | null // in hours
}

export function OutreachStats({ dealId, buyerId, className }: OutreachStatsProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        // Fetch all activities and calculate stats client-side
        // In production, this would be a dedicated stats endpoint
        const endpoint = buyerId
          ? `/api/deals/${dealId}/buyers/${buyerId}/activities?limit=1000`
          : `/api/deals/${dealId}/activities?limit=1000`

        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          const activities = data.activities || []

          // Calculate stats
          const calculatedStats: ActivityStats = {
            totalActivities: activities.length,
            emailsSent: activities.filter(
              (a: { activityType: string }) => a.activityType === 'EMAIL_SENT'
            ).length,
            emailsReceived: activities.filter(
              (a: { activityType: string }) => a.activityType === 'EMAIL_RECEIVED'
            ).length,
            callsMade: activities.filter(
              (a: { activityType: string }) => a.activityType === 'CALL_OUTBOUND'
            ).length,
            callsReceived: activities.filter(
              (a: { activityType: string }) => a.activityType === 'CALL_INBOUND'
            ).length,
            meetingsScheduled: activities.filter(
              (a: { activityType: string }) => a.activityType === 'MEETING_SCHEDULED'
            ).length,
            meetingsCompleted: activities.filter(
              (a: { activityType: string }) => a.activityType === 'MEETING_COMPLETED'
            ).length,
            lastActivityAt:
              activities.length > 0 ? activities[0].performedAt : null,
            averageResponseTime: null, // Would need more complex calculation
          }

          setStats(calculatedStats)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [dealId, buyerId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Outreach Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const totalEmails = stats.emailsSent + stats.emailsReceived
  const totalCalls = stats.callsMade + stats.callsReceived
  const meetingConversion =
    stats.meetingsScheduled > 0
      ? Math.round((stats.meetingsCompleted / stats.meetingsScheduled) * 100)
      : 0

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Outreach Stats
          <Badge variant="secondary" className="ml-auto">
            {stats.totalActivities} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Emails */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              <span className="text-2xl font-bold">{totalEmails}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.emailsSent} sent, {stats.emailsReceived} received
            </p>
          </div>

          {/* Calls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-dark">
              <Phone className="h-5 w-5" />
              <span className="text-2xl font-bold">{totalCalls}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.callsMade} made, {stats.callsReceived} received
            </p>
          </div>

          {/* Meetings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-dark">
              <Calendar className="h-5 w-5" />
              <span className="text-2xl font-bold">{stats.meetingsScheduled}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              meetings scheduled
            </p>
          </div>

          {/* Completed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-dark">
              <CheckCircle className="h-5 w-5" />
              <span className="text-2xl font-bold">{stats.meetingsCompleted}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              meetings completed
            </p>
          </div>
        </div>

        {/* Meeting Conversion */}
        {stats.meetingsScheduled > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Meeting Conversion</span>
              <span className="font-medium">{meetingConversion}%</span>
            </div>
            <Progress value={meetingConversion} className="h-2" />
          </div>
        )}

        {/* Last Activity */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last activity
          </div>
          <span className="text-sm font-medium">
            {formatLastActivity(stats.lastActivityAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
