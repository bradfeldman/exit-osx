'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface IndustryMultiple {
  id: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  ebitdaMultipleLow: number
  ebitdaMultipleHigh: number
  revenueMultipleLow: number
  revenueMultipleHigh: number
  effectiveDate: string
  source: string | null
}

interface EditedMultiple {
  ebitdaMultipleLow: number
  ebitdaMultipleHigh: number
  revenueMultipleLow: number
  revenueMultipleHigh: number
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bSub\b/gi, '')
    .trim()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function IndustryMultiplesPage() {
  const [multiples, setMultiples] = useState<IndustryMultiple[]>([])
  const [editedMultiples, setEditedMultiples] = useState<Record<string, EditedMultiple>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMultiples()
  }, [])

  async function loadMultiples() {
    try {
      const response = await fetch('/api/admin/industry-multiples')
      if (response.ok) {
        const data = await response.json()
        setMultiples(data.multiples)
        // Initialize edited values
        const edited: Record<string, EditedMultiple> = {}
        for (const m of data.multiples) {
          edited[m.id] = {
            ebitdaMultipleLow: m.ebitdaMultipleLow,
            ebitdaMultipleHigh: m.ebitdaMultipleHigh,
            revenueMultipleLow: m.revenueMultipleLow,
            revenueMultipleHigh: m.revenueMultipleHigh,
          }
        }
        setEditedMultiples(edited)
      }
    } catch (err) {
      console.error('Failed to load multiples:', err)
      setError('Failed to load industry multiples')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(id: string, field: keyof EditedMultiple, value: string) {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setEditedMultiples(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: numValue },
      }))
      setError(null)
      setSuccess(null)
    }
  }

  function hasChanges(): boolean {
    for (const m of multiples) {
      const edited = editedMultiples[m.id]
      if (!edited) continue
      if (
        edited.ebitdaMultipleLow !== m.ebitdaMultipleLow ||
        edited.ebitdaMultipleHigh !== m.ebitdaMultipleHigh ||
        edited.revenueMultipleLow !== m.revenueMultipleLow ||
        edited.revenueMultipleHigh !== m.revenueMultipleHigh
      ) {
        return true
      }
    }
    return false
  }

  function getChangedMultiples(): IndustryMultiple[] {
    return multiples.filter(m => {
      const edited = editedMultiples[m.id]
      if (!edited) return false
      return (
        edited.ebitdaMultipleLow !== m.ebitdaMultipleLow ||
        edited.ebitdaMultipleHigh !== m.ebitdaMultipleHigh ||
        edited.revenueMultipleLow !== m.revenueMultipleLow ||
        edited.revenueMultipleHigh !== m.revenueMultipleHigh
      )
    })
  }

  function validateMultiple(edited: EditedMultiple): string | null {
    if (edited.ebitdaMultipleLow > edited.ebitdaMultipleHigh) {
      return 'EBITDA low must be <= high'
    }
    if (edited.revenueMultipleLow > edited.revenueMultipleHigh) {
      return 'Revenue low must be <= high'
    }
    return null
  }

  async function handleSave() {
    const changedMultiples = getChangedMultiples()
    if (changedMultiples.length === 0) return

    // Validate all changes
    for (const m of changedMultiples) {
      const edited = editedMultiples[m.id]
      const validationError = validateMultiple(edited)
      if (validationError) {
        setError(`${formatLabel(m.icbSubSector)}: ${validationError}`)
        return
      }
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    let successCount = 0
    let failCount = 0

    for (const m of changedMultiples) {
      const edited = editedMultiples[m.id]
      try {
        const response = await fetch(`/api/admin/industry-multiples/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edited),
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    if (failCount === 0) {
      setSuccess(`Updated ${successCount} industry multiple(s). Company snapshots have been recalculated.`)
      await loadMultiples() // Reload to get fresh data
    } else {
      setError(`Updated ${successCount}, failed ${failCount}`)
    }

    setSaving(false)
  }

  async function handleRestoreDefaults() {
    if (!confirm('This will reset ALL industry multiples to their default values and recalculate all company snapshots. Continue?')) {
      return
    }

    setRestoring(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/industry-multiples', {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Restored ${data.count} industry multiples to defaults. ${data.snapshotsUpdated.successful} snapshots recalculated.`)
        await loadMultiples()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to restore defaults')
      }
    } catch {
      setError('Failed to restore defaults')
    } finally {
      setRestoring(false)
    }
  }

  async function handleDownloadCSV() {
    try {
      const response = await fetch('/api/admin/industry-multiples/csv')
      if (!response.ok) {
        throw new Error('Failed to download CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `industry-multiples-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download CSV')
    }
  }

  async function handleUploadCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm('This will replace ALL existing industry multiples with the uploaded data and recalculate all company snapshots. Continue?')) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/industry-multiples/csv', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Imported ${data.imported} industry multiples. ${data.snapshotsUpdated.successful} snapshots recalculated.`)
        await loadMultiples()
      } else {
        setError(data.error || 'Failed to upload CSV')
        if (data.details) {
          console.error('CSV parse errors:', data.details)
        }
      }
    } catch {
      setError('Failed to upload CSV')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Get latest effective date and source from multiples
  const latestMultiple = multiples.length > 0
    ? multiples.reduce((latest, m) =>
        new Date(m.effectiveDate) > new Date(latest.effectiveDate) ? m : latest
      )
    : null

  // Group multiples by industry
  const groupedByIndustry = multiples.reduce((acc, m) => {
    if (!acc[m.icbIndustry]) {
      acc[m.icbIndustry] = []
    }
    acc[m.icbIndustry].push(m)
    return acc
  }, {} as Record<string, IndustryMultiple[]>)

  // Filter multiples
  const filteredIndustries = Object.entries(groupedByIndustry).filter(([industry, items]) => {
    if (!filter) return true
    const lowerFilter = filter.toLowerCase()
    return (
      industry.toLowerCase().includes(lowerFilter) ||
      items.some(m =>
        m.icbSuperSector.toLowerCase().includes(lowerFilter) ||
        m.icbSector.toLowerCase().includes(lowerFilter) ||
        m.icbSubSector.toLowerCase().includes(lowerFilter)
      )
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Industry Multiples</h1>
        <p className="text-gray-600">
          Configure EBITDA and Revenue multiple ranges by industry classification
        </p>
      </div>

      {/* Data Source Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Data Source</p>
              <p className="font-medium text-gray-900">
                {latestMultiple?.source || 'No source specified'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Last Updated: {latestMultiple ? formatDate(latestMultiple.effectiveDate) : 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadCSV}
                disabled={loading || multiples.length === 0}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCSV}
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Changes to industry multiples will automatically create new snapshots
          for all affected companies. The dashboard will reflect updated valuations immediately.
        </p>
      </div>

      {/* Search/Filter */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search industries..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]"
        />
        <span className="text-sm text-gray-500">
          {multiples.length} total multiples
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Industry Groups */}
      <div className="space-y-4">
        {filteredIndustries.map(([industry, items]) => (
          <Card key={industry}>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedIndustry(expandedIndustry === industry ? null : industry)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{formatLabel(industry)}</CardTitle>
                  <CardDescription>{items.length} subsector(s)</CardDescription>
                </div>
                <span className="text-2xl text-gray-400">
                  {expandedIndustry === industry ? '−' : '+'}
                </span>
              </div>
            </CardHeader>

            {expandedIndustry === industry && (
              <CardContent>
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-2">
                    <div className="col-span-4">Classification</div>
                    <div className="col-span-4 text-center">EBITDA Multiple</div>
                    <div className="col-span-4 text-center">Revenue Multiple</div>
                  </div>

                  {items.map((m) => {
                    const edited = editedMultiples[m.id] || {
                      ebitdaMultipleLow: m.ebitdaMultipleLow,
                      ebitdaMultipleHigh: m.ebitdaMultipleHigh,
                      revenueMultipleLow: m.revenueMultipleLow,
                      revenueMultipleHigh: m.revenueMultipleHigh,
                    }
                    const isModified =
                      edited.ebitdaMultipleLow !== m.ebitdaMultipleLow ||
                      edited.ebitdaMultipleHigh !== m.ebitdaMultipleHigh ||
                      edited.revenueMultipleLow !== m.revenueMultipleLow ||
                      edited.revenueMultipleHigh !== m.revenueMultipleHigh

                    return (
                      <div
                        key={m.id}
                        className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${
                          isModified ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Classification */}
                        <div className="col-span-4">
                          <p className="font-medium text-gray-900 text-sm">
                            {formatLabel(m.icbSubSector)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatLabel(m.icbSuperSector)} / {formatLabel(m.icbSector)}
                          </p>
                        </div>

                        {/* EBITDA Multiple */}
                        <div className="col-span-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={edited.ebitdaMultipleLow}
                              onChange={(e) => handleChange(m.id, 'ebitdaMultipleLow', e.target.value)}
                              className="w-16 px-2 py-1 text-center border rounded text-sm"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={edited.ebitdaMultipleHigh}
                              onChange={(e) => handleChange(m.id, 'ebitdaMultipleHigh', e.target.value)}
                              className="w-16 px-2 py-1 text-center border rounded text-sm"
                            />
                            <span className="text-gray-500 text-sm">x</span>
                          </div>
                        </div>

                        {/* Revenue Multiple */}
                        <div className="col-span-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={edited.revenueMultipleLow}
                              onChange={(e) => handleChange(m.id, 'revenueMultipleLow', e.target.value)}
                              className="w-16 px-2 py-1 text-center border rounded text-sm"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={edited.revenueMultipleHigh}
                              onChange={(e) => handleChange(m.id, 'revenueMultipleHigh', e.target.value)}
                              className="w-16 px-2 py-1 text-center border rounded text-sm"
                            />
                            <span className="text-gray-500 text-sm">x</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredIndustries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No industries match your search
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="outline"
                onClick={handleRestoreDefaults}
                disabled={restoring || saving}
              >
                {restoring ? 'Restoring...' : 'Restore Defaults'}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Reset all multiples to seed data values
              </p>
            </div>
            <div className="text-right">
              <Button
                onClick={handleSave}
                disabled={saving || restoring || !hasChanges()}
                className="bg-[#B87333] hover:bg-[#9A5F2A]"
              >
                {saving ? 'Saving...' : `Save Changes${hasChanges() ? ` (${getChangedMultiples().length})` : ''}`}
              </Button>
              {hasChanges() && (
                <p className="text-xs text-amber-600 mt-1">
                  {getChangedMultiples().length} multiple(s) modified
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Industry Multiples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>EBITDA Multiple:</strong> Applied to Adjusted EBITDA to calculate enterprise value.
              Higher multiples indicate industries where buyers pay more per dollar of earnings.
            </p>
            <p>
              <strong>Revenue Multiple:</strong> Alternative valuation method, typically used for
              high-growth or unprofitable companies. Applied to annual revenue.
            </p>
            <p>
              <strong>Low-High Range:</strong> The range represents typical transaction multiples.
              A company&apos;s Core Score determines where they fall within this range.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-700 mb-2">ICB Classification Hierarchy:</p>
              <p className="text-xs">
                Industry → Super Sector → Sector → Sub Sector
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Example: Technology → Software & Services → Software → Enterprise Software
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Icon components
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}
