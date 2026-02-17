'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { TextNumericInput } from '@/components/ui/text-numeric-input'

interface TerminalValuePanelProps {
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number
  exitMultiple: number | null
  onMethodChange: (method: 'gordon' | 'exit_multiple') => void
  onPerpetualGrowthChange: (value: number) => void
  onExitMultipleChange: (value: number | null) => void
  industryMultipleLow?: number
  industryMultipleHigh?: number
}

export function TerminalValuePanel({
  terminalMethod,
  perpetualGrowthRate,
  exitMultiple,
  onMethodChange,
  onPerpetualGrowthChange,
  onExitMultipleChange,
  industryMultipleLow = 4.0,
  industryMultipleHigh = 8.0,
}: TerminalValuePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-gray-900">Terminal Value</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Method Toggle */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-700">Calculation Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onMethodChange('gordon')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                terminalMethod === 'gordon'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Gordon Growth
            </button>
            <button
              onClick={() => onMethodChange('exit_multiple')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                terminalMethod === 'exit_multiple'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Exit Multiple
            </button>
          </div>
        </div>

        {/* Gordon Growth Inputs */}
        {terminalMethod === 'gordon' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="perpetualGrowth" className="text-sm text-gray-700">
                  Perpetual Growth Rate
                </Label>
                <div className="flex items-center gap-2">
                  <TextNumericInput
                    id="perpetualGrowth"
                    value={perpetualGrowthRate}
                    onCommit={(v) => onPerpetualGrowthChange(v ?? 0)}
                    multiplier={100}
                    decimals={1}
                    className="w-20 h-7 text-sm text-right"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <span className="font-medium">Gordon Growth Model:</span> Assumes perpetual FCF
                growth at a constant rate. Rate should not exceed long-term GDP growth (typically
                2-3%).
              </p>
            </div>
          </div>
        )}

        {/* Exit Multiple Inputs */}
        {terminalMethod === 'exit_multiple' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="exitMultiple" className="text-sm text-gray-700">
                  Exit EBITDA Multiple
                </Label>
                <div className="flex items-center gap-2">
                  <TextNumericInput
                    id="exitMultiple"
                    value={exitMultiple}
                    onCommit={(v) => onExitMultipleChange(v)}
                    multiplier={1}
                    decimals={1}
                    className="w-20 h-7 text-sm text-right"
                  />
                  <span className="text-xs text-gray-500">x</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-700">
                <span className="font-medium">Exit Multiple Method:</span> Values the company at
                Year 5 based on projected EBITDA multiplied by an exit multiple derived from
                comparable transactions.
              </p>
            </div>

            {/* Quick select buttons */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500 w-full">Quick select:</span>
              {[industryMultipleLow, (industryMultipleLow + industryMultipleHigh) / 2, industryMultipleHigh].map(
                (multiple) => (
                  <button
                    key={multiple}
                    onClick={() => onExitMultipleChange(multiple)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      exitMultiple === multiple
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {multiple.toFixed(1)}x
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
