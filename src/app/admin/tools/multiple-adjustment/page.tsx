'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Company {
  id: string
  name: string
}

interface SnapshotData {
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number
  briScore: number
  alphaConstant: number
  baseMultiple: number
  discountFraction: number
  finalMultiple: number
  currentValue: number
  potentialValue: number
  adjustedEbitda: number
}

export default function AdminMultipleAdjustmentPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      loadSnapshot()
    } else {
      setSnapshot(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  async function loadCompanies() {
    try {
      const response = await fetch('/api/admin/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSnapshot() {
    if (!selectedCompanyId) return

    setLoadingSnapshot(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/latest-snapshot`)
      if (response.ok) {
        const data = await response.json()
        setSnapshot(data.snapshot)
      } else {
        setSnapshot(null)
      }
    } catch (error) {
      console.error('Failed to load snapshot:', error)
      setSnapshot(null)
    } finally {
      setLoadingSnapshot(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Multiple Adjustment Formula</h1>
        <p className="text-muted-foreground">
          Technical documentation for the EBITDA multiple calculation methodology
        </p>
      </div>

      {/* Company Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Company</CardTitle>
          <CardDescription>
            Choose a company to view its current valuation calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">Loading companies...</span>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full max-w-md px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {/* Formula Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Formula</CardTitle>
          <CardDescription>
            Three-step process to calculate the applied EBITDA multiple
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h3 className="font-semibold mb-2">Step 1: Base Multiple (Core Score Positioning)</h3>
            <div className="font-mono text-lg bg-background p-3 rounded border text-center">
              BaseMultiple = L + (CS / 100) × (H - L)
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Core Score positions the company within the industry multiple range. A higher Core Score
              places the base multiple closer to the industry ceiling.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h3 className="font-semibold mb-2">Step 2: Discount Fraction (BRI Impact)</h3>
            <div className="font-mono text-lg bg-background p-3 rounded border text-center">
              DiscountFraction = (1 - BRI / 100)<sup>α</sup>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Non-linear discount based on Buyer Readiness Index. The alpha exponent (α = 1.4) creates
              buyer skepticism curve where lower BRI scores receive disproportionately higher discounts.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h3 className="font-semibold mb-2">Step 3: Final Multiple (Floor Guarantee)</h3>
            <div className="font-mono text-lg bg-background p-3 rounded border text-center">
              FinalMultiple = L + (BaseMultiple - L) × (1 - DiscountFraction)
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Final multiple applies the BRI discount while guaranteeing the industry floor (L) as the minimum.
              This ensures no company falls below the industry baseline regardless of BRI score.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Variable Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Variable Definitions</CardTitle>
          <CardDescription>
            Input parameters for the multiple calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Variable</th>
                  <th className="text-left py-2 px-3 font-semibold">Name</th>
                  <th className="text-left py-2 px-3 font-semibold">Range</th>
                  <th className="text-left py-2 px-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 px-3 font-mono font-semibold">L</td>
                  <td className="py-2 px-3">Industry Multiple Low</td>
                  <td className="py-2 px-3">Varies by industry</td>
                  <td className="py-2 px-3 text-muted-foreground">Floor multiple for the industry classification</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-semibold">H</td>
                  <td className="py-2 px-3">Industry Multiple High</td>
                  <td className="py-2 px-3">Varies by industry</td>
                  <td className="py-2 px-3 text-muted-foreground">Ceiling multiple for the industry classification</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-semibold">CS</td>
                  <td className="py-2 px-3">Core Score</td>
                  <td className="py-2 px-3">0 - 100</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    Structural business factors: revenue size, revenue model, gross margin,
                    labor intensity, asset intensity, owner involvement
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-semibold">BRI</td>
                  <td className="py-2 px-3">Buyer Readiness Index</td>
                  <td className="py-2 px-3">0 - 100</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    Weighted score across 6 categories: Financial (25%), Transferability (20%),
                    Operational (20%), Market (15%), Legal/Tax (10%), Personal (10%)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-semibold">α</td>
                  <td className="py-2 px-3">Alpha (Skepticism Exponent)</td>
                  <td className="py-2 px-3">1.3 - 1.6</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    Controls buyer skepticism curve. Higher values = more skeptical buyers.
                    Default: 1.4
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Current Values */}
      <Card>
        <CardHeader>
          <CardTitle>Current Values</CardTitle>
          <CardDescription>
            {snapshot ? 'Live data from latest valuation snapshot' : 'Select a company to view current values'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSnapshot ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : snapshot ? (
            <div className="space-y-4">
              {/* Input Variables */}
              <div>
                <h4 className="font-semibold mb-2">Input Variables</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">L (Low)</p>
                    <p className="text-xl font-semibold">{snapshot.industryMultipleLow.toFixed(1)}x</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">H (High)</p>
                    <p className="text-xl font-semibold">{snapshot.industryMultipleHigh.toFixed(1)}x</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">CS (Core Score)</p>
                    <p className="text-xl font-semibold">{Math.round(snapshot.coreScore * 100)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">BRI</p>
                    <p className="text-xl font-semibold">{Math.round(snapshot.briScore * 100)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">α (Alpha)</p>
                    <p className="text-xl font-semibold">{snapshot.alphaConstant}</p>
                  </div>
                </div>
              </div>

              {/* Calculated Values */}
              <div>
                <h4 className="font-semibold mb-2">Calculated Values</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-xs text-blue-600 font-medium">Base Multiple</p>
                    <p className="text-xl font-semibold text-blue-700">{snapshot.baseMultiple.toFixed(2)}x</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-xs text-orange-600 font-medium">Discount Fraction</p>
                    <p className="text-xl font-semibold text-orange-700">{(snapshot.discountFraction * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-600 font-medium">Final Multiple</p>
                    <p className="text-xl font-semibold text-green-700">{snapshot.finalMultiple.toFixed(2)}x</p>
                  </div>
                </div>
              </div>

              {/* Valuation Results */}
              <div>
                <h4 className="font-semibold mb-2">Valuation Results</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">Adjusted EBITDA</p>
                    <p className="text-xl font-semibold">${(snapshot.adjustedEbitda / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">Current Value</p>
                    <p className="text-xl font-semibold">${(snapshot.currentValue / 1000000).toFixed(2)}M</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground font-medium">Potential Value</p>
                    <p className="text-xl font-semibold">${(snapshot.potentialValue / 1000000).toFixed(2)}M</p>
                  </div>
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className="mt-4 p-4 bg-muted rounded-lg font-mono text-sm">
                <p className="text-muted-foreground mb-2">{'// Step-by-step calculation:'}</p>
                <p>BaseMultiple = {snapshot.industryMultipleLow.toFixed(1)} + ({Math.round(snapshot.coreScore * 100)} / 100) × ({snapshot.industryMultipleHigh.toFixed(1)} - {snapshot.industryMultipleLow.toFixed(1)}) = <span className="text-blue-600 font-semibold">{snapshot.baseMultiple.toFixed(2)}x</span></p>
                <p className="mt-1">DiscountFraction = (1 - {Math.round(snapshot.briScore * 100)} / 100)^{snapshot.alphaConstant} = <span className="text-orange-600 font-semibold">{(snapshot.discountFraction * 100).toFixed(1)}%</span></p>
                <p className="mt-1">FinalMultiple = {snapshot.industryMultipleLow.toFixed(1)} + ({snapshot.baseMultiple.toFixed(2)} - {snapshot.industryMultipleLow.toFixed(1)}) × (1 - {snapshot.discountFraction.toFixed(3)}) = <span className="text-green-600 font-semibold">{snapshot.finalMultiple.toFixed(2)}x</span></p>
                <p className="mt-3 text-muted-foreground">{'// Final valuation:'}</p>
                <p>CurrentValue = ${(snapshot.adjustedEbitda / 1000).toFixed(0)}K × {snapshot.finalMultiple.toFixed(2)}x = <span className="font-semibold">${(snapshot.currentValue / 1000000).toFixed(2)}M</span></p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {selectedCompanyId ? 'No assessment completed yet for this company.' : 'Select a company to view valuation data.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alpha Sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle>Alpha Sensitivity Reference</CardTitle>
          <CardDescription>
            How different alpha values affect the discount at various BRI levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Buyer Readiness</th>
                  <th className="text-center py-2 px-3 font-semibold">α = 1.3</th>
                  <th className="text-center py-2 px-3 font-semibold">α = 1.4 (default)</th>
                  <th className="text-center py-2 px-3 font-semibold">α = 1.5</th>
                  <th className="text-center py-2 px-3 font-semibold">α = 1.6</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[90, 80, 70, 60, 50, 40, 30, 20].map(bri => (
                  <tr key={bri}>
                    <td className="py-2 px-3 font-semibold">{bri}</td>
                    <td className="py-2 px-3 text-center">{(Math.pow(1 - bri/100, 1.3) * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-center bg-yellow-50 font-medium">{(Math.pow(1 - bri/100, 1.4) * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-center">{(Math.pow(1 - bri/100, 1.5) * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-center">{(Math.pow(1 - bri/100, 1.6) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Discount percentages shown represent how much of the range above the floor is removed.
            Lower BRI scores result in higher discounts, with the effect amplified by higher alpha values.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
