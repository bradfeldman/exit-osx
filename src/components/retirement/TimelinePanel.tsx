'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { type RetirementAssumptions, getLifeExpectancy } from '@/lib/retirement/retirement-calculator'

interface TimelinePanelProps {
  assumptions: RetirementAssumptions
  onAssumptionChange: <K extends keyof RetirementAssumptions>(
    key: K,
    value: RetirementAssumptions[K]
  ) => void
  simplified?: boolean
}

export function TimelinePanel({ assumptions, onAssumptionChange, simplified }: TimelinePanelProps) {
  const [retireAgeText, setRetireAgeText] = useState(String(assumptions.retirementAge))
  const [isEditingRetireAge, setIsEditingRetireAge] = useState(false)
  const [lifeExpText, setLifeExpText] = useState(String(assumptions.lifeExpectancy))
  const [isEditingLifeExp, setIsEditingLifeExp] = useState(false)

  const yearsToRetirement = Math.max(0, assumptions.retirementAge - assumptions.currentAge)
  const yearsInRetirement = Math.max(0, assumptions.lifeExpectancy - assumptions.retirementAge)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">Retirement Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current Age */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Current Age</Label>
            <span className="text-sm font-medium text-foreground">{assumptions.currentAge}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Synced from your{' '}
            <Link href="/dashboard/financials/personal" className="text-primary hover:underline">
              Personal Financial Statement
            </Link>
          </p>
        </div>

        {/* Retirement Age */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-foreground">Retirement Age</Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAssumptionChange('retirementAge', Math.max(assumptions.currentAge, assumptions.retirementAge - 1))}
                className="w-8 h-8 rounded-md border border-border hover:bg-secondary active:bg-muted transition-colors flex items-center justify-center text-muted-foreground font-medium"
              >
                −
              </button>
              <Input
                type="text"
                inputMode="numeric"
                value={isEditingRetireAge ? retireAgeText : String(assumptions.retirementAge)}
                onFocus={() => {
                  setRetireAgeText(String(assumptions.retirementAge))
                  setIsEditingRetireAge(true)
                }}
                onChange={(e) => {
                  setRetireAgeText(e.target.value.replace(/[^0-9]/g, ''))
                }}
                onBlur={() => {
                  setIsEditingRetireAge(false)
                  const num = Number(retireAgeText)
                  if (!retireAgeText || isNaN(num)) return
                  onAssumptionChange(
                    'retirementAge',
                    Math.max(assumptions.currentAge, Math.min(100, num))
                  )
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                className="w-16 h-8 text-sm text-center"
              />
              <button
                type="button"
                onClick={() => onAssumptionChange('retirementAge', Math.min(100, assumptions.retirementAge + 1))}
                className="w-8 h-8 rounded-md border border-border hover:bg-secondary active:bg-muted transition-colors flex items-center justify-center text-muted-foreground font-medium"
              >
                +
              </button>
            </div>
          </div>
          <Slider
            value={assumptions.retirementAge}
            onValueChange={(v) => onAssumptionChange('retirementAge', Math.max(assumptions.currentAge, v))}
            min={Math.max(50, assumptions.currentAge)}
            max={80}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.max(50, assumptions.currentAge)}</span>
            <span>SS Full: 67</span>
            <span>80</span>
          </div>
        </div>

        {/* Life Expectancy */}
        {simplified ? (
          <p className="text-xs text-muted-foreground -mt-1">
            Life expectancy: Age {assumptions.lifeExpectancy} (SSA actuarial data + 3 yr buffer)
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm text-foreground">Life Expectancy</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAssumptionChange('lifeExpectancy', Math.max(assumptions.retirementAge, assumptions.lifeExpectancy - 1))}
                  className="w-8 h-8 rounded-md border border-border hover:bg-secondary active:bg-muted transition-colors flex items-center justify-center text-muted-foreground font-medium"
                >
                  −
                </button>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={isEditingLifeExp ? lifeExpText : String(assumptions.lifeExpectancy)}
                  onFocus={() => {
                    setLifeExpText(String(assumptions.lifeExpectancy))
                    setIsEditingLifeExp(true)
                  }}
                  onChange={(e) => {
                    setLifeExpText(e.target.value.replace(/[^0-9]/g, ''))
                  }}
                  onBlur={() => {
                    setIsEditingLifeExp(false)
                    const num = Number(lifeExpText)
                    if (!lifeExpText || isNaN(num)) return
                    onAssumptionChange(
                      'lifeExpectancy',
                      Math.max(assumptions.retirementAge, Math.min(110, num))
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                  className="w-16 h-8 text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() => onAssumptionChange('lifeExpectancy', Math.min(110, assumptions.lifeExpectancy + 1))}
                  className="w-8 h-8 rounded-md border border-border hover:bg-secondary active:bg-muted transition-colors flex items-center justify-center text-muted-foreground font-medium"
                >
                  +
                </button>
              </div>
            </div>
            <Slider
              value={assumptions.lifeExpectancy}
              onValueChange={(v) => onAssumptionChange('lifeExpectancy', Math.max(assumptions.retirementAge, v))}
              min={Math.max(70, assumptions.retirementAge)}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.max(70, assumptions.retirementAge)}</span>
              {assumptions.lifeExpectancy !== getLifeExpectancy(assumptions.currentAge) ? (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => onAssumptionChange('lifeExpectancy', getLifeExpectancy(assumptions.currentAge))}
                >
                  Reset to SSA default ({getLifeExpectancy(assumptions.currentAge)})
                </button>
              ) : (
                <span>SSA: {getLifeExpectancy(assumptions.currentAge)}</span>
              )}
              <span>100</span>
            </div>
          </div>
        )}

        {/* Timeline Summary */}
        <div className="p-3 bg-secondary rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Years to Retirement</p>
              <p className="text-lg font-bold text-primary">{yearsToRetirement}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Years in Retirement</p>
              <p className="text-lg font-bold text-primary">{yearsInRetirement}</p>
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="pt-2">
          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
            {/* Accumulation Phase */}
            <div
              className="absolute left-0 h-full bg-accent-light"
              style={{
                width: `${(yearsToRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
              }}
            />
            {/* Retirement Phase */}
            <div
              className="absolute h-full bg-green-light"
              style={{
                left: `${(yearsToRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
                width: `${(yearsInRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
              }}
            />
            {/* Current marker */}
            <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
            {/* Retirement marker */}
            <div
              className="absolute top-0 w-1 h-full bg-green-dark"
              style={{
                left: `${(yearsToRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Now ({assumptions.currentAge})</span>
            <span>Retire ({assumptions.retirementAge})</span>
            <span>Age {assumptions.lifeExpectancy}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
