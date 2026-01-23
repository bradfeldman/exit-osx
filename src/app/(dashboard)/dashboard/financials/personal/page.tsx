'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'

interface ValuationSnapshot {
  id: string
  currentValue: string | number
  potentialValue: string | number
  briScore: string | number
}

interface Company {
  id: string
  name: string
  valuationSnapshots: ValuationSnapshot[]
}

interface BusinessAsset {
  companyId: string
  companyName: string
  marketValue: number
  ownershipPercent: number
  netValue: number
}

interface PersonalAsset {
  id: string
  category: string
  description: string
  value: number
}

interface PersonalLiability {
  id: string
  category: string
  description: string
  amount: number
}

const ASSET_CATEGORIES = [
  'Real Estate',
  'Vehicles',
  'Retirement Accounts',
  'Investment Accounts',
  'Cash & Savings',
  'Other Assets',
]

const LIABILITY_CATEGORIES = [
  'Mortgage',
  'Auto Loans',
  'Student Loans',
  'Credit Cards',
  'Personal Loans',
  'Other Liabilities',
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export default function PersonalFinancialStatementPage() {
  const { selectedCompanyId } = useCompany()
  const [companies, setCompanies] = useState<Company[]>([])
  const [businessAssets, setBusinessAssets] = useState<BusinessAsset[]>([])
  const [personalAssets, setPersonalAssets] = useState<PersonalAsset[]>([])
  const [personalLiabilities, setPersonalLiabilities] = useState<PersonalLiability[]>([])
  const [loading, setLoading] = useState(true)

  // Load companies and saved data on mount
  useEffect(() => {
    loadCompanies()
    loadSavedData()
  }, [])

  // Save personal assets and liabilities to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('pfs_personalAssets', JSON.stringify(personalAssets))
      localStorage.setItem('pfs_personalLiabilities', JSON.stringify(personalLiabilities))
    }
  }, [personalAssets, personalLiabilities, loading])

  // Save business ownership percentages
  useEffect(() => {
    if (!loading && businessAssets.length > 0) {
      const ownershipData = businessAssets.reduce((acc, asset) => {
        acc[asset.companyId] = asset.ownershipPercent
        return acc
      }, {} as Record<string, number>)
      localStorage.setItem('pfs_businessOwnership', JSON.stringify(ownershipData))
    }
  }, [businessAssets, loading])

  function loadSavedData() {
    try {
      const savedAssets = localStorage.getItem('pfs_personalAssets')
      const savedLiabilities = localStorage.getItem('pfs_personalLiabilities')
      if (savedAssets) setPersonalAssets(JSON.parse(savedAssets))
      if (savedLiabilities) setPersonalLiabilities(JSON.parse(savedLiabilities))
    } catch (error) {
      console.error('Failed to load saved PFS data:', error)
    }
  }

  async function loadCompanies() {
    setLoading(true)
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])

        // Load saved ownership percentages
        let savedOwnership: Record<string, number> = {}
        try {
          const saved = localStorage.getItem('pfs_businessOwnership')
          if (saved) savedOwnership = JSON.parse(saved)
        } catch {
          // Ignore parse errors
        }

        // Fetch current calculated value from dashboard API for each company
        // This ensures PFS shows the same value as the Scorecard
        const assets: BusinessAsset[] = await Promise.all(
          (data.companies || []).map(async (company: Company) => {
            let marketValue = 0

            // Get the live calculated value from dashboard API
            try {
              const dashboardRes = await fetch(`/api/companies/${company.id}/dashboard`)
              if (dashboardRes.ok) {
                const dashboardData = await dashboardRes.json()
                marketValue = dashboardData.tier1?.currentValue || 0
              }
            } catch {
              // Fallback to snapshot value if dashboard fails
              const latestSnapshot = company.valuationSnapshots?.[0]
              marketValue = latestSnapshot ? Number(latestSnapshot.currentValue) : 0
            }

            const ownershipPercent = savedOwnership[company.id] ?? 100
            return {
              companyId: company.id,
              companyName: company.name,
              marketValue,
              ownershipPercent,
              netValue: marketValue * (ownershipPercent / 100),
            }
          })
        )
        setBusinessAssets(assets)
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleOwnershipChange(companyId: string, percent: number) {
    setBusinessAssets(prev =>
      prev.map(asset => {
        if (asset.companyId === companyId) {
          const validPercent = Math.min(100, Math.max(0, percent))
          return {
            ...asset,
            ownershipPercent: validPercent,
            netValue: asset.marketValue * (validPercent / 100),
          }
        }
        return asset
      })
    )
  }

  function addPersonalAsset() {
    setPersonalAssets(prev => [
      ...prev,
      {
        id: `asset-${Date.now()}`,
        category: ASSET_CATEGORIES[0],
        description: '',
        value: 0,
      },
    ])
  }

  function updatePersonalAsset(id: string, field: keyof PersonalAsset, value: string | number) {
    setPersonalAssets(prev =>
      prev.map(asset =>
        asset.id === id ? { ...asset, [field]: value } : asset
      )
    )
  }

  function removePersonalAsset(id: string) {
    setPersonalAssets(prev => prev.filter(asset => asset.id !== id))
  }

  function addPersonalLiability() {
    setPersonalLiabilities(prev => [
      ...prev,
      {
        id: `liability-${Date.now()}`,
        category: LIABILITY_CATEGORIES[0],
        description: '',
        amount: 0,
      },
    ])
  }

  function updatePersonalLiability(id: string, field: keyof PersonalLiability, value: string | number) {
    setPersonalLiabilities(prev =>
      prev.map(liability =>
        liability.id === id ? { ...liability, [field]: value } : liability
      )
    )
  }

  function removePersonalLiability(id: string) {
    setPersonalLiabilities(prev => prev.filter(liability => liability.id !== id))
  }

  // Calculate totals
  const totalBusinessAssets = businessAssets.reduce((sum, asset) => sum + asset.netValue, 0)
  const totalPersonalAssets = personalAssets.reduce((sum, asset) => sum + asset.value, 0)
  const totalAssets = totalBusinessAssets + totalPersonalAssets
  const totalLiabilities = personalLiabilities.reduce((sum, liability) => sum + liability.amount, 0)
  const netWorth = totalAssets - totalLiabilities

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personal Financial Statement</h1>
        <p className="text-gray-600">Track your personal assets, liabilities, and net worth</p>
      </div>

      {/* Net Worth Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAssets)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Worth</p>
              <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Business Interests</CardTitle>
          <CardDescription>
            Your ownership stake in businesses. Market values are pulled from each company&apos;s Scorecard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {businessAssets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No businesses found in your account.</p>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-4">Business Name</div>
                <div className="col-span-3 text-right">Market Value</div>
                <div className="col-span-2 text-center">Ownership %</div>
                <div className="col-span-3 text-right">Your Value</div>
              </div>

              {/* Business rows */}
              {businessAssets.map(asset => (
                <div key={asset.companyId} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100">
                  <div className="col-span-4">
                    <p className="font-medium text-gray-900">{asset.companyName}</p>
                  </div>
                  <div className="col-span-3 text-right text-gray-600">
                    {formatCurrency(asset.marketValue)}
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={asset.ownershipPercent}
                        onChange={(e) => handleOwnershipChange(asset.companyId, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <span className="ml-1 text-gray-500">%</span>
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-medium text-gray-900">
                    {formatCurrency(asset.netValue)}
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="grid grid-cols-12 gap-4 items-center pt-2 font-medium">
                <div className="col-span-9 text-right text-gray-700">Total Business Interests:</div>
                <div className="col-span-3 text-right text-gray-900">
                  {formatCurrency(totalBusinessAssets)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Assets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Assets</CardTitle>
            <CardDescription>Real estate, vehicles, investments, and other personal assets</CardDescription>
          </div>
          <Button onClick={addPersonalAsset} variant="outline" size="sm">
            + Add Asset
          </Button>
        </CardHeader>
        <CardContent>
          {personalAssets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No personal assets added. Click &quot;Add Asset&quot; to begin.</p>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-3">Category</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-3 text-right">Value</div>
                <div className="col-span-1"></div>
              </div>

              {personalAssets.map(asset => (
                <div key={asset.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <select
                      value={asset.category}
                      onChange={(e) => updatePersonalAsset(asset.id, 'category', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      {ASSET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={asset.description}
                      onChange={(e) => updatePersonalAsset(asset.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(asset.value)}
                        onChange={(e) => updatePersonalAsset(asset.id, 'value', parseInputValue(e.target.value))}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm text-right"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => removePersonalAsset(asset.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="grid grid-cols-12 gap-4 items-center pt-2 border-t font-medium">
                <div className="col-span-8 text-right text-gray-700">Total Personal Assets:</div>
                <div className="col-span-3 text-right text-gray-900">
                  {formatCurrency(totalPersonalAssets)}
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Liabilities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Liabilities</CardTitle>
            <CardDescription>Mortgages, loans, credit cards, and other debts</CardDescription>
          </div>
          <Button onClick={addPersonalLiability} variant="outline" size="sm">
            + Add Liability
          </Button>
        </CardHeader>
        <CardContent>
          {personalLiabilities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No personal liabilities added. Click &quot;Add Liability&quot; to begin.</p>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-3">Category</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-3 text-right">Amount Owed</div>
                <div className="col-span-1"></div>
              </div>

              {personalLiabilities.map(liability => (
                <div key={liability.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <select
                      value={liability.category}
                      onChange={(e) => updatePersonalLiability(liability.id, 'category', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      {LIABILITY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={liability.description}
                      onChange={(e) => updatePersonalLiability(liability.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(liability.amount)}
                        onChange={(e) => updatePersonalLiability(liability.id, 'amount', parseInputValue(e.target.value))}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm text-right"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => removePersonalLiability(liability.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="grid grid-cols-12 gap-4 items-center pt-2 border-t font-medium">
                <div className="col-span-8 text-right text-gray-700">Total Liabilities:</div>
                <div className="col-span-3 text-right text-red-600">
                  {formatCurrency(totalLiabilities)}
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Business Interests</span>
              <span className="font-medium">{formatCurrency(totalBusinessAssets)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Personal Assets</span>
              <span className="font-medium">{formatCurrency(totalPersonalAssets)}</span>
            </div>
            <div className="flex justify-between text-sm border-b pb-2">
              <span className="text-gray-600 font-medium">Total Assets</span>
              <span className="font-medium text-green-600">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Liabilities</span>
              <span className="font-medium text-red-600">({formatCurrency(totalLiabilities)})</span>
            </div>
            <div className="flex justify-between text-lg pt-2 border-t">
              <span className="font-bold text-gray-900">Net Worth</span>
              <span className={`font-bold ${netWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(netWorth)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <p className="text-xs text-gray-500 text-center">
        This worksheet is for planning purposes only. Business values are based on current market valuations from each company&apos;s Scorecard.
        Personal assets and liabilities are stored locally in your browser and are not saved to the server.
      </p>
    </div>
  )
}
