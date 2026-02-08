'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function getDaysInMonth(month: number): number {
  return new Date(2023, month, 0).getDate()
}

interface FYESettingsLinkProps {
  companyId: string
  fiscalYearEndMonth: number
  fiscalYearEndDay: number
  onFYEChange?: (month: number, day: number) => void
}

export function FYESettingsLink({
  companyId,
  fiscalYearEndMonth,
  fiscalYearEndDay,
  onFYEChange,
}: FYESettingsLinkProps) {
  const [open, setOpen] = useState(false)
  const [tempMonth, setTempMonth] = useState(fiscalYearEndMonth)
  const [tempDay, setTempDay] = useState(fiscalYearEndDay)
  const [isSaving, setIsSaving] = useState(false)

  // Sync temp values when props change
  useEffect(() => {
    setTempMonth(fiscalYearEndMonth)
    setTempDay(fiscalYearEndDay)
  }, [fiscalYearEndMonth, fiscalYearEndDay])

  // Adjust day if month changes
  useEffect(() => {
    const maxDay = getDaysInMonth(tempMonth)
    if (tempDay > maxDay) {
      setTempDay(maxDay)
    }
  }, [tempMonth, tempDay])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYearEndMonth: tempMonth,
          fiscalYearEndDay: tempDay,
        }),
      })
      onFYEChange?.(tempMonth, tempDay)
      setOpen(false)
    } catch (err) {
      console.error('Error saving fiscal year end:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const isCalendarYear = fiscalYearEndMonth === 12 && fiscalYearEndDay === 31
  const displayText = isCalendarYear
    ? 'Calendar year (Dec 31)'
    : `FYE ${MONTH_NAMES[fiscalYearEndMonth - 1]} ${fiscalYearEndDay}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
        >
          <Calendar className="h-3 w-3" />
          {displayText}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Fiscal Year End Date</p>
          <p className="text-xs text-muted-foreground">
            Applies to all fiscal years
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Select
                value={tempMonth.toString()}
                onValueChange={(v) => setTempMonth(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Day</Label>
              <Select
                value={tempDay.toString()}
                onValueChange={(v) => setTempDay(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: getDaysInMonth(tempMonth) }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempMonth(fiscalYearEndMonth)
                setTempDay(fiscalYearEndDay)
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
