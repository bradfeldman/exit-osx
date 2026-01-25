'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { type RetirementAssumptions } from '@/lib/retirement/retirement-calculator'

interface TimelinePanelProps {
  assumptions: RetirementAssumptions
  onAssumptionChange: <K extends keyof RetirementAssumptions>(
    key: K,
    value: RetirementAssumptions[K]
  ) => void
}

export function TimelinePanel({ assumptions, onAssumptionChange }: TimelinePanelProps) {
  const yearsToRetirement = Math.max(0, assumptions.retirementAge - assumptions.currentAge)
  const yearsInRetirement = Math.max(0, assumptions.lifeExpectancy - assumptions.retirementAge)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-gray-900">Retirement Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current Age */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Current Age</Label>
            <Input
              type="number"
              min={18}
              max={100}
              value={assumptions.currentAge}
              onChange={(e) =>
                onAssumptionChange('currentAge', Math.min(100, Math.max(18, Number(e.target.value))))
              }
              className="w-20 h-8 text-sm text-right"
            />
          </div>
          <Slider
            value={assumptions.currentAge}
            onValueChange={(v) => onAssumptionChange('currentAge', v)}
            min={18}
            max={80}
            step={1}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>18</span>
            <span>80</span>
          </div>
        </div>

        {/* Retirement Age */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Retirement Age</Label>
            <Input
              type="number"
              min={assumptions.currentAge}
              max={100}
              value={assumptions.retirementAge}
              onChange={(e) =>
                onAssumptionChange(
                  'retirementAge',
                  Math.max(assumptions.currentAge, Math.min(100, Number(e.target.value)))
                )
              }
              className="w-20 h-8 text-sm text-right"
            />
          </div>
          <Slider
            value={assumptions.retirementAge}
            onValueChange={(v) => onAssumptionChange('retirementAge', Math.max(assumptions.currentAge, v))}
            min={50}
            max={80}
            step={1}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>50</span>
            <span>SS Full: 67</span>
            <span>80</span>
          </div>
        </div>

        {/* Life Expectancy */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm text-gray-700">Life Expectancy</Label>
            <Input
              type="number"
              min={assumptions.retirementAge}
              max={110}
              value={assumptions.lifeExpectancy}
              onChange={(e) =>
                onAssumptionChange(
                  'lifeExpectancy',
                  Math.max(assumptions.retirementAge, Math.min(110, Number(e.target.value)))
                )
              }
              className="w-20 h-8 text-sm text-right"
            />
          </div>
          <Slider
            value={assumptions.lifeExpectancy}
            onValueChange={(v) => onAssumptionChange('lifeExpectancy', Math.max(assumptions.retirementAge, v))}
            min={70}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>70</span>
            <span>Avg: 85</span>
            <span>100</span>
          </div>
        </div>

        {/* Timeline Summary */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Years to Retirement</p>
              <p className="text-lg font-bold text-primary">{yearsToRetirement}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Years in Retirement</p>
              <p className="text-lg font-bold text-primary">{yearsInRetirement}</p>
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="pt-2">
          <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
            {/* Accumulation Phase */}
            <div
              className="absolute left-0 h-full bg-blue-200"
              style={{
                width: `${(yearsToRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
              }}
            />
            {/* Retirement Phase */}
            <div
              className="absolute h-full bg-green-200"
              style={{
                left: `${(yearsToRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
                width: `${(yearsInRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
              }}
            />
            {/* Current marker */}
            <div className="absolute left-0 top-0 w-1 h-full bg-blue-600" />
            {/* Retirement marker */}
            <div
              className="absolute top-0 w-1 h-full bg-green-600"
              style={{
                left: `${(yearsToRetirement / (yearsToRetirement + yearsInRetirement)) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Now ({assumptions.currentAge})</span>
            <span>Retire ({assumptions.retirementAge})</span>
            <span>Age {assumptions.lifeExpectancy}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
