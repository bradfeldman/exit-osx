'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IndustryListInline } from '@/components/company/IndustryListInline'
import { AccountabilityPartnerCard } from '@/components/settings/AccountabilityPartnerCard'
import { AssessmentCadenceCard } from '@/components/settings/AssessmentCadenceCard'
import { getFlattenedOptionBySubSector } from '@/lib/data/industries'
import styles from './settings.module.css'

const ENTITY_TYPES = [
  { value: 'C_CORP', label: 'C-Corporation' },
  { value: 'S_CORP', label: 'S-Corporation' },
  { value: 'LLC', label: 'LLC' },
  { value: 'SOLE_PROP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
]

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
  entityType: string | null
}

const _MONTHS = [
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

function _getDaysInMonth(month: number): number {
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return daysPerMonth[month - 1] || 31
}

export function CompanySettings() {
  const router = useRouter()
  const { selectedCompanyId, refreshCompanies, setSelectedCompanyId } = useCompany()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [name, setName] = useState('')
  const [icbIndustry, setIcbIndustry] = useState('')
  const [icbSuperSector, setIcbSuperSector] = useState('')
  const [icbSector, setIcbSector] = useState('')
  const [icbSubSector, setIcbSubSector] = useState('')
  const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState(12)
  const [fiscalYearEndDay, setFiscalYearEndDay] = useState(31)
  const [entityType, setEntityType] = useState<string | null>(null)

  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteReason, setDeleteReason] = useState('')

  const [businessDescription, setBusinessDescription] = useState('')
  const [matchingIndustry, setMatchingIndustry] = useState(false)
  const [industryMatchError, setIndustryMatchError] = useState<string | null>(null)
  const [showIndustryList, setShowIndustryList] = useState(false)
  const [industryMatchResult, setIndustryMatchResult] = useState<{
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
    subSectorLabel: string
    reasoning: string
    source: 'ai' | 'keyword' | 'default'
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
          setEntityType(data.company.entityType || null)
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
    setIndustryMatchResult(null)
    setBusinessDescription('')
    setShowIndustryList(false)
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

      setIndustryMatchResult({
        icbIndustry: match.icbIndustry,
        icbSuperSector: match.icbSuperSector,
        icbSector: match.icbSector,
        icbSubSector: match.icbSubSector,
        subSectorLabel: match.subSectorLabel,
        reasoning: match.reasoning,
        source: data.source,
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
          entityType,
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

      setSelectedCompanyId(null)
      await refreshCompanies()
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
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className={styles.section}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.emptyState}>
              <p>No company selected. Please select a company from the sidebar.</p>
              <Button onClick={() => router.push('/dashboard/company/setup')}>
                Create New Company
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      {/* Basic Information */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Basic Information</h2>
          <p className={styles.cardDescription}>Company name and identification</p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.fieldStack}>
            <div className={styles.formGroup}>
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Industry Classification */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Industry Classification</h2>
          <p className={styles.cardDescription}>
            {icbSubSector
              ? 'Your current industry classification. This affects valuation multiples.'
              : 'Describe your business and we\'ll find the best industry classification. This affects valuation multiples.'}
          </p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.fieldStack}>
            {icbSubSector ? (
              <div className={styles.industryDisplay}>
                <div className={styles.industryIcon}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                  </svg>
                </div>
                <div className={styles.industryInfo}>
                  <p>
                    {getFlattenedOptionBySubSector(icbSubSector)?.subSectorLabel || icbSubSector}
                  </p>
                  <p>
                    {getFlattenedOptionBySubSector(icbSubSector)?.industryLabel} &gt;{' '}
                    {getFlattenedOptionBySubSector(icbSubSector)?.superSectorLabel} &gt;{' '}
                    {getFlattenedOptionBySubSector(icbSubSector)?.sectorLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIcbIndustry('')
                    setIcbSuperSector('')
                    setIcbSector('')
                    setIcbSubSector('')
                    setBusinessDescription('')
                    setIndustryMatchResult(null)
                  }}
                  className={styles.industryRemove}
                  title="Remove selection"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
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
                    className={styles.textarea}
                    disabled={matchingIndustry}
                  />
                  <div className={styles.charCount}>
                    <button
                      type="button"
                      onClick={() => setShowIndustryList(!showIndustryList)}
                    >
                      {showIndustryList ? 'Hide Industry List' : 'Choose from Industry List'}
                    </button>
                    <span>{businessDescription.length}/250</span>
                  </div>
                </div>

                <AnimatePresence>
                  {showIndustryList && (
                    <IndustryListInline
                      value={undefined}
                      onSelect={handleIndustrySelect}
                      onClose={() => setShowIndustryList(false)}
                    />
                  )}
                </AnimatePresence>

                {industryMatchError && (
                  <div className={styles.messageError}>
                    {industryMatchError}
                  </div>
                )}

                {matchingIndustry && (
                  <div className={styles.matchingSpinner}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Finding classification...
                  </div>
                )}

                {industryMatchResult && (
                  <div className={styles.industryMatch}>
                    <div className={styles.industryMatchHeader}>
                      <div className={styles.industryMatchIcon}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <p className={styles.industryMatchLabel}>
                          {industryMatchResult.source === 'ai' ? 'Recommended Classification' : 'Keyword Classification'}
                        </p>
                        <p className={styles.industryMatchValue}>{industryMatchResult.subSectorLabel}</p>
                        <p className={styles.industryMatchReasoning}>{industryMatchResult.reasoning}</p>
                      </div>
                    </div>
                    <div className={styles.industryMatchActions}>
                      <Button
                        type="button"
                        onClick={handleAcceptRecommendation}
                        size="sm"
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
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Entity Type */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Entity Type</h2>
          <p className={styles.cardDescription}>
            Your business entity structure affects tax treatment of sale proceeds
          </p>
        </div>
        <div className={styles.cardContent}>
          <Select
            value={entityType || ''}
            onValueChange={(val) => setEntityType(val || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((et) => (
                <SelectItem key={et.value} value={et.value}>
                  {et.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assessment Cadence */}
      <AssessmentCadenceCard />

      {/* Accountability Partner */}
      <AccountabilityPartnerCard />

      {message && (
        <div className={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
          {message.text}
        </div>
      )}

      <div className={styles.buttonRow}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Cancel
        </Button>
      </div>

      {/* Danger Zone */}
      <div className={styles.dangerZone}>
        <div className={styles.dangerZoneHeader}>
          <h2 className={styles.dangerZoneTitle}>Danger Zone</h2>
          <p className={styles.dangerZoneDescription}>
            Irreversible and destructive actions
          </p>
        </div>
        <div className={styles.dangerZoneContent}>
          <div className={styles.dangerInner}>
            <div>
              <h3>Delete this company</h3>
              <p>
                Once deleted, your company data will be retained for 30 days before permanent deletion.
                During this period, you may contact support to restore your data.
              </p>
            </div>

            <div className={styles.fieldStack}>
              <div className={styles.formGroup}>
                <Label htmlFor="delete-reason">
                  Reason for deletion (optional)
                </Label>
                <Input
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Help us understand why you're leaving..."
                />
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="delete-confirmation">
                  To confirm, type <strong>{company?.name}</strong> below
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter company name to confirm"
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
        </div>
      </div>
    </div>
  )
}
