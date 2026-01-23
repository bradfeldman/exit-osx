'use client'

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
