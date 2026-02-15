'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getBRICategoryLabel, getBRICategoryColor } from '@/lib/constants/bri-categories'
import { formatCurrency } from '@/lib/utils/currency'
import { ComingUpList } from './ComingUpList'

interface NextMoveTask {
  id: string
  title: string
  description: string
  briCategory: string
  estimatedHours: number | null
  rawImpact: number
  status: string
  buyerConsequence: string | null
  effortLevel: string
  startedAt: string | null
}

interface ComingUpTask {
  id: string
  title: string
  estimatedHours: number | null
  rawImpact: number
  briCategory: string
}

interface NextMoveCardProps {
  task: NextMoveTask | null
  comingUp: ComingUpTask[]
  isFreeUser?: boolean
  onUpgrade?: () => void
}

function formatTime(hours: number | null): string {
  if (!hours) return ''
  if (hours < 2) return `${Math.round(hours * 60)} min`
  return `${hours} hours`
}

export function NextMoveCard({ task, comingUp, isFreeUser = false, onUpgrade }: NextMoveCardProps) {
  const router = useRouter()
  const [showRationale, setShowRationale] = useState(false)
  const isInProgress = task?.status === 'IN_PROGRESS'

  const handleStart = async () => {
    if (isFreeUser) {
      onUpgrade?.()
      return
    }
    if (task) {
      // Start the task immediately (mark as IN_PROGRESS) then navigate
      if (task.status !== 'IN_PROGRESS') {
        try {
          await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'IN_PROGRESS' }),
          })
        } catch {
          // Navigate anyway even if status update fails
        }
      }
      router.push(`/dashboard/actions?taskId=${task.id}`)
    }
  }

  // Empty state: no tasks
  if (!task) {
    return (
      <div className="bg-card border-2 border-primary/20 rounded-xl p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-wider uppercase text-primary">
          WHAT&apos;S NEXT
        </p>
        <p className="text-xl font-semibold text-foreground mt-3">
          You&apos;ve completed all current tasks. Nice work.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Your next assessment will generate new recommendations based on your updated profile.
        </p>
        <Button className="mt-5" onClick={() => router.push('/dashboard/diagnosis')}>
          Start Re-Assessment
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-card border-2 border-primary/20 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <p className="text-xs font-semibold tracking-wider uppercase text-primary">
        {isInProgress ? 'CONTINUE WHERE YOU LEFT OFF' : 'YOUR NEXT MOVE'}
      </p>

      {/* Task Title */}
      <p className="text-xl font-semibold text-foreground mt-3">
        {task.title}
      </p>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
        {task.estimatedHours && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatTime(task.estimatedHours)}
            {isInProgress ? ' remaining' : ''}
          </span>
        )}
        {task.rawImpact > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            ~{formatCurrency(task.rawImpact)} value impact
          </span>
        )}
        <Badge variant="secondary" className={getBRICategoryColor(task.briCategory)}>
          {getBRICategoryLabel(task.briCategory)}
        </Badge>
      </div>

      {/* Buyer Consequence */}
      {task.buyerConsequence && (
        <p className="mt-4 text-sm text-muted-foreground italic leading-relaxed before:content-['\201C'] after:content-['\201D'] line-clamp-2">
          {task.buyerConsequence}
        </p>
      )}

      {/* In Progress: show when started */}
      {isInProgress && task.startedAt && (
        <p className="text-xs text-muted-foreground mt-2">
          Started {new Date(task.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}

      {/* Button Row */}
      <div className="flex items-center gap-3 mt-5">
        <Button size="lg" onClick={handleStart}>
          {isFreeUser
            ? 'Upgrade to Start Closing Your Gap →'
            : isInProgress
              ? 'Continue →'
              : 'Start This Task'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRationale(!showRationale)}
        >
          Why this?
          {showRationale ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
      </div>

      {/* Expandable Rationale */}
      {showRationale && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm space-y-2">
          <p className="text-foreground font-medium">
            {getBRICategoryLabel(task.briCategory)}
          </p>
          <p className="text-muted-foreground">
            {task.description}
          </p>
          {task.estimatedHours && (
            <p className="text-muted-foreground text-xs">
              Most founders complete this in one sitting.
            </p>
          )}
        </div>
      )}

      {/* Coming Up */}
      <ComingUpList tasks={comingUp} />
    </div>
  )
}
