'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ActionCenter } from './ActionCenter'

interface RiskCategory {
  key: string
  label: string
  score: number
}

interface Constraint {
  category: string
  score: number
}

interface RiskBreakdownProps {
  categories: RiskCategory[]
  topConstraints: Constraint[]
  hasAssessment?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function RiskBreakdown({ categories, topConstraints: _topConstraints, hasAssessment = true }: RiskBreakdownProps) {
  return (
    <div className="py-8 border-t border-gray-100">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
        Buyer Readiness Index (BRI) Breakdown
      </h3>

      {/* Assessment CTA when no assessment completed */}
      {!hasAssessment && (
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">10-Minute Risk Assessment</h3>
                <p className="text-white/80 text-sm mt-1 max-w-md">
                  Discover where buyers see risk in your business and how it impacts your Estimated Market Value.
                </p>
              </div>
            </div>
            <Link href="/dashboard/assessment" className="flex-shrink-0">
              <Button size="lg" variant="secondary" className="font-semibold shadow-md w-full md:w-auto">
                Start Assessment
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Risk Category Grid - 2x3 */}
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 ${!hasAssessment ? 'opacity-50' : ''}`}>
        {categories.map((category) => (
          <div key={category.key} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{category.label}</span>
                <span className={`text-sm font-bold ${hasAssessment ? getScoreTextColor(category.score) : 'text-gray-400'}`}>
                  {category.score}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${hasAssessment ? getScoreColor(category.score) : 'bg-gray-300'}`}
                  style={{ width: `${Math.max(category.score, 5)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Center - Replaces Top Value Constraints */}
      <ActionCenter hasAssessment={hasAssessment} />
    </div>
  )
}
