'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatPercent, type DCFResults } from '@/lib/valuation/dcf-calculator'

interface ValuationResultsProps {
  results: DCFResults | null
  wacc: number
  netDebt: number
  isLoading?: boolean
}

export function ValuationResults({ results, wacc, netDebt, isLoading }: ValuationResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-gray-900">DCF Valuation Results</CardTitle>
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
          <CardTitle className="text-base font-medium text-gray-900">DCF Valuation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-500">
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
        <CardTitle className="text-base font-medium text-gray-900">DCF Valuation Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Enterprise Value</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatCurrency(results.enterpriseValue)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Equity Value</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {formatCurrency(results.equityValue)}
            </p>
          </div>
        </div>

        {/* FCF Projections Table */}
        <div>
          <h4 className="text-sm font-medium text-gray-800 mb-3">Projected Free Cash Flows</h4>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
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
                      <TableCell className="text-sm text-right text-gray-500">
                        {discountFactor.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(results.presentValueFCF[index])}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-gray-50">
                  <TableCell className="text-sm font-medium">Terminal Value</TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCurrency(results.terminalValue)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-gray-500">
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
          <h4 className="text-sm font-medium text-gray-800 mb-3">Value Bridge</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">PV of Forecast Period FCF</span>
              <span className="text-sm font-medium">
                {formatCurrency(results.presentValueFCF.reduce((a, b) => a + b, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">PV of Terminal Value</span>
              <span className="text-sm font-medium">
                {formatCurrency(results.presentValueTerminal)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 font-medium">
              <span className="text-sm text-gray-900">Enterprise Value</span>
              <span className="text-sm text-primary">{formatCurrency(results.enterpriseValue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Less: Net Debt</span>
              <span className="text-sm font-medium text-red-600">
                ({formatCurrency(Math.abs(netDebt))})
              </span>
            </div>
            <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-3">
              <span className="text-sm font-semibold text-gray-900">Equity Value</span>
              <span className="text-lg font-bold text-green-700">
                {formatCurrency(results.equityValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">WACC Used</p>
            <p className="text-lg font-semibold text-gray-900">{formatPercent(wacc)}</p>
          </div>
          {results.impliedEbitdaMultiple && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Implied EBITDA Multiple</p>
              <p className="text-lg font-semibold text-gray-900">
                {results.impliedEbitdaMultiple.toFixed(1)}x
              </p>
            </div>
          )}
        </div>

        {/* Terminal Value Breakdown - DCF-001 FIX: Color-coded by reasonableness */}
        {(() => {
          const tvPercent = (results.presentValueTerminal / results.enterpriseValue) * 100
          let bgColor = 'bg-green-50'
          let textColor = 'text-green-700'
          let message = 'within typical range'

          if (tvPercent > 75) {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            message = 'unusually high - review terminal assumptions'
          } else if (tvPercent > 60) {
            bgColor = 'bg-amber-50'
            textColor = 'text-amber-700'
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
