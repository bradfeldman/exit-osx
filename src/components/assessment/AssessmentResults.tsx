'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CategoryScore {
  category: string
  score: number
}

interface Summary {
  briScore: number
  coreScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  finalMultiple: string
}

interface AssessmentResultsProps {
  results: {
    summary?: Summary
    categoryScores?: CategoryScore[]
  }
  onViewDashboard: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

function getProgressColor(score: number): string {
  if (score >= 75) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function AssessmentResults({ results, onViewDashboard }: AssessmentResultsProps) {
  const summary = results.summary
  const categoryScores = results.categoryScores || []

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Results not available</p>
        <Button onClick={onViewDashboard} className="mt-4">
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8 bg-gradient-to-b from-green-50 to-white rounded-lg border border-green-200">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Assessment Complete!</h1>
        <p className="text-gray-600 mt-2">
          Your Buyer Readiness Index has been calculated
        </p>
      </div>

      {/* Main Scores */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Buyer Readiness Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-bold ${getScoreColor(summary.briScore)}`}>
                {summary.briScore}
              </span>
              <span className="text-2xl text-gray-500 mb-1">/ 100</span>
            </div>
            <p className="text-sm text-primary mt-2">Buyer Readiness Index</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900">
              {formatCurrency(summary.currentValue)}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {summary.finalMultiple}x EBITDA multiple
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Value Gap */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Value Gap</p>
              <p className="text-3xl font-bold text-purple-900">
                {formatCurrency(summary.valueGap)}
              </p>
              <p className="text-sm text-purple-600 mt-1">
                Potential value you could unlock by improving your BRI score
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-700">Potential Value</p>
              <p className="text-2xl font-semibold text-purple-800">
                {formatCurrency(summary.potentialValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryScores.map((cs) => {
              const scorePercent = Math.round(cs.score * 100)
              return (
                <div key={cs.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {CATEGORY_LABELS[cs.category] || cs.category}
                    </span>
                    <span className={`text-sm font-bold ${getScoreColor(scorePercent)}`}>
                      {scorePercent}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(scorePercent)}`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Review Your Playbook</h4>
                <p className="text-sm text-gray-600">
                  See prioritized actions to improve your BRI score and close the value gap.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Track Your Progress</h4>
                <p className="text-sm text-gray-600">
                  Complete tasks and retake the assessment to see your improvement over time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Run Scenarios</h4>
                <p className="text-sm text-gray-600">
                  Model how specific improvements would impact your valuation.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={onViewDashboard}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
