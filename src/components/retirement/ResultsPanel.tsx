'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type RetirementProjections, formatCurrency } from '@/lib/retirement/retirement-calculator'

interface ResultsPanelProps {
  projections: RetirementProjections
  isOnTrack: boolean
}

export function ResultsPanel({ projections, isOnTrack }: ResultsPanelProps) {
  const infiniteMoney = projections.yearsMoneyLasts >= projections.yearsInRetirement + 50

  return (
    <Card className={isOnTrack ? 'border-green-200' : 'border-amber-200'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {isOnTrack ? (
            <>
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-green-700">On Track for Retirement</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-amber-700">Gap to Close</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">After-Tax Today</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(projections.totalAfterTaxToday)}
            </p>
          </div>
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-gray-500">At Retirement</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(projections.valueAtRetirement)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Required Nest Egg</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(projections.requiredNestEgg)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isOnTrack ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-500">{isOnTrack ? 'Surplus' : 'Shortfall'}</p>
            <p className={`text-lg font-bold ${isOnTrack ? 'text-green-700' : 'text-red-700'}`}>
              {isOnTrack ? '+' : ''}
              {formatCurrency(projections.surplusOrShortfall)}
            </p>
          </div>
        </div>

        {/* Longevity Analysis */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Money Lasts</span>
            <span
              className={`text-sm font-bold ${
                infiniteMoney || projections.yearsMoneyLasts >= projections.yearsInRetirement
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {infiniteMoney ? 'Indefinitely' : `${projections.yearsMoneyLasts} years`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                projections.yearsMoneyLasts >= projections.yearsInRetirement
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}
              style={{
                width: `${Math.min(100, (projections.yearsMoneyLasts / projections.yearsInRetirement) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Retirement</span>
            <span>Target: {projections.yearsInRetirement} years</span>
          </div>
        </div>

        {/* Safe Withdrawal */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Safe Withdrawal (4% rule)</span>
            <span className="font-medium text-blue-900">
              {formatCurrency(projections.safeWithdrawalAmount)}/yr
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-blue-700">Sustainable Spending Level</span>
            <span className="font-medium text-blue-900">
              {formatCurrency(projections.sustainableSpendingLevel)}/yr
            </span>
          </div>
        </div>

        {/* Action Items */}
        {!isOnTrack && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-2">To Close the Gap:</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>
                Save an additional{' '}
                <span className="font-medium">
                  {formatCurrency(projections.additionalNeededToday)}
                </span>{' '}
                today
              </li>
              <li>
                Work{' '}
                <span className="font-medium">
                  {Math.ceil(
                    Math.abs(projections.surplusOrShortfall) / projections.annualWithdrawalNeeded
                  )}
                </span>{' '}
                additional years
              </li>
              <li>
                Reduce spending by{' '}
                <span className="font-medium">
                  {formatCurrency(
                    Math.abs(projections.surplusOrShortfall) / projections.yearsInRetirement
                  )}
                </span>
                /yr
              </li>
            </ul>
          </div>
        )}

        {isOnTrack && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-2">Options with Your Surplus:</p>
            <ul className="text-xs text-green-700 space-y-1">
              {(() => {
                // Calculate years earlier, capped at years to retirement
                const yearsEarlier = projections.annualWithdrawalNeeded > 0
                  ? Math.floor(projections.surplusOrShortfall / projections.annualWithdrawalNeeded)
                  : projections.yearsToRetirement
                const cappedYears = Math.min(yearsEarlier, projections.yearsToRetirement)

                if (cappedYears >= projections.yearsToRetirement) {
                  return <li><span className="font-medium">You could retire now</span> based on your current assets</li>
                } else if (cappedYears > 0) {
                  return (
                    <li>
                      Retire <span className="font-medium">{cappedYears}</span> years earlier
                    </li>
                  )
                }
                return null
              })()}
              <li>
                Increase spending by{' '}
                <span className="font-medium">
                  {formatCurrency(projections.surplusOrShortfall / projections.yearsInRetirement)}
                </span>
                /yr
              </li>
              <li>Leave a larger estate for heirs</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
