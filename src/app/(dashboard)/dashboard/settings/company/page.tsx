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
import { IndustryCombobox } from '@/components/company/IndustryCombobox'
import { QuickBooksCard } from '@/components/integrations'

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
            Select the industry that best matches your business. This affects valuation multiples.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Industry</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Search by typing any part of the industry name, or browse the categories
            </p>
            <IndustryCombobox
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
          </div>
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
