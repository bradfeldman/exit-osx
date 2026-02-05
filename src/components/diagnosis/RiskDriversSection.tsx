'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RiskDriverRow } from './RiskDriverRow'

interface RiskDriver {
  id: string
  name: string
  category: string
  categoryLabel: string
  dollarImpact: number
  currentScore: number
  optionPosition: number
  totalOptions: number
  questionText: string
  buyerLogic: string | null
  hasLinkedTask: boolean
  linkedTaskId: string | null
  linkedTaskTitle: string | null
  linkedTaskStatus: string | null
}

interface RiskDriversSectionProps {
  riskDrivers: RiskDriver[]
  hasAssessment: boolean
  isFreeUser?: boolean
  onUpgrade?: () => void
}

export function RiskDriversSection({
  riskDrivers,
  hasAssessment,
  isFreeUser = false,
  onUpgrade,
}: RiskDriversSectionProps) {
  const [showAll, setShowAll] = useState(false)

  if (!hasAssessment) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">WHAT&apos;S COSTING YOU THE MOST</h2>
          <p className="text-sm text-muted-foreground">Specific risks ranked by dollar impact</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Complete your first category assessment to see specific risk drivers.
          </p>
          <Button className="mt-3" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Start Assessment →
          </Button>
        </div>
      </div>
    )
  }

  if (riskDrivers.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">WHAT&apos;S COSTING YOU THE MOST</h2>
          <p className="text-sm text-muted-foreground">Specific risks ranked by dollar impact</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No significant risk drivers found. Your buyer readiness is strong!
          </p>
        </div>
      </div>
    )
  }

  const visibleDrivers = showAll ? riskDrivers : riskDrivers.slice(0, 5)

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">WHAT&apos;S COSTING YOU THE MOST</h2>
        <p className="text-sm text-muted-foreground">Specific risks ranked by dollar impact</p>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="px-5">
          {visibleDrivers.map((driver, index) => (
            <div key={driver.id}>
              <RiskDriverRow
                rank={index + 1}
                name={driver.name}
                category={driver.category}
                categoryLabel={driver.categoryLabel}
                dollarImpact={driver.dollarImpact}
                optionPosition={driver.optionPosition}
                totalOptions={driver.totalOptions}
                buyerLogic={driver.buyerLogic}
                hasLinkedTask={driver.hasLinkedTask}
                linkedTaskId={driver.linkedTaskId}
                linkedTaskTitle={driver.linkedTaskTitle}
                linkedTaskStatus={driver.linkedTaskStatus}
                isFreeUser={isFreeUser}
                onUpgrade={onUpgrade}
              />
              {index < visibleDrivers.length - 1 && (
                <div className="border-t border-border" />
              )}
            </div>
          ))}
        </div>

        {riskDrivers.length > 5 && (
          <div className="px-5 pb-4">
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Show less ↑'
                : `Show all ${riskDrivers.length} risk drivers ↓`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
