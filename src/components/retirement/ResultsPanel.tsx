'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type RetirementProjections, formatCurrency } from '@/lib/retirement/retirement-calculator'

interface ResultsPanelProps {
  projections: RetirementProjections
  isOnTrack: boolean
}

export function ResultsPanel({ projections, isOnTrack }: ResultsPanelProps) {
  const infiniteMoney = projections.yearsMoneyLasts >= projections.yearsInRetirement + 50

  return (
    <Card className={isOnTrack ? 'border-green/20' : 'border-orange/20'}>
      {/* Hero Answer */}
      <div className={`px-6 py-5 rounded-t-lg ${isOnTrack ? 'bg-green-light' : 'bg-orange-light'}`}>
        <p className={`text-2xl font-bold ${isOnTrack ? 'text-green-dark' : 'text-orange-dark'}`}>
          {isOnTrack ? 'Yes — you can retire if you sell.' : 'Not yet — there\u2019s a gap to close.'}
        </p>
        <p className={`text-sm mt-1 ${isOnTrack ? 'text-green-dark' : 'text-orange-dark'}`}>
          {isOnTrack
            ? `You have a ${formatCurrency(projections.surplusOrShortfall)} surplus beyond what you need.`
            : `You\u2019re ${formatCurrency(Math.abs(projections.surplusOrShortfall))} short of your retirement goal.`}
        </p>
      </div>
      <CardContent className="space-y-4 pt-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground">After-Tax Today</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(projections.totalAfterTaxToday)}
            </p>
          </div>
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground">At Retirement</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(projections.valueAtRetirement)}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground">Required Nest Egg</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(projections.requiredNestEgg)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(projections.requiredNestEgg / projections.inflationFactor)} in today&apos;s $
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isOnTrack ? 'bg-green-light' : 'bg-red-light'}`}>
            <p className="text-xs text-muted-foreground">{isOnTrack ? 'Surplus' : 'Shortfall'}</p>
            <p className={`text-lg font-bold ${isOnTrack ? 'text-green-dark' : 'text-red-dark'}`}>
              {isOnTrack ? '+' : ''}
              {formatCurrency(projections.surplusOrShortfall)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOnTrack ? '+' : ''}{formatCurrency(projections.surplusOrShortfall / projections.inflationFactor)} in today&apos;s $
            </p>
          </div>
        </div>

        {/* Longevity Analysis */}
        <div className="p-3 bg-secondary rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Money Lasts</span>
            <span
              className={`text-sm font-bold ${
                infiniteMoney || projections.yearsMoneyLasts >= projections.yearsInRetirement
                  ? 'text-green-dark'
                  : 'text-red-dark'
              }`}
            >
              {infiniteMoney ? 'Indefinitely' : `${projections.yearsMoneyLasts} years`}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                projections.yearsMoneyLasts >= projections.yearsInRetirement
                  ? 'bg-green'
                  : 'bg-red'
              }`}
              style={{
                width: `${Math.min(100, (projections.yearsMoneyLasts / projections.yearsInRetirement) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Retirement</span>
            <span>Target: {projections.yearsInRetirement} years</span>
          </div>
        </div>

        {/* Safe Withdrawal */}
        <div className="p-3 bg-accent-light rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-primary">Safe Withdrawal (4% rule)</span>
            <span className="font-medium text-primary">
              {formatCurrency(projections.safeWithdrawalAmount)}/yr
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-primary">Sustainable Spending Level</span>
            <span className="font-medium text-primary">
              {formatCurrency(projections.sustainableSpendingLevel)}/yr
            </span>
          </div>
        </div>

        {/* Action Items */}
        {!isOnTrack && (
          <>
            <div className="p-3 bg-orange-light border border-orange/20 rounded-lg">
              <p className="text-sm font-medium text-orange-dark mb-2">To Close the Gap:</p>
              <ul className="text-xs text-orange-dark space-y-1">
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

            {/* Journey Connection - Link to Playbook */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground mb-3">
                <span className="font-medium">Another option:</span> Increase your business value
                before selling. Your action plan identifies specific improvements that could
                boost your exit proceeds.
              </p>
              <Link href="/dashboard/action-center">
                <Button variant="outline" size="sm" className="text-primary border-primary/30 hover:bg-primary/5">
                  View Actions to Increase Exit Value →
                </Button>
              </Link>
            </div>
          </>
        )}

        {isOnTrack && (
          <>
            <div className="p-3 bg-green-light border border-green/20 rounded-lg">
              <p className="text-sm font-medium text-green-dark mb-2">Options with Your Surplus:</p>
              <ul className="text-xs text-green-dark space-y-1">
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

            {/* Success Context */}
            <div className="p-3 bg-green-light/50 border border-green/20 rounded-lg">
              <p className="text-sm text-green-dark">
                <span className="font-medium">You&apos;re on track.</span> Your projected exit proceeds
                plus existing assets should support your retirement goals. Consider the action plan
                to build additional cushion.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
