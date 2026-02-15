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
import { Calendar as _Calendar } from 'lucide-react'

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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// Get days in a month (using a non-leap year as reference for fiscal year end)
function getDaysInMonth(month: number): number {
  // Use 2023 as reference year (non-leap year)
  return new Date(2023, month, 0).getDate()
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
  const [isSavingFYE, setIsSavingFYE] = useState(false)
  const [_showFYEPicker, setShowFYEPicker] = useState(false)
  const [tempMonth, setTempMonth] = useState(12)
  const [tempDay, setTempDay] = useState(31)

  // Fetch company settings when dialog opens
  useEffect(() => {
    async function fetchCompanySettings() {
      if (!open || !companyId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/companies/${companyId}`)
        if (response.ok) {
          const data = await response.json()
          const month = data.company.fiscalYearEndMonth || 12
          const day = data.company.fiscalYearEndDay || 31
          setCompanySettings({ fiscalYearEndMonth: month, fiscalYearEndDay: day })
          setTempMonth(month)
          setTempDay(day)
        }
      } catch (err) {
        console.error('Error fetching company settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanySettings()
  }, [open, companyId])

  // When month changes, adjust day if needed
  useEffect(() => {
    const maxDay = getDaysInMonth(tempMonth)
    if (tempDay > maxDay) {
      setTempDay(maxDay)
    }
  }, [tempMonth, tempDay])

  // Save fiscal year end
  const _handleSaveFYE = async () => {
    setCompanySettings({
      fiscalYearEndMonth: tempMonth,
      fiscalYearEndDay: tempDay,
    })
    setShowFYEPicker(false)

    setIsSavingFYE(true)
    try {
      await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYearEndMonth: tempMonth,
          fiscalYearEndDay: tempDay,
        }),
      })
    } catch (err) {
      console.error('Error saving fiscal year end:', err)
    } finally {
      setIsSavingFYE(false)
    }
  }

  // Format fiscal year end for display
  const _formatFYE = (month: number, day: number) => {
    return `${MONTH_NAMES[month - 1]} ${day}`
  }

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
    return `FY${fiscalYear} (YE ${MONTH_NAMES_SHORT[fiscalYearEndMonth - 1]} ${fiscalYearEndDay})`
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

  // Preview dates
  const dates = calculateDates()
  const startDatePreview = new Date(dates.startDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const endDatePreview = new Date(dates.endDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

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
            <div className="rounded-md bg-muted p-3 space-y-2">
              <p className="text-sm font-medium">{generateLabel()}</p>
              <p className="text-xs text-muted-foreground">
                {startDatePreview} - {endDatePreview}
              </p>
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
              <Button type="submit" disabled={isSubmitting || isSavingFYE}>
                {isSubmitting ? 'Creating...' : 'Create Period'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
