'use client'

import { useState, useEffect } from 'react'
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

interface AddPeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  onPeriodCreated: (period: FinancialPeriod) => void
}

interface FinancialPeriod {
  id: string
  periodType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
  fiscalYear: number
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  month?: number | null
  startDate: string
  endDate: string
  label: string
  hasIncomeStatement: boolean
  hasBalanceSheet: boolean
  adjustmentCount: number
  ebitda: number | null
  createdAt: string
}

interface CompanySettings {
  fiscalYearEndMonth: number
  fiscalYearEndDay: number
}

export function AddPeriodDialog({
  open,
  onOpenChange,
  companyId,
  onPeriodCreated,
}: AddPeriodDialogProps) {
  const currentYear = new Date().getFullYear()
  // Default to last completed year (e.g., if today is 7/15/2026, default to 2025)
  const lastCompletedYear = currentYear - 1
  const [fiscalYear, setFiscalYear] = useState(lastCompletedYear)
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    fiscalYearEndMonth: 12,
    fiscalYearEndDay: 31,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch company settings when dialog opens
  useEffect(() => {
    async function fetchCompanySettings() {
      if (!open || !companyId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/companies/${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setCompanySettings({
            fiscalYearEndMonth: data.company.fiscalYearEndMonth || 12,
            fiscalYearEndDay: data.company.fiscalYearEndDay || 31,
          })
        }
      } catch (err) {
        console.error('Error fetching company settings:', err)
        // Keep defaults on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanySettings()
  }, [open, companyId])

  // Calculate start and end dates based on fiscal year end
  const calculateDates = () => {
    const { fiscalYearEndMonth, fiscalYearEndDay } = companySettings
    // End date is the fiscal year end date in the fiscal year
    const endDate = new Date(fiscalYear, fiscalYearEndMonth - 1, fiscalYearEndDay)

    // Start date is one day after the previous fiscal year end (one year prior)
    const startDate = new Date(fiscalYear - 1, fiscalYearEndMonth - 1, fiscalYearEndDay + 1)

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }

  // Generate label based on fiscal year end
  const generateLabel = () => {
    const { fiscalYearEndMonth, fiscalYearEndDay } = companySettings
    if (fiscalYearEndMonth === 12 && fiscalYearEndDay === 31) {
      return `FY${fiscalYear}` // Calendar year
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `FY${fiscalYear} (YE ${monthNames[fiscalYearEndMonth - 1]})`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const dates = calculateDates()
      const body = {
        periodType: 'ANNUAL',
        fiscalYear,
        startDate: dates.startDate,
        endDate: dates.endDate,
        label: generateLabel(),
      }

      const response = await fetch(`/api/companies/${companyId}/financial-periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create period')
      }

      const data = await response.json()
      onPeriodCreated(data.period)
      onOpenChange(false)

      // Reset form
      setFiscalYear(lastCompletedYear)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create period')
    } finally {
      setIsSubmitting(false)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Preview dates
  const dates = calculateDates()
  const startDatePreview = new Date(dates.startDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const endDatePreview = new Date(dates.endDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const { fiscalYearEndMonth, fiscalYearEndDay } = companySettings
  const isCalendarYear = fiscalYearEndMonth === 12 && fiscalYearEndDay === 31

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fiscal Year</DialogTitle>
          <DialogDescription>
            Create an annual financial period for your company.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year</Label>
              <Input
                id="fiscalYear"
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value) || currentYear)}
                min={2000}
                max={2100}
              />
              <p className="text-xs text-muted-foreground">
                The year in which the fiscal year ends
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-md bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">{generateLabel()}</p>
              <p className="text-xs text-muted-foreground">
                {startDatePreview} - {endDatePreview}
              </p>
              {!isCalendarYear && (
                <p className="text-xs text-muted-foreground mt-2">
                  Fiscal year ends on {monthNames[fiscalYearEndMonth - 1]} {fiscalYearEndDay}
                  {' '}(set in Company Settings)
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Period'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
