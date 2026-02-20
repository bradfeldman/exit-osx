'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { formatPercent, type DCFResults } from '@/lib/valuation/dcf-calculator'

interface ValuationResultsProps {
  results: DCFResults | null
  wacc: number
  netDebt: number
  isLoading?: boolean
  workingCapital?: { t12: number | null; lastFY: number | null; threeYearAvg: number | null } | null
}

export function ValuationResults({ results, wacc, netDebt, isLoading, workingCapital }: ValuationResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">DCF Valuation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!results) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-foreground">DCF Valuation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Configure inputs to see valuation results
          </div>
        </CardContent>
      </Card>
    )
  }

  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">DCF Valuation Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 p-4 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Enterprise Value</p>
            <p className="text-xl md:text-2xl font-bold text-primary mt-1 truncate">
              {formatCurrency(results.enterpriseValue)}
            </p>
          </div>
          <div className="min-w-0 p-4 bg-green-light rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Equity Value</p>
            <p className="text-xl md:text-2xl font-bold text-green-dark mt-1 truncate">
              {formatCurrency(results.equityValue)}
            </p>
          </div>
        </div>

        {/* FCF Projections Table */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Projected Free Cash Flows</h4>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary">
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs text-right">FCF</TableHead>
                  <TableHead className="text-xs text-right">Discount Factor</TableHead>
                  <TableHead className="text-xs text-right">Present Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((year, index) => {
                  const discountFactor = 1 / Math.pow(1 + wacc, index + 1)
                  return (
                    <TableRow key={year}>
                      <TableCell className="text-sm font-medium">{year}</TableCell>
                      <TableCell className="text-sm text-right">
                        {formatCurrency(results.projectedFCF[index])}
                      </TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">
                        {discountFactor.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(results.presentValueFCF[index])}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-secondary">
                  <TableCell className="text-sm font-medium">Terminal Value</TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCurrency(results.terminalValue)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">
                    {(1 / Math.pow(1 + wacc, 5)).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {formatCurrency(results.presentValueTerminal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Value Bridge */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Value Bridge</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">PV of Forecast Period FCF</span>
              <span className="text-sm font-medium">
                {formatCurrency(results.presentValueFCF.reduce((a, b) => a + b, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">PV of Terminal Value</span>
              <span className="text-sm font-medium">
                {formatCurrency(results.presentValueTerminal)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border font-medium">
              <span className="text-sm text-foreground">Enterprise Value</span>
              <span className="text-sm text-primary">{formatCurrency(results.enterpriseValue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Less: Net Debt</span>
              <span className="text-sm font-medium text-red-dark">
                ({formatCurrency(Math.abs(netDebt))})
              </span>
            </div>
            {workingCapital && workingCapital.t12 !== null && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Net Working Capital (T12)</span>
                <span className="text-sm font-medium">
                  {formatCurrency(workingCapital.t12)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 bg-green-light rounded-lg px-3">
              <span className="text-sm font-semibold text-foreground">Equity Value</span>
              <span className="text-lg font-bold text-green-dark">
                {formatCurrency(results.equityValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground">WACC Used</p>
            <p className="text-lg font-semibold text-foreground">{formatPercent(wacc)}</p>
          </div>
          {results.impliedEbitdaMultiple && (
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground">Implied EBITDA Multiple</p>
              <p className="text-lg font-semibold text-foreground">
                {results.impliedEbitdaMultiple.toFixed(1)}x
              </p>
            </div>
          )}
        </div>

        {/* Working Capital Detail */}
        {workingCapital && (workingCapital.t12 !== null || workingCapital.lastFY !== null || workingCapital.threeYearAvg !== null) && (
          <div className="p-3 bg-secondary rounded-lg space-y-1.5">
            <p className="text-xs font-medium text-foreground">Net Working Capital</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {workingCapital.t12 !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">T12</p>
                  <p className="text-sm font-semibold">{formatCurrency(workingCapital.t12)}</p>
                </div>
              )}
              {workingCapital.lastFY !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Last FY</p>
                  <p className="text-sm font-semibold">{formatCurrency(workingCapital.lastFY)}</p>
                </div>
              )}
              {workingCapital.threeYearAvg !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">3yr Avg</p>
                  <p className="text-sm font-semibold">{formatCurrency(workingCapital.threeYearAvg)}</p>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">AR + Inventory − AP. Typically used as the working capital peg in deal negotiations.</p>
          </div>
        )}

        {/* Terminal Value Breakdown - DCF-001 FIX: Color-coded by reasonableness */}
        {(() => {
          const tvPercent = (results.presentValueTerminal / results.enterpriseValue) * 100
          let bgColor = 'bg-green-light'
          let textColor = 'text-green-dark'
          let message = 'within typical range'

          if (tvPercent > 75) {
            bgColor = 'bg-red-light'
            textColor = 'text-red-dark'
            message = 'unusually high - review terminal assumptions'
          } else if (tvPercent > 60) {
            bgColor = 'bg-orange-light'
            textColor = 'text-orange-dark'
            message = 'elevated but acceptable'
          }

          return (
            <div className={`p-3 ${bgColor} rounded-lg`}>
              <p className={`text-xs ${textColor}`}>
                <span className="font-medium">Terminal Value represents</span>{' '}
                {tvPercent.toFixed(1)}% of Enterprise Value
                <span className="ml-1">({message})</span>
              </p>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
