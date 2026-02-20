'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ExternalLink, CheckCircle2, Link2 } from 'lucide-react'

interface FinancialSettings {
  // WACC assumptions
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  costOfDebtOverride: number | null
  taxRateOverride: number | null
  // Growth assumptions
  growthAssumptions: Record<string, number>
  // Terminal value
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number
  exitMultiple: number | null
}

interface FinancialSettingsModalProps {
  open: boolean
  onClose: () => void
  companyId: string
  isQuickBooksConnected: boolean
  lastSyncedAt?: string | null
  onSaved?: () => void
}

const DEFAULT_SETTINGS: FinancialSettings = {
  riskFreeRate: 0.04,
  marketRiskPremium: 0.055,
  beta: 1.0,
  sizeRiskPremium: 0.02,
  costOfDebtOverride: null,
  taxRateOverride: null,
  growthAssumptions: {
    year1: 0.05,
    year2: 0.04,
    year3: 0.03,
    year4: 0.025,
    year5: 0.02,
  },
  terminalMethod: 'gordon',
  perpetualGrowthRate: 0.025,
  exitMultiple: null,
}

export function FinancialSettingsModal({
  open,
  onClose,
  companyId,
  isQuickBooksConnected,
  lastSyncedAt,
  onSaved,
}: FinancialSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<FinancialSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<FinancialSettings | null>(null)

  const fetchSettings = useCallback(async () => {
    if (!companyId || !open) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/dcf`)
      if (response.ok) {
        const data = await response.json()
        if (data.assumptions) {
          const loadedSettings: FinancialSettings = {
            riskFreeRate: Number(data.assumptions.riskFreeRate) || DEFAULT_SETTINGS.riskFreeRate,
            marketRiskPremium: Number(data.assumptions.marketRiskPremium) || DEFAULT_SETTINGS.marketRiskPremium,
            beta: Number(data.assumptions.beta) || DEFAULT_SETTINGS.beta,
            sizeRiskPremium: Number(data.assumptions.sizeRiskPremium) || DEFAULT_SETTINGS.sizeRiskPremium,
            costOfDebtOverride: data.assumptions.costOfDebtOverride ? Number(data.assumptions.costOfDebtOverride) : null,
            taxRateOverride: data.assumptions.taxRateOverride ? Number(data.assumptions.taxRateOverride) : null,
            terminalMethod: data.assumptions.terminalMethod || 'gordon',
            perpetualGrowthRate: Number(data.assumptions.perpetualGrowthRate) || DEFAULT_SETTINGS.perpetualGrowthRate,
            exitMultiple: data.assumptions.exitMultiple ? Number(data.assumptions.exitMultiple) : null,
            growthAssumptions: data.assumptions.growthAssumptions || DEFAULT_SETTINGS.growthAssumptions,
          }
          setSettings(loadedSettings)
          setOriginalSettings(loadedSettings)
        } else {
          setSettings(DEFAULT_SETTINGS)
          setOriginalSettings(DEFAULT_SETTINGS)
        }
      } else {
        setOriginalSettings(DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }, [companyId, open])

  useEffect(() => {
    if (open) {
      fetchSettings()
    }
  }, [fetchSettings, open])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/dcf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        onSaved?.()
        onClose()
      } else {
        const data = await response.json()
        console.error('Failed to save:', data.error)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof FinancialSettings>(
    key: K,
    value: FinancialSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updateGrowthRate = (year: string, value: number) => {
    setSettings((prev) => ({
      ...prev,
      growthAssumptions: { ...prev.growthAssumptions, [year]: value },
    }))
  }

  const costOfEquity =
    settings.riskFreeRate +
    settings.beta * settings.marketRiskPremium +
    settings.sizeRiskPremium

  // Check if settings have changed from original
  const hasChanges = originalSettings !== null && JSON.stringify(settings) !== JSON.stringify(originalSettings)

  const formattedSyncDate = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Financials Settings</DialogTitle>
          <DialogDescription>
            Configure QuickBooks integration and valuation assumptions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* QuickBooks Integration Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">QuickBooks Integration</h4>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary border">
                <div className="flex items-center gap-3">
                  {isQuickBooksConnected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-dark" />
                      <div>
                        <p className="font-medium text-green-dark">Connected</p>
                        {formattedSyncDate && (
                          <p className="text-sm text-muted-foreground">Last sync: {formattedSyncDate}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Not Connected</p>
                        <p className="text-sm text-muted-foreground">Connect to import financial data</p>
                      </div>
                    </>
                  )}
                </div>
                <Link href="/dashboard/settings">
                  <Button variant="outline" size="sm">
                    Manage
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            <hr className="border-border" />

            {/* WACC Assumptions Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">WACC Assumptions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riskFreeRate">Risk-Free Rate (%)</Label>
                  <Input
                    id="riskFreeRate"
                    type="number"
                    step="0.01"
                    value={(settings.riskFreeRate * 100).toFixed(2)}
                    onChange={(e) => updateSetting('riskFreeRate', Number(e.target.value) / 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marketRiskPremium">Market Risk Premium (%)</Label>
                  <Input
                    id="marketRiskPremium"
                    type="number"
                    step="0.01"
                    value={(settings.marketRiskPremium * 100).toFixed(2)}
                    onChange={(e) => updateSetting('marketRiskPremium', Number(e.target.value) / 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beta">Beta</Label>
                  <Input
                    id="beta"
                    type="number"
                    step="0.01"
                    value={settings.beta.toFixed(2)}
                    onChange={(e) => updateSetting('beta', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sizeRiskPremium">Size Premium (%)</Label>
                  <Input
                    id="sizeRiskPremium"
                    type="number"
                    step="0.01"
                    value={(settings.sizeRiskPremium * 100).toFixed(2)}
                    onChange={(e) => updateSetting('sizeRiskPremium', Number(e.target.value) / 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costOfDebtOverride">Cost of Debt Override (%)</Label>
                  <Input
                    id="costOfDebtOverride"
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={settings.costOfDebtOverride !== null ? (settings.costOfDebtOverride * 100).toFixed(2) : ''}
                    onChange={(e) => updateSetting('costOfDebtOverride', e.target.value ? Number(e.target.value) / 100 : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRateOverride">Tax Rate Override (%)</Label>
                  <Input
                    id="taxRateOverride"
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={settings.taxRateOverride !== null ? (settings.taxRateOverride * 100).toFixed(2) : ''}
                    onChange={(e) => updateSetting('taxRateOverride', e.target.value ? Number(e.target.value) / 100 : null)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Cost of Equity: <span className="font-medium">{(costOfEquity * 100).toFixed(2)}%</span>
              </p>
            </div>

            <hr className="border-border" />

            {/* Growth Assumptions Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Growth Assumptions</h4>
              <div className="grid grid-cols-5 gap-2">
                {['year1', 'year2', 'year3', 'year4', 'year5'].map((year, idx) => (
                  <div key={year} className="space-y-1">
                    <Label htmlFor={year} className="text-xs">
                      Year {idx + 1} (%)
                    </Label>
                    <Input
                      id={year}
                      type="number"
                      step="0.1"
                      className="text-sm"
                      value={((settings.growthAssumptions[year] || 0) * 100).toFixed(1)}
                      onChange={(e) => updateGrowthRate(year, Number(e.target.value) / 100)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-border" />

            {/* Terminal Value Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Terminal Value</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terminalMethod">Method</Label>
                  <Select
                    value={settings.terminalMethod}
                    onValueChange={(value) => updateSetting('terminalMethod', value as 'gordon' | 'exit_multiple')}
                  >
                    <SelectTrigger id="terminalMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gordon">Gordon Growth Model</SelectItem>
                      <SelectItem value="exit_multiple">Exit Multiple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {settings.terminalMethod === 'gordon' ? (
                  <div className="space-y-2">
                    <Label htmlFor="perpetualGrowthRate">Perpetual Growth Rate (%)</Label>
                    <Input
                      id="perpetualGrowthRate"
                      type="number"
                      step="0.1"
                      value={(settings.perpetualGrowthRate * 100).toFixed(1)}
                      onChange={(e) => updateSetting('perpetualGrowthRate', Number(e.target.value) / 100)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="exitMultiple">Exit EBITDA Multiple</Label>
                    <Input
                      id="exitMultiple"
                      type="number"
                      step="0.1"
                      value={settings.exitMultiple?.toFixed(1) || ''}
                      onChange={(e) => updateSetting('exitMultiple', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
