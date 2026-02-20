'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, Bell, CheckCircle, XCircle } from 'lucide-react'
import styles from '@/components/partner/partner.module.css'

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
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.pageCentered}>
        <div className={styles.cardCentered}>
          <XCircle className={styles.statusIcon} size={48} />
          <h1 className={styles.cardTitle}>Access Denied</h1>
          <p className={styles.cardBody}>{error}</p>
        </div>
      </div>
    )
  }

  const DirectionIcon = data.briDirection === 'improving'
    ? TrendingUp
    : data.briDirection === 'declining'
      ? TrendingDown
      : Minus

  const trendClass = data.briDirection === 'improving'
    ? styles.trendImproving
    : data.briDirection === 'declining'
      ? styles.trendDeclining
      : styles.trendStable

  const totalTasks = data.taskSummary.completed + data.taskSummary.inProgress + data.taskSummary.pending
  const completionPct = totalTasks > 0 ? Math.round((data.taskSummary.completed / totalTasks) * 100) : 0

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>{data.companyName}</h1>
          <p className={styles.headerSubtitle}>
            Exit readiness summary for {data.partnerName || 'accountability partner'}
          </p>
        </div>

        {/* BRI Direction */}
        <div className={styles.card}>
          <div className={styles.trendRow}>
            <div>
              <p className={styles.trendLabel}>Readiness Trend</p>
              <div className={styles.trendValue}>
                <DirectionIcon className={trendClass} size={20} />
                <span className={`${styles.trendText} ${trendClass}`}>
                  {data.briDirection
                    ? `${data.briChangePoints} pts ${data.briDirection}`
                    : 'No trend data yet'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Progress */}
        <div className={styles.card}>
          <p className={styles.progressLabel}>Task Progress</p>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className={styles.taskGrid}>
            <div className={styles.taskStat}>
              <p className={`${styles.taskStatValue} ${styles.taskStatValueCompleted}`}>
                {data.taskSummary.completed}
              </p>
              <p className={styles.taskStatLabel}>Completed</p>
            </div>
            <div className={styles.taskStat}>
              <p className={`${styles.taskStatValue} ${styles.taskStatValueInProgress}`}>
                {data.taskSummary.inProgress}
              </p>
              <p className={styles.taskStatLabel}>In Progress</p>
            </div>
            <div className={styles.taskStat}>
              <p className={`${styles.taskStatValue} ${styles.taskStatValuePending}`}>
                {data.taskSummary.pending}
              </p>
              <p className={styles.taskStatLabel}>Pending</p>
            </div>
          </div>
        </div>

        {/* Last Activity */}
        {data.lastActivityAt && (
          <p className={styles.lastActivity}>
            Last activity:{' '}
            {new Date(data.lastActivityAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}

        {/* Nudge Button */}
        <div className={styles.nudgeSection}>
          {nudgeSent ? (
            <div className={styles.nudgeSentRow}>
              <CheckCircle size={16} />
              <span className={styles.nudgeSentText}>Nudge sent!</span>
            </div>
          ) : (
            <Button
              onClick={handleNudge}
              disabled={!data.canNudge || nudgeLoading}
              variant="outline"
            >
              <Bell size={16} />
              {data.canNudge
                ? (nudgeLoading ? 'Sending...' : `Send ${data.ownerName} a Nudge`)
                : 'Nudge already sent today'}
            </Button>
          )}
        </div>

        <p className={styles.disclaimer}>
          No sensitive financial data is shared on this page.
        </p>
      </div>
    </div>
  )
}
