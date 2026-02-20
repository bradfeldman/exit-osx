'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, TrendingUp, BookOpen, Lock, Play, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { isFreePlaybook } from '@/lib/subscriptions/playbook-access'
import type { PlaybookDefinition } from '../../../prisma/seed-data/playbook-definitions'

interface PlaybookDetailPageProps {
  definition: PlaybookDefinition
}

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: 'Personal Readiness',
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operations',
  LEGAL: 'Legal & Compliance',
  MARKET_GROWTH: 'Growth & Market',
  DEAL_PREP: 'Deal Preparation',
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  NONE: { label: 'Beginner', color: 'var(--green, #34C759)' },
  LOW: { label: 'Easy', color: 'var(--green, #34C759)' },
  MEDIUM: { label: 'Moderate', color: 'var(--orange, #FF9500)' },
  HIGH: { label: 'Advanced', color: 'var(--red, #FF3B30)' },
  VERY_HIGH: { label: 'Expert', color: 'var(--red, #FF3B30)' },
}

function getStoredProgress(slug: string): { currentSection: number; completedSections: number[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const key = `exitosx-${slug.toLowerCase()}`
    const stored = localStorage.getItem(key)
    if (!stored) return null
    const data = JSON.parse(stored)
    return {
      currentSection: data.currentPage ?? 0,
      completedSections: data.completedSections ?? [],
    }
  } catch {
    return null
  }
}

export function PlaybookDetailPage({ definition }: PlaybookDetailPageProps) {
  const router = useRouter()
  const { planTier } = useSubscription()
  const [progress, setProgress] = useState<{ currentSection: number; completedSections: number[] } | null>(null)

  const isFree = isFreePlaybook(definition.slug)
  const isLocked = !isFree && planTier === 'foundation'
  const isInProgress = progress !== null && progress.completedSections.length > 0
  const percentComplete = progress
    ? (progress.completedSections.length / definition.phases.length) * 100
    : 0

  useEffect(() => {
    setProgress(getStoredProgress(definition.slug)) // eslint-disable-line react-hooks/set-state-in-effect -- localStorage read on mount
  }, [definition.slug])

  const handleStart = () => {
    if (isInProgress && progress) {
      router.push(`/playbook/${definition.slug}/${progress.currentSection}`)
    } else {
      router.push(`/playbook/${definition.slug}/0`)
    }
  }

  const difficulty = DIFFICULTY_LABELS[definition.difficulty] ?? DIFFICULTY_LABELS.MEDIUM
  const category = CATEGORY_LABELS[definition.category] ?? definition.category
  const durationText =
    definition.durationLow === definition.durationHigh
      ? `${definition.durationLow} month${definition.durationLow !== 1 ? 's' : ''}`
      : `${definition.durationLow}-${definition.durationHigh} months`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg, #F5F5F7)' }}>
      {/* Top bar */}
      <div className="bg-white border-b px-4 sm:px-6" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
        <div className="max-w-[800px] mx-auto h-14 flex items-center gap-3">
          <Link
            href="/dashboard/playbook"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary, #6E6E73)' }} />
          </Link>
          <span className="text-sm" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
            Back to Programs
          </span>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                color: 'var(--accent, #0071E3)',
                backgroundColor: 'var(--accent-light, #EBF5FF)',
              }}
            >
              {category}
            </span>
            {isLocked && (
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
                <Lock className="w-3 h-3 inline mr-1" />
                Growth
              </span>
            )}
          </div>

          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
            style={{ color: 'var(--text-primary, #1D1D1F)' }}
          >
            {definition.title}
          </h1>

          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
            {definition.description}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary, #8E8E93)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #6E6E73)' }}>Duration</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
              {durationText}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4" style={{ color: 'var(--text-tertiary, #8E8E93)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #6E6E73)' }}>Sections</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
              {definition.phases.length} sections
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-tertiary, #8E8E93)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #6E6E73)' }}>Difficulty</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: difficulty.color }}>
              {difficulty.label}
            </p>
          </div>
        </div>

        {/* Progress (if in progress) */}
        {isInProgress && (
          <div className="bg-white rounded-xl border p-5 mb-8" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
                Your Progress
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent, #0071E3)' }}>
                {Math.round(percentComplete)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentComplete}%`,
                  backgroundColor: 'var(--accent, #0071E3)',
                }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
              {progress!.completedSections.length} of {definition.phases.length} sections completed
            </p>
          </div>
        )}

        {/* Phases list */}
        <div className="bg-white rounded-xl border mb-8" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light, #F2F2F7)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
              Phases
            </h2>
          </div>
          <ul>
            {definition.phases.map((phase, idx) => {
              const isCompleted = progress?.completedSections.includes(idx)
              const isCurrent = progress?.currentSection === idx

              return (
                <li
                  key={idx}
                  className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-light, #F2F2F7)' }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: isCompleted
                        ? 'var(--green, #34C759)'
                        : isCurrent
                          ? 'var(--accent, #0071E3)'
                          : 'var(--border-light, #F2F2F7)',
                      color: isCompleted || isCurrent ? '#FFFFFF' : 'var(--text-tertiary, #8E8E93)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: isCompleted || isCurrent
                          ? 'var(--text-primary, #1D1D1F)'
                          : 'var(--text-secondary, #6E6E73)',
                      }}
                    >
                      {phase.title}
                    </p>
                    {phase.description && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
                        {phase.description}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          {isLocked ? (
            <>
              <Button asChild size="lg" className="h-12 px-8 text-base font-medium">
                <Link href="/dashboard/settings?tab=billing">
                  Upgrade to Growth
                </Link>
              </Button>
              <p className="text-xs" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
                7-day free trial. Cancel anytime.
              </p>
            </>
          ) : (
            <Button size="lg" className="h-12 px-8 text-base font-medium" onClick={handleStart}>
              {isInProgress ? (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Playbook
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
