'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { CalendarClock, CheckCircle2 } from 'lucide-react'

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <CardTitle>Assessment Cadence</CardTitle>
        </div>
        <CardDescription>
          Control how often you&apos;re prompted to re-assess your scores.
          You can always re-assess manually at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {CADENCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    cadence === option.value
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-primary/20 hover:bg-muted/30'
                  } ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="radio"
                    name="assessment-cadence"
                    value={option.value}
                    checked={cadence === option.value}
                    onChange={() => handleChange(option.value)}
                    className="mt-1 accent-primary"
                    disabled={saving}
                  />
                  <div>
                    <Label className="font-medium cursor-pointer">{option.label}</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Cadence updated</span>
              </div>
            )}

            {cadence !== 'manual' && nextPromptDate && (
              <p className="text-sm text-muted-foreground">
                Next suggested re-assessment:{' '}
                <span className="font-medium">
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
      </CardContent>
    </Card>
  )
}
