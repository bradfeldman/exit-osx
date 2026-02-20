'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getBRICategoryLabel, getBRICategoryColor } from '@/lib/constants/bri-categories'
import { ComingUpList } from './ComingUpList'
import { PlaybookSuggestionInline } from '@/components/playbook/PlaybookSuggestionInline'
import { getPlaybookForContext } from '@/lib/playbook/playbook-surface-mapping'
import type { PlanTier } from '@/lib/pricing'

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
  linkedPlaybookSlug: string | null
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
  planTier?: PlanTier
}

function formatTime(hours: number | null): string {
  if (!hours) return ''
  if (hours < 2) return `${Math.round(hours * 60)} min`
  return `${hours} hours`
}

export function NextMoveCard({ task, comingUp, isFreeUser: _isFreeUser = false, onUpgrade: _onUpgrade, planTier = 'foundation' }: NextMoveCardProps) {
  const router = useRouter()
  const [showRationale, setShowRationale] = useState(false)
  const isInProgress = task?.status === 'IN_PROGRESS'
  const playbookMatch = task ? getPlaybookForContext({ briCategory: task.briCategory }) : null
  const playbookSlug = task?.linkedPlaybookSlug ?? playbookMatch?.playbook.slug ?? null

  const handleStart = async () => {
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

      {/* Open full program link */}
      {playbookSlug && (
        <Link
          href={`/playbook/${playbookSlug}`}
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Open full program &rarr;
        </Link>
      )}

      {/* Button Row */}
      <div className="flex items-center gap-3 mt-5">
        <Button size="lg" onClick={handleStart}>
          {isInProgress ? 'Continue →' : 'Start This Task'}
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
