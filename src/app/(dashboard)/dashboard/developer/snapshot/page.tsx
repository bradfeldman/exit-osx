'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'

interface SnapshotData {
  id: string
  companyId: string
  createdAt: string
  snapshotReason: string | null
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number
  briScore: number
  briFinancial: number
  briTransferability: number
  briOperational: number
  briMarket: number
  briLegalTax: number
  briPersonal: number
  alphaConstant: number
  baseMultiple: number
  discountFraction: number
  finalMultiple: number
  currentValue: number
  potentialValue: number
  valueGap: number
}

interface SnapshotLogEntry {
  id: string
  date: string
  dateFormatted: string
  reason: string | null
  createdBy: { name: string; email: string } | null
  currentValue: number
  briScore: number
  coreScore: number
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatScore(value: number): string {
  return Math.round(value * 100).toString()
}

function DataRow({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="font-medium text-gray-900">{label}</span>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <span className="font-mono text-sm text-gray-700">{value}</span>
    </div>
  )
}

export default function SnapshotPage() {
  const { selectedCompanyId } = useCompany()
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)
  const [snapshotHistory, setSnapshotHistory] = useState<SnapshotLogEntry[]>([])
  const [latestSnapshotId, setLatestSnapshotId] = useState<string | null>(null)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load snapshot history
  useEffect(() => {
    async function loadHistory() {
      if (!selectedCompanyId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/valuation-history?limit=50`)
        if (!response.ok) {
          throw new Error('Failed to fetch snapshot history')
        }
        const data = await response.json()

        // chartData is in chronological order, we want reverse (newest first) for display
        const history = [...data.chartData].reverse()
        setSnapshotHistory(history)

        if (history.length > 0) {
          setLatestSnapshotId(history[0].id)
          setSelectedSnapshotId(history[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [selectedCompanyId])

  // Load selected snapshot details
  useEffect(() => {
    async function loadSnapshot() {
      if (!selectedCompanyId || !selectedSnapshotId) return

      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/latest-snapshot?snapshotId=${selectedSnapshotId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch snapshot')
        }
        const data = await response.json()
        setSnapshot(data.snapshot)
      } catch (err) {
        console.error('Error loading snapshot:', err)
      }
    }

    loadSnapshot()
  }, [selectedCompanyId, selectedSnapshotId])

  const isViewingHistorical = selectedSnapshotId && latestSnapshotId && selectedSnapshotId !== latestSnapshotId

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Valuation Snapshot</h1>
          <p className="text-gray-600">Select a company to view snapshot data</p>
        </div>
      </div>
    )
  }

  if (snapshotHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Valuation Snapshot</h1>
          <p className="text-gray-600">No snapshots available. Complete an assessment to generate one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Valuation Snapshot</h1>
        <p className="text-gray-600">
          View stored valuation data from assessment completions
        </p>
      </div>

      {/* Historical Warning Banner */}
      {isViewingHistorical && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 font-medium">
            Viewing Historical Snapshot
          </p>
          <p className="text-sm text-amber-700 mt-1">
            This snapshot is not current. You are viewing data from{' '}
            {new Date(snapshot?.createdAt || '').toLocaleDateString()}.{' '}
            <button
              onClick={() => setSelectedSnapshotId(latestSnapshotId)}
              className="text-amber-900 underline font-medium"
            >
              View current snapshot
            </button>
          </p>
        </div>
      )}

      {/* Snapshot History Log */}
      <Card>
        <CardHeader>
          <CardTitle>Snapshot History</CardTitle>
          <CardDescription>Click a date to view that snapshot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-left text-gray-500">
                  <th className="pb-2 font-medium">Date/Time</th>
                  <th className="pb-2 font-medium">Triggered By</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {snapshotHistory.map((entry) => {
                  const isSelected = entry.id === selectedSnapshotId
                  const isLatest = entry.id === latestSnapshotId

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedSnapshotId(entry.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-orange-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-2">
                        <button className="text-left">
                          <span className={`${isSelected ? 'text-[#B87333] font-medium' : 'text-blue-600'}`}>
                            {new Date(entry.date).toLocaleString()}
                          </span>
                          {isLatest && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-2 text-gray-600">
                        {entry.createdBy?.name || 'System'}
                      </td>
                      <td className="py-2 text-gray-600">
                        {entry.reason || 'N/A'}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-900">
                        {formatCurrency(entry.currentValue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {snapshot && (
        <>
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Snapshot Metadata</CardTitle>
              <CardDescription>When and why this snapshot was created</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow label="Snapshot ID" value={snapshot.id} />
              <DataRow label="Company ID" value={snapshot.companyId} />
              <DataRow
                label="Created At"
                value={new Date(snapshot.createdAt).toLocaleString()}
              />
              <DataRow
                label="Reason"
                value={snapshot.snapshotReason || 'N/A'}
              />
            </CardContent>
          </Card>

          {/* Financial Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Inputs</CardTitle>
              <CardDescription>Base financial data used in valuation</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow
                label="Adjusted EBITDA"
                value={formatCurrency(snapshot.adjustedEbitda)}
                description="Normalized earnings (base EBITDA + add-backs + excess owner comp - deductions)"
              />
            </CardContent>
          </Card>

          {/* Industry Multiples */}
          <Card>
            <CardHeader>
              <CardTitle>Industry Multiples</CardTitle>
              <CardDescription>EBITDA multiple range for the selected industry</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow
                label="Industry Multiple Low (L)"
                value={`${snapshot.industryMultipleLow.toFixed(1)}x`}
                description="Floor multiple - guaranteed minimum"
              />
              <DataRow
                label="Industry Multiple High (H)"
                value={`${snapshot.industryMultipleHigh.toFixed(1)}x`}
                description="Ceiling multiple - best case scenario"
              />
            </CardContent>
          </Card>

          {/* Core Score */}
          <Card>
            <CardHeader>
              <CardTitle>Core Index</CardTitle>
              <CardDescription>Structural business factors positioning within industry range</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow
                label="Core Score (CS)"
                value={formatScore(snapshot.coreScore)}
                description="0-100 scale based on revenue size, revenue model, gross margin, labor intensity, asset intensity, owner involvement"
              />
            </CardContent>
          </Card>

          {/* BRI Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Buyer Readiness Index (BRI)</CardTitle>
              <CardDescription>Weighted assessment scores by category</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow
                label="Overall BRI Score"
                value={formatScore(snapshot.briScore)}
                description="Weighted average of all categories (0-100)"
              />
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Category Breakdown</p>
                <DataRow
                  label="Financial"
                  value={formatScore(snapshot.briFinancial)}
                  description="Weight: 25%"
                />
                <DataRow
                  label="Transferability"
                  value={formatScore(snapshot.briTransferability)}
                  description="Weight: 20%"
                />
                <DataRow
                  label="Operational"
                  value={formatScore(snapshot.briOperational)}
                  description="Weight: 20%"
                />
                <DataRow
                  label="Market"
                  value={formatScore(snapshot.briMarket)}
                  description="Weight: 15%"
                />
                <DataRow
                  label="Legal/Tax"
                  value={formatScore(snapshot.briLegalTax)}
                  description="Weight: 10%"
                />
                <DataRow
                  label="Personal"
                  value={formatScore(snapshot.briPersonal)}
                  description="Weight: 10%"
                />
              </div>
            </CardContent>
          </Card>

          {/* Multiple Calculation */}
          <Card>
            <CardHeader>
              <CardTitle>Multiple Calculation</CardTitle>
              <CardDescription>Step-by-step derivation of the final EBITDA multiple</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow
                label="Alpha Constant (α)"
                value={snapshot.alphaConstant.toFixed(2)}
                description="Buyer skepticism exponent (1.3-1.6 range)"
              />
              <DataRow
                label="Base Multiple"
                value={`${snapshot.baseMultiple.toFixed(2)}x`}
                description="L + (CS/100) × (H - L)"
              />
              <DataRow
                label="Discount Fraction"
                value={formatPercent(snapshot.discountFraction)}
                description="(1 - BRI/100)^α"
              />
              <DataRow
                label="Final Multiple"
                value={`${snapshot.finalMultiple.toFixed(2)}x`}
                description="L + (BaseMultiple - L) × (1 - DiscountFraction)"
              />
            </CardContent>
          </Card>

          {/* Valuation Outputs */}
          <Card>
            <CardHeader>
              <CardTitle>Valuation Outputs</CardTitle>
              <CardDescription>Final calculated values</CardDescription>
            </CardHeader>
            <CardContent>
              <DataRow
                label="Current Value"
                value={formatCurrency(snapshot.currentValue)}
                description="Adjusted EBITDA × Final Multiple"
              />
              <DataRow
                label="Potential Value"
                value={formatCurrency(snapshot.potentialValue)}
                description="Adjusted EBITDA × Base Multiple (if BRI were 100)"
              />
              <DataRow
                label="Value Gap"
                value={formatCurrency(snapshot.valueGap)}
                description="Potential Value - Current Value"
              />
            </CardContent>
          </Card>

          {/* Raw JSON */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Data</CardTitle>
              <CardDescription>Complete snapshot as JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto text-xs font-mono">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
