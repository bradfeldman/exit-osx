'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload } from 'lucide-react'
import styles from '@/components/admin/admin-tools-2.module.css'

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

export default function AdminIndustryMultiplesPage() {
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
      await loadMultiples()
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

  const latestMultiple = multiples.length > 0
    ? multiples.reduce((latest, m) =>
        new Date(m.effectiveDate) > new Date(latest.effectiveDate) ? m : latest
      )
    : null

  const groupedByIndustry = multiples.reduce((acc, m) => {
    if (!acc[m.icbIndustry]) {
      acc[m.icbIndustry] = []
    }
    acc[m.icbIndustry].push(m)
    return acc
  }, {} as Record<string, IndustryMultiple[]>)

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
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Industry Multiples</h1>
        <p>Configure EBITDA and Revenue multiple ranges by industry classification</p>
      </div>

      {/* Data Source + CSV Controls */}
      <div className={styles.card}>
        <div className={styles.cardBodyFlush}>
          <div className={styles.dataSourceRow}>
            <div className={styles.dataSourceMeta}>
              <p>Data Source</p>
              <p className={styles.dataSourceName}>
                {latestMultiple?.source || 'No source specified'}
              </p>
              <p>Last Updated: {latestMultiple ? formatDate(latestMultiple.effectiveDate) : 'N/A'}</p>
            </div>
            <div className={styles.csvButtons}>
              <Button
                variant="outline"
                onClick={handleDownloadCSV}
                disabled={loading || multiples.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCSV}
                  style={{ display: 'none' }}
                  id="csv-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.noticeWarning}>
        <strong>Note:</strong> Changes to industry multiples will automatically create new snapshots
        for all affected companies. The dashboard will reflect updated valuations immediately.
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <input
          type="text"
          placeholder="Search industries..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchCount}>{multiples.length} total multiples</span>
      </div>

      {error && <div className={styles.noticeError}>{error}</div>}
      {success && <div className={styles.noticeSuccess}>{success}</div>}

      {/* Industry Accordion */}
      <div className={styles.industryList}>
        {filteredIndustries.map(([industry, items]) => (
          <div key={industry} className={styles.industryCard}>
            <div
              className={styles.industryCardHeader}
              onClick={() => setExpandedIndustry(expandedIndustry === industry ? null : industry)}
            >
              <div className={styles.industryCardHeaderLeft}>
                <h3>{formatLabel(industry)}</h3>
                <p>{items.length} subsector(s)</p>
              </div>
              <span className={styles.industryCardToggle}>
                {expandedIndustry === industry ? '−' : '+'}
              </span>
            </div>

            {expandedIndustry === industry && (
              <div className={styles.industryCardBody}>
                <div className={styles.tableHeaderRow}>
                  <div>Classification</div>
                  <div style={{ textAlign: 'center' }}>EBITDA Multiple</div>
                  <div style={{ textAlign: 'center' }}>Revenue Multiple</div>
                </div>

                <div className={styles.subsectorRows}>
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
                        className={isModified ? styles.subsectorRowModified : styles.subsectorRow}
                      >
                        <div>
                          <p className={styles.subsectorName}>
                            {formatLabel(m.icbSubSector)}
                          </p>
                          <p className={styles.subsectorPath}>
                            {formatLabel(m.icbSuperSector)} / {formatLabel(m.icbSector)}
                          </p>
                        </div>

                        <div className={styles.multipleInputGroup}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={edited.ebitdaMultipleLow}
                            onChange={(e) => handleChange(m.id, 'ebitdaMultipleLow', e.target.value)}
                            className={styles.multipleInput}
                          />
                          <span className={styles.multipleSeparator}>-</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={edited.ebitdaMultipleHigh}
                            onChange={(e) => handleChange(m.id, 'ebitdaMultipleHigh', e.target.value)}
                            className={styles.multipleInput}
                          />
                          <span className={styles.multipleSuffix}>x</span>
                        </div>

                        <div className={styles.multipleInputGroup}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={edited.revenueMultipleLow}
                            onChange={(e) => handleChange(m.id, 'revenueMultipleLow', e.target.value)}
                            className={styles.multipleInput}
                          />
                          <span className={styles.multipleSeparator}>-</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={edited.revenueMultipleHigh}
                            onChange={(e) => handleChange(m.id, 'revenueMultipleHigh', e.target.value)}
                            className={styles.multipleInput}
                          />
                          <span className={styles.multipleSuffix}>x</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredIndustries.length === 0 && (
        <div className={styles.emptyState}>
          No industries match your search
        </div>
      )}

      {/* Bottom Actions */}
      <div className={styles.bottomActionsCard}>
        <div className={styles.bottomActionsRow}>
          <div className={styles.bottomActionsLeft}>
            <Button
              variant="outline"
              onClick={handleRestoreDefaults}
              disabled={restoring || saving}
            >
              {restoring ? 'Restoring...' : 'Restore Defaults'}
            </Button>
            <p>Reset all multiples to seed data values</p>
          </div>
          <div className={styles.bottomActionsRight}>
            <Button
              onClick={handleSave}
              disabled={saving || restoring || !hasChanges()}
            >
              {saving ? 'Saving...' : `Save Changes${hasChanges() ? ` (${getChangedMultiples().length})` : ''}`}
            </Button>
            {hasChanges() && (
              <p>{getChangedMultiples().length} multiple(s) modified</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
