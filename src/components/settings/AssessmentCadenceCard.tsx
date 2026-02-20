'use client'

import { useEffect, useState, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import styles from './settings.module.css'

type CadencePreference = 'weekly' | 'monthly' | 'manual'

interface CadenceOption {
  value: CadencePreference
  label: string
  description: string
}

const CADENCE_OPTIONS: CadenceOption[] = [
  {
    value: 'weekly',
    label: 'Weekly check-ins',
    description: 'Get prompted to review scores every 7 days. Best for active exit preparation.',
  },
  {
    value: 'monthly',
    label: 'Monthly reviews',
    description: 'Get prompted once a month. Recommended for most businesses.',
  },
  {
    value: 'manual',
    label: 'Manual only',
    description: 'No automatic prompts. Re-assess whenever you choose.',
  },
]

export function AssessmentCadenceCard() {
  const { selectedCompanyId } = useCompany()
  const [cadence, setCadence] = useState<CadencePreference>('monthly')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nextPromptDate, setNextPromptDate] = useState<string | null>(null)

  const fetchCadence = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/assessment-cadence`)
      if (res.ok) {
        const data = await res.json()
        setCadence(data.cadencePreference)
        // Find the earliest next prompt date across categories
        const dates = data.categories
          ?.map((c: { nextPromptDate: string | null }) => c.nextPromptDate)
          .filter(Boolean) as string[]
        if (dates && dates.length > 0) {
          dates.sort()
          setNextPromptDate(dates[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch cadence:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchCadence()
  }, [fetchCadence])

  const handleChange = async (newCadence: CadencePreference) => {
    if (!selectedCompanyId || newCadence === cadence) return

    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/assessment-cadence`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadence: newCadence }),
      })

      if (res.ok) {
        setCadence(newCadence)
        setSaved(true)
        // Refresh to get updated next prompt date
        fetchCadence()
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to update cadence:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!selectedCompanyId) return null

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <CalendarClock className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          Assessment Cadence
        </h2>
        <p className={styles.cardDescription}>
          Control how often you&apos;re prompted to re-assess your scores.
          You can always re-assess manually at any time.
        </p>
      </div>
      <div className={styles.cardContent}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: '64px',
                  background: 'var(--surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className={styles.cadenceOptions}>
              {CADENCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={[
                    styles.cadenceOption,
                    cadence === option.value ? styles.cadenceOptionActive : '',
                    saving ? styles.cadenceOptionDisabled : '',
                  ].filter(Boolean).join(' ')}
                >
                  <input
                    type="radio"
                    name="assessment-cadence"
                    value={option.value}
                    checked={cadence === option.value}
                    onChange={() => handleChange(option.value)}
                    disabled={saving}
                  />
                  <div>
                    <Label className={styles.cadenceOptionLabel}>{option.label}</Label>
                    <p className={styles.cadenceOptionDesc}>{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {saved && (
              <div className={styles.cadenceSaved}>
                <CheckCircle2 className="h-4 w-4" />
                <span>Cadence updated</span>
              </div>
            )}

            {cadence !== 'manual' && nextPromptDate && (
              <p className={styles.cadenceNextDate}>
                Next suggested re-assessment:{' '}
                <span>
                  {new Date(nextPromptDate) <= new Date()
                    ? 'Available now'
                    : new Date(nextPromptDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
