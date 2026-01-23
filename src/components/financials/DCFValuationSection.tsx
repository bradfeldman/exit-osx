'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Settings, TrendingUp, AlertCircle } from 'lucide-react'
import { WACCModal } from './WACCModal'

interface DCFData {
  wacc: number | null
  enterpriseValue: number | null
  equityValue: number | null
  projections: Array<{
    year: number
    fcf: number
    discountFactor: number
    presentValue: number
  }>
  terminalValuePV: number | null
}

interface DCFValuationSectionProps {
  companyId: string
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(2)}%`
}

export function DCFValuationSection({ companyId }: DCFValuationSectionProps) {
  const [dcfData, setDcfData] = useState<DCFData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWACCModal, setShowWACCModal] = useState(false)
  const [hasAssumptions, setHasAssumptions] = useState(false)

  const fetchDCFData = useCallback(async () => {
    if (!companyId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/dcf`)
      if (response.ok) {
        const data = await response.json()
        if (data.assumptions) {
          setHasAssumptions(true)
          setDcfData({
            wacc: data.assumptions.calculatedWACC ? Number(data.assumptions.calculatedWACC) : null,
            enterpriseValue: data.assumptions.enterpriseValue ? Number(data.assumptions.enterpriseValue) : null,
            equityValue: data.assumptions.equityValue ? Number(data.assumptions.equityValue) : null,
            projections: data.projections || [],
            terminalValuePV: data.terminalValuePV || null,
          })
        } else {
          setHasAssumptions(false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch DCF data:', error)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchDCFData()
  }, [fetchDCFData])

  const handleWACCSaved = () => {
    fetchDCFData()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No DCF assumptions configured yet
  if (!hasAssumptions) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              DCF Valuation
            </CardTitle>
            <CardDescription>
              Discounted Cash Flow analysis for your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Configure WACC Variables</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                Set up your Weighted Average Cost of Capital (WACC) assumptions to calculate DCF valuation.
              </p>
              <Button onClick={() => setShowWACCModal(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure WACC
              </Button>
            </div>
          </CardContent>
        </Card>

        <WACCModal
          open={showWACCModal}
          onClose={() => setShowWACCModal(false)}
          companyId={companyId}
          onSaved={handleWACCSaved}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                DCF Valuation
              </CardTitle>
              <CardDescription>
                Discounted Cash Flow analysis based on your WACC assumptions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowWACCModal(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Edit WACC
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-sm font-medium text-blue-600 mb-1">Enterprise Value</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(dcfData?.enterpriseValue)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-sm font-medium text-green-600 mb-1">Equity Value</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(dcfData?.equityValue)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-1">WACC</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(dcfData?.wacc)}
              </p>
            </div>
          </div>

          {/* Discounted Cash Flow Table */}
          {dcfData?.projections && dcfData.projections.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Discounted Cash Flows</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">FCF</TableHead>
                      <TableHead className="text-right">Discount Factor</TableHead>
                      <TableHead className="text-right">Present Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dcfData.projections.map((row) => (
                      <TableRow key={row.year}>
                        <TableCell className="font-medium">Year {row.year}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.fcf)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.discountFactor.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.presentValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {dcfData.terminalValuePV && (
                      <TableRow className="bg-gray-50 font-medium">
                        <TableCell colSpan={3}>Terminal Value (PV)</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(dcfData.terminalValuePV)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <WACCModal
        open={showWACCModal}
        onClose={() => setShowWACCModal(false)}
        companyId={companyId}
        onSaved={handleWACCSaved}
      />
    </>
  )
}
