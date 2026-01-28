'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCompany } from '@/contexts/CompanyContext'
import { IndustryListDialog } from '@/components/company/IndustryListDialog'
import { QuickBooksCard } from '@/components/integrations'
import { getFlattenedOptionBySubSector } from '@/lib/data/industries'

interface CompanyData {
  id: string
  name: string
  annualRevenue: number
  annualEbitda: number
  ownerCompensation: number
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  fiscalYearEndMonth: number
  fiscalYearEndDay: number
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

function getDaysInMonth(month: number): number {
  // Use a non-leap year for simplicity (Feb = 28)
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return daysPerMonth[month - 1] || 31
}

export default function CompanySettingsPage() {
  const router = useRouter()
  const { selectedCompanyId, refreshCompanies, setSelectedCompanyId } = useCompany()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [icbIndustry, setIcbIndustry] = useState('')
  const [icbSuperSector, setIcbSuperSector] = useState('')
  const [icbSector, setIcbSector] = useState('')
  const [icbSubSector, setIcbSubSector] = useState('')
  const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState(12)
  const [fiscalYearEndDay, setFiscalYearEndDay] = useState(31)

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteReason, setDeleteReason] = useState('')

  // Industry description and AI matching state
  const [businessDescription, setBusinessDescription] = useState('')
  const [matchingIndustry, setMatchingIndustry] = useState(false)
  const [industryMatchError, setIndustryMatchError] = useState<string | null>(null)
  const [industryMatchResult, setIndustryMatchResult] = useState<{
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
    subSectorLabel: string
    reasoning: string
  } | null>(null)

