'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, Bell, CheckCircle, XCircle } from 'lucide-react'

interface SummaryData {
  companyName: string
  ownerName: string
  partnerName: string | null
  briDirection: 'improving' | 'declining' | 'stable' | null
  briChangePoints: number
  taskSummary: {
    completed: number
    inProgress: number
    pending: number
  }
  lastActivityAt: string | null
  canNudge: boolean
}

export default function PartnerSummaryPage() {
  const params = useParams()
  const accessToken = params.accessToken as string

  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nudgeSent, setNudgeSent] = useState(false)
  const [nudgeLoading, setNudgeLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/partner/summary/${accessToken}`)
      .then(async res => {
        if (!res.ok) {
          setError('This summary link is no longer valid.')
          return
        }
        setData(await res.json())
      })
      .catch(() => setError('Failed to load summary.'))
      .finally(() => setLoading(false))
  }, [accessToken])

  const handleNudge = async () => {
    setNudgeLoading(true)
    try {
      const res = await fetch(`/api/partner/nudge/${accessToken}`, { method: 'POST' })
      if (res.ok) {
        setNudgeSent(true)
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to send nudge.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setNudgeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const DirectionIcon = data.briDirection === 'improving'
    ? TrendingUp
    : data.briDirection === 'declining'
      ? TrendingDown
      : Minus

  const directionColor = data.briDirection === 'improving'
    ? 'text-emerald-600'
    : data.briDirection === 'declining'
      ? 'text-red-600'
      : 'text-zinc-500'

  const totalTasks = data.taskSummary.completed + data.taskSummary.inProgress + data.taskSummary.pending
  const completionPct = totalTasks > 0 ? Math.round((data.taskSummary.completed / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{data.companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Exit readiness summary for {data.partnerName || 'accountability partner'}
          </p>
        </div>

        {/* BRI Direction */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Readiness Trend</p>
                <div className="flex items-center gap-2 mt-1">
                  <DirectionIcon className={`h-5 w-5 ${directionColor}`} />
                  <span className={`text-lg font-bold ${directionColor}`}>
                    {data.briDirection
                      ? `${data.briChangePoints} pts ${data.briDirection}`
                      : 'No trend data yet'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Progress */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">Task Progress</p>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-emerald-600">{data.taskSummary.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-600">{data.taskSummary.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-500">{data.taskSummary.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Activity */}
        {data.lastActivityAt && (
          <p className="text-xs text-muted-foreground text-center">
            Last activity: {new Date(data.lastActivityAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}

        {/* Nudge Button */}
        <div className="text-center pt-2">
          {nudgeSent ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Nudge sent!</span>
            </div>
          ) : (
            <Button
              onClick={handleNudge}
              disabled={!data.canNudge || nudgeLoading}
              variant="outline"
            >
              <Bell className="h-4 w-4 mr-2" />
              {data.canNudge
                ? (nudgeLoading ? 'Sending...' : `Send ${data.ownerName} a Nudge`)
                : 'Nudge already sent today'}
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          No sensitive financial data is shared on this page.
        </p>
      </div>
    </div>
  )
}
