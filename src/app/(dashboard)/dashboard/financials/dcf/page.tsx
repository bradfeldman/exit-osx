'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { Calculator, TrendingUp, Clock, Percent, DollarSign, BarChart3 } from 'lucide-react'

export default function DCFPage() {
  const { selectedCompanyId } = useCompany()

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DCF Analysis</h1>
          <p className="text-gray-600">Select a company to view DCF analysis</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No company selected. Please select a company from the dropdown above.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DCF Analysis</h1>
        <p className="text-gray-600">Discounted Cash Flow valuation model</p>
      </div>

      {/* Coming Soon Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Coming Soon</h3>
              <p className="text-gray-600">
                DCF Analysis is under development. This feature will provide a comprehensive
                discounted cash flow valuation model for your business.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WACC Calculator Preview (Disabled) */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            WACC Calculator
          </CardTitle>
          <CardDescription>
            Weighted Average Cost of Capital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="riskFreeRate" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Risk-Free Rate
              </Label>
              <Input
                id="riskFreeRate"
                type="number"
                placeholder="4.5%"
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">10-year Treasury yield</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketRiskPremium" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market Risk Premium
              </Label>
              <Input
                id="marketRiskPremium"
                type="number"
                placeholder="5.5%"
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">Historical equity premium</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="beta" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Beta
              </Label>
              <Input
                id="beta"
                type="number"
                placeholder="1.2"
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">Industry beta or company-specific</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeRiskPremium" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Size Risk Premium
              </Label>
              <Input
                id="sizeRiskPremium"
                type="number"
                placeholder="3.0%"
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">Small company premium</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costOfDebt">Cost of Debt</Label>
                <Input
                  id="costOfDebt"
                  type="number"
                  placeholder="6.0%"
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate</Label>
                <Input
                  id="taxRate"
                  type="number"
                  placeholder="25%"
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t bg-gray-50 -mx-6 px-6 py-4 -mb-6 rounded-b-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Calculated WACC</p>
                <p className="text-2xl font-bold text-gray-400">--.-%</p>
              </div>
              <Button disabled>
                Calculate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s Coming</CardTitle>
          <CardDescription>
            Features planned for the DCF Analysis module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-primary text-xs font-bold">1</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">WACC Calculator</span>
                <p className="text-sm text-gray-600">
                  Calculate your cost of capital using CAPM with size and industry adjustments
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-primary text-xs font-bold">2</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Cash Flow Projections</span>
                <p className="text-sm text-gray-600">
                  5-year free cash flow projections based on your P&L and growth assumptions
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-primary text-xs font-bold">3</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Terminal Value</span>
                <p className="text-sm text-gray-600">
                  Gordon Growth Model or exit multiple approach for terminal value calculation
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-primary text-xs font-bold">4</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Sensitivity Analysis</span>
                <p className="text-sm text-gray-600">
                  See how changes in growth rate and discount rate affect your valuation
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-primary text-xs font-bold">5</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Enterprise Value Integration</span>
                <p className="text-sm text-gray-600">
                  DCF-derived enterprise value will replace EBITDA multiple valuation when available
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calculator className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Why DCF Matters</h4>
              <p className="text-sm text-blue-700 mt-1">
                Discounted Cash Flow analysis provides a more rigorous valuation methodology
                compared to simple multiple-based approaches. It considers the time value of money,
                growth projections, and risk factors specific to your business. When completed,
                the DCF enterprise value will be prioritized over the EBITDA multiple-based valuation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