  useEffect(() => {
    async function loadCompany() {
      if (!selectedCompanyId) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}`)
        if (response.ok) {
          const data = await response.json()
          setCompany(data.company)
          setName(data.company.name)
          setIcbIndustry(data.company.icbIndustry || '')
          setIcbSuperSector(data.company.icbSuperSector || '')
          setIcbSector(data.company.icbSector || '')
          setIcbSubSector(data.company.icbSubSector || '')
          setFiscalYearEndMonth(data.company.fiscalYearEndMonth || 12)
          setFiscalYearEndDay(data.company.fiscalYearEndDay || 31)
        }
      } catch (error) {
        console.error('Error loading company:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCompany()
  }, [selectedCompanyId])

  const handleIndustrySelect = (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => {
    setIcbIndustry(selection.icbIndustry)
    setIcbSuperSector(selection.icbSuperSector)
    setIcbSector(selection.icbSector)
    setIcbSubSector(selection.icbSubSector)
    // Clear AI match result when manually selecting
    setIndustryMatchResult(null)
    setBusinessDescription('')
  }

  const handleAcceptRecommendation = () => {
    if (industryMatchResult) {
      setIcbIndustry(industryMatchResult.icbIndustry)
      setIcbSuperSector(industryMatchResult.icbSuperSector)
      setIcbSector(industryMatchResult.icbSector)
      setIcbSubSector(industryMatchResult.icbSubSector)
      setIndustryMatchResult(null)
      setBusinessDescription('')
    }
  }

  const handleFindIndustry = async () => {
    if (!businessDescription.trim()) return

    setMatchingIndustry(true)
    setIndustryMatchError(null)
    setIndustryMatchResult(null)

    try {
      const response = await fetch('/api/industries/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: businessDescription.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to find industry match')
      }

      const data = await response.json()
      const match = data.match

      // Store the recommendation (don't auto-apply)
      setIndustryMatchResult({
        icbIndustry: match.icbIndustry,
        icbSuperSector: match.icbSuperSector,
        icbSector: match.icbSector,
        icbSubSector: match.icbSubSector,
        subSectorLabel: match.subSectorLabel,
        reasoning: match.reasoning,
      })
    } catch (err) {
      setIndustryMatchError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setMatchingIndustry(false)
    }
  }

  const handleSave = async () => {
    if (!selectedCompanyId) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          icbIndustry,
          icbSuperSector,
          icbSector,
          icbSubSector,
          fiscalYearEndMonth,
          fiscalYearEndDay,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update company')
      }

      setMessage({ type: 'success', text: 'Company settings updated successfully' })
      refreshCompanies()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update company',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCompanyId || !company) return
    if (deleteConfirmation !== company.name) return

    setDeleting(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: deleteReason || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete company')
      }

      // Clear selected company and refresh list
      setSelectedCompanyId(null)
      await refreshCompanies()

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete company',
      })
      setDeleting(false)
    }
  }

  const isDeleteEnabled = company && deleteConfirmation === company.name

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600">Select a company to manage its settings</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No company selected. Please select a company from the sidebar.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.push('/dashboard/company/setup')}>
                Create New Company
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-600">Manage your company information</p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Company name and identification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Industry Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Classification</CardTitle>
          <CardDescription>
            Describe your business and we&apos;ll find the best industry classification. This affects valuation multiples.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Selection Display */}
          {icbSubSector && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Current Classification</p>
              <p className="font-medium">
                {getFlattenedOptionBySubSector(icbSubSector)?.subSectorLabel || icbSubSector}
              </p>
              <p className="text-xs text-muted-foreground">
                {getFlattenedOptionBySubSector(icbSubSector)?.industryLabel} &gt;{' '}
                {getFlattenedOptionBySubSector(icbSubSector)?.superSectorLabel} &gt;{' '}
                {getFlattenedOptionBySubSector(icbSubSector)?.sectorLabel}
              </p>
            </div>
          )}

          {/* Business Description Input */}
          <div className="space-y-2">
            <Label htmlFor="business-description">What does your business do?</Label>
            <textarea
              id="business-description"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value.slice(0, 250))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && businessDescription.trim()) {
                  e.preventDefault()
                  handleFindIndustry()
                }
              }}
              placeholder="e.g., We manufacture and sell a mouthguard to help people stop bruxing (teeth grinding)"
              rows={3}
              maxLength={250}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
              disabled={matchingIndustry}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <IndustryListDialog
                value={
                  icbSubSector
                    ? {
                        icbIndustry,
                        icbSuperSector,
                        icbSector,
                        icbSubSector,
                      }
                    : undefined
                }
                onSelect={handleIndustrySelect}
              />
              <span>{businessDescription.length}/250</span>
            </div>
          </div>

          {/* AI Match Error */}
          {industryMatchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {industryMatchError}
            </div>
          )}

          {/* Loading state */}
          {matchingIndustry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Finding classification...
            </div>
          )}

          {/* AI Match Recommendation */}
          {industryMatchResult && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">Recommended Classification</p>
                    <p className="text-base font-bold text-amber-800 mt-1">{industryMatchResult.subSectorLabel}</p>
                    <p className="text-xs text-amber-700 mt-1">{industryMatchResult.reasoning}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAcceptRecommendation}
                    size="sm"
                    className="bg-[#B87333] hover:bg-[#9A5F2A]"
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIndustryMatchResult(null)
                      setBusinessDescription('')
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fiscal Year End */}
      <Card>
        <CardHeader>
          <CardTitle>Fiscal Year End</CardTitle>
          <CardDescription>
            Set your company&apos;s fiscal year end date. This is used when adding financial periods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscal-month">Month</Label>
              <Select
                value={fiscalYearEndMonth.toString()}
                onValueChange={(value) => {
                  const month = parseInt(value)
                  setFiscalYearEndMonth(month)
                  // Adjust day if it exceeds the days in the new month
                  const maxDays = getDaysInMonth(month)
                  if (fiscalYearEndDay > maxDays) {
                    setFiscalYearEndDay(maxDays)
                  }
                }}
              >
                <SelectTrigger id="fiscal-month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-day">Day</Label>
              <Select
                value={fiscalYearEndDay.toString()}
                onValueChange={(value) => setFiscalYearEndDay(parseInt(value))}
              >
                <SelectTrigger id="fiscal-day">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: getDaysInMonth(fiscalYearEndMonth) }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {fiscalYearEndMonth === 12 && fiscalYearEndDay === 31
              ? 'Calendar year (January 1 - December 31)'
              : `Fiscal year ends on ${MONTHS.find(m => m.value === fiscalYearEndMonth)?.label} ${fiscalYearEndDay}`}
          </p>
        </CardContent>
      </Card>

      {/* QuickBooks Integration */}
      <QuickBooksCard companyId={selectedCompanyId} />

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Cancel
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription className="text-red-600">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-red-200 bg-white p-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Delete this company</h3>
              <p className="text-sm text-gray-600 mt-1">
                Once deleted, your company data will be retained for 30 days before permanent deletion.
                During this period, you may contact support to restore your data.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="delete-reason" className="text-gray-700">
                  Reason for deletion (optional)
                </Label>
                <Input
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Help us understand why you're leaving..."
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation" className="text-gray-700">
                  To confirm, type <span className="font-semibold text-red-700">{company?.name}</span> below
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter company name to confirm"
                  className="bg-white"
                />
              </div>

              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!isDeleteEnabled || deleting}
                className="w-full"
              >
                {deleting ? 'Deleting...' : 'Delete Company'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
