'use client'

import Link from 'next/link'
import { ArrowRight, Clock, TrendingUp } from 'lucide-react'

const BRI_CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

interface FirstMoveCardProps {
  task: {
    id: string
    title: string
    description: string
    briCategory: string
    estimatedHours: number | null
    rawImpact: number
    buyerConsequence: string | null
  }
  onStart: () => void
}

export function FirstMoveCard({ task, onStart }: FirstMoveCardProps) {
  const categoryLabel = BRI_CATEGORY_LABELS[task.briCategory] ?? task.briCategory

  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: 'var(--border, #E5E7EB)' }}
    >
      {/* Recommended badge */}
      <div className="px-5 pt-4">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'var(--orange-light, #FFF6E8)', color: 'var(--orange, #FF9500)' }}
        >
          Recommended First Move
        </span>
      </div>

      <div className="p-5 pt-3">
        {/* Title */}
        <h3
          className="text-lg font-bold leading-tight mb-2"
          style={{ color: 'var(--text-primary, #1D1D1F)' }}
        >
          {task.title}
        </h3>

        {/* Why it matters */}
        {task.buyerConsequence && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
            {task.buyerConsequence}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-5">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--accent-light, #EBF5FF)', color: 'var(--accent, #0071E3)' }}
          >
            {categoryLabel}
          </span>
          {task.estimatedHours && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
              <Clock className="w-3.5 h-3.5" />
              {task.estimatedHours < 1 ? `${Math.round(task.estimatedHours * 60)} min` : `${task.estimatedHours}h`}
            </span>
          )}
          {task.rawImpact > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--green, #34C759)' }}>
              <TrendingUp className="w-3.5 h-3.5" />
              +${task.rawImpact >= 1000 ? `${Math.round(task.rawImpact / 1000)}K` : task.rawImpact.toLocaleString()}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--accent, #0071E3)' }}
          >
            Start This Action
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/dashboard/actions"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary, #6E6E73)' }}
          >
            See all actions
          </Link>
        </div>
      </div>
    </div>
  )
}
