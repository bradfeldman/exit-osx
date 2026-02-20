'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, TrendingUp, ArrowRight } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'
import { FirstMoveCard } from './FirstMoveCard'

interface QuickWin {
  id: string
  title: string
  rawImpact: number
  briCategory: string
}

interface FirstVisitDashboardProps {
  companyName: string
  briScore: number | null
  firstTask: {
    id: string
    title: string
    description: string
    briCategory: string
    estimatedHours: number | null
    rawImpact: number
    buyerConsequence: string | null
  } | null
  quickWins: QuickWin[]
  onStartFirstMove: () => void
  onDismissWelcome: () => void
}

function getBriTier(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Strong', color: 'var(--green, #34C759)' }
  if (score >= 70) return { label: 'Solid foundation', color: 'var(--accent, #0071E3)' }
  if (score >= 55) return { label: 'Typical for your stage', color: 'var(--orange, #FF9500)' }
  return { label: 'Early stage', color: 'var(--red, #FF3B30)' }
}

export function FirstVisitDashboard({
  companyName,
  briScore,
  firstTask,
  quickWins,
  onStartFirstMove,
  onDismissWelcome,
}: FirstVisitDashboardProps) {
  const [showWelcome, setShowWelcome] = useState(true)
  const tier = briScore ? getBriTier(briScore) : null

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* Welcome Banner */}
      {showWelcome && (
        <div
          className="bg-white rounded-2xl border p-5 relative"
          style={{ borderColor: 'var(--border, #E5E7EB)' }}
        >
          <button
            onClick={() => {
              setShowWelcome(false)
              onDismissWelcome()
            }}
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Dismiss welcome message"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-tertiary, #8E8E93)' }} />
          </button>

          <div className="flex items-start gap-5">
            <div className="flex-1">
              <h1
                className="text-xl font-bold tracking-tight mb-1"
                style={{ color: 'var(--text-primary, #1D1D1F)' }}
              >
                Welcome, {companyName.split(' ')[0]}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
                {briScore != null ? (
                  <>
                    Your Buyer Readiness Index is <strong>{Math.round(briScore)}/100</strong>.{' '}
                    {tier && <span style={{ color: tier.color }}>{tier.label}.</span>}{' '}
                    Here&apos;s your biggest opportunity to improve.
                  </>
                ) : (
                  'Let\u2019s get started by identifying your biggest opportunity to improve exit readiness.'
                )}
              </p>
            </div>

            {/* BRI Score Ring */}
            {briScore != null && (
              <div className="shrink-0 w-16 h-16 relative">
                <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    strokeWidth="4"
                    stroke="var(--border-light, #F2F2F7)"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    strokeWidth="4"
                    stroke={tier?.color ?? 'var(--accent, #0071E3)'}
                    strokeDasharray={`${(briScore / 100) * 175.9} 175.9`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{ color: 'var(--text-primary, #1D1D1F)' }}
                  >
                    {Math.round(briScore)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* First Move Card */}
      {firstTask && (
        <FirstMoveCard task={firstTask} onStart={onStartFirstMove} />
      )}

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-secondary, #6E6E73)' }}
          >
            Quick Wins
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {quickWins.map((win) => (
              <Link
                key={win.id}
                href={`/dashboard/actions?task=${win.id}`}
                className="bg-white rounded-xl border p-4 min-w-[160px] max-w-[200px] shrink-0 snap-start hover:shadow-sm transition-shadow"
                style={{ borderColor: 'var(--border, #E5E7EB)' }}
              >
                <p
                  className="text-sm font-medium line-clamp-2 mb-2"
                  style={{ color: 'var(--text-primary, #1D1D1F)' }}
                >
                  {win.title}
                </p>
                {win.rawImpact > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--green-light, #E8F8ED)', color: 'var(--green, #34C759)' }}
                  >
                    <TrendingUp className="w-3 h-3" />
                    +${win.rawImpact >= 1000 ? `${Math.round(win.rawImpact / 1000)}K` : win.rawImpact.toLocaleString()}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quiet Footer */}
      <div className="pt-4 space-y-2">
        <Link
          href="/dashboard/diagnosis"
          className="flex items-center gap-2 text-sm transition-colors hover:underline"
          style={{ color: 'var(--text-tertiary, #8E8E93)' }}
        >
          Want a deeper picture? Take the full assessment (15 min)
          <ArrowRight className="w-3 h-3" />
        </Link>
        <Link
          href="/dashboard/financials"
          className="flex items-center gap-2 text-sm transition-colors hover:underline"
          style={{ color: 'var(--text-tertiary, #8E8E93)' }}
        >
          Connect your financials for a precise valuation
          <ArrowRight className="w-3 h-3" />
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 text-sm transition-colors hover:underline"
          style={{ color: 'var(--text-tertiary, #8E8E93)' }}
        >
          Edit your business profile
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
