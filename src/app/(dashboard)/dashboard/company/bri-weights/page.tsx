'use client'

import { useEffect, useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import styles from '@/components/valuation/valuation-pages.module.css'

interface BriWeights {
  FINANCIAL: number
  TRANSFERABILITY: number
  OPERATIONAL: number
  MARKET: number
  LEGAL_TAX: number
  PERSONAL: number
}

const DEFAULT_WEIGHTS: BriWeights = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

const CATEGORY_LABELS: Record<keyof BriWeights, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal/Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_DESCRIPTIONS: Record<keyof BriWeights, string> = {
  FINANCIAL: 'Revenue quality, profitability trends, financial documentation',
  TRANSFERABILITY: 'Owner dependency, key person risk, process documentation',
  OPERATIONAL: 'Systems, technology, scalability, team structure',
  MARKET: 'Competitive position, customer concentration, growth potential',
  LEGAL_TAX: 'Legal compliance, tax structure, IP protection',
  PERSONAL: 'Owner readiness, timeline flexibility, transition planning',
}

export default function CompanyBriWeightsPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()
  const [weights, setWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [defaultWeights, setDefaultWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [isDefault, setIsDefault] = useState(true)
  const [isGlobal, setIsGlobal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCompanyId) {
      loadWeights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  async function loadWeights() {
    if (!selectedCompanyId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/bri-weights`)
      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setDefaultWeights(data.defaultWeights || DEFAULT_WEIGHTS)
        setIsDefault(data.isDefault)
        setIsGlobal(data.isGlobal)
      }
    } catch (_err) {
      // Failed to load weights
    } finally {
      setLoading(false)
    }
  }

  function handleWeightChange(category: keyof BriWeights, value: string) {
    const intValue = Math.round(parseFloat(value))
    const numValue = intValue / 100
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      setWeights(prev => ({ ...prev, [category]: numValue }))
      setError(null)
      setSuccess(null)
    }
  }

  function getTotalPercent(): number {
    return Object.values(weights).reduce((sum, w) => sum + Math.round(w * 100), 0)
  }

  function isValidTotal(): boolean {
    return getTotalPercent() === 100
  }

  async function handleSave() {
    if (!selectedCompanyId) return
    if (!isValidTotal()) {
      setError('Weights must sum to exactly 100%')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const cleanWeights: BriWeights = {} as BriWeights
      for (const [key, value] of Object.entries(weights)) {
        cleanWeights[key as keyof BriWeights] = Math.round(value * 100) / 100
      }

      const response = await fetch(`/api/companies/${selectedCompanyId}/bri-weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: cleanWeights }),
      })

      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
        setIsGlobal(data.isGlobal)
        setSuccess('Weights saved successfully. A new valuation snapshot has been created.')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save weights')
      }
    } catch (_err) {
      setError('Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevertToGlobal() {
    if (!selectedCompanyId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/bri-weights`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
        setIsGlobal(data.isGlobal)
        setSuccess('Reverted to global defaults. A new valuation snapshot has been created.')
      } else {
        setError('Failed to revert to defaults')
      }
    } catch (_err) {
      setError('Failed to revert to defaults')
    } finally {
      setSaving(false)
    }
  }

  // Suppress unused variable warning
  void isDefault

  const totalPercent = getTotalPercent()

  if (companyLoading || loading) {
    return (
      <div className={styles.briWeightsLoading}>
        <div className={styles.briWeightsSpinner} />
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className={styles.briWeightsEmpty}>
        <p>No company selected</p>
      </div>
    )
  }

  return (
    <div className={styles.briWeightsPage}>
      {/* Page header */}
      <div className={styles.briWeightsHeader}>
        <h1>BRI Category Weights</h1>
        <p>
          Customize {selectedCompany?.name}&apos;s BRI category weights below or restore to default weights
        </p>
      </div>

      {/* Current Status */}
      <div className={styles.briWeightsStatusCard}>
        <p className={styles.briWeightsStatusTitle}>Current Weight Source</p>
        <div className={styles.briWeightsStatusRow}>
          {isGlobal ? (
            <>
              <span className={`${styles.briWeightsBadge} ${styles.global}`}>
                Using Global {isDefault ? 'Defaults' : 'Custom Weights'}
              </span>
              <span className={styles.briWeightsStatusNote}>
                This company inherits weights from the system defaults
              </span>
            </>
          ) : (
            <>
              <span className={`${styles.briWeightsBadge} ${styles.custom}`}>
                Company-Specific Weights
              </span>
              <span className={styles.briWeightsStatusNote}>
                This company has custom weight settings
              </span>
            </>
          )}
        </div>
      </div>

      {/* BRI Formula Display */}
      <div className={styles.briWeightsFormulaCard}>
        <p className={styles.briWeightsFormulaTitle}>BRI Calculation Formula</p>
        <p className={styles.briWeightsFormulaSubtitle}>
          The Buyer Readiness Index is a weighted average of six category scores
        </p>
        <div className={styles.briWeightsFormulaBlock}>
          <p className={styles.briWeightsFormulaComment}>{'// Weighted BRI Calculation'}</p>
          <p>
            BRI = (Financial &times;{' '}
            <span className={styles.briWeightsFormulaAccent}>{(weights.FINANCIAL * 100).toFixed(0)}%</span>)
          </p>
          <p className={styles.briWeightsFormulaIndent}>
            + (Transferability &times;{' '}
            <span className={styles.briWeightsFormulaAccent}>{(weights.TRANSFERABILITY * 100).toFixed(0)}%</span>)
          </p>
          <p className={styles.briWeightsFormulaIndent}>
            + (Operational &times;{' '}
            <span className={styles.briWeightsFormulaAccent}>{(weights.OPERATIONAL * 100).toFixed(0)}%</span>)
          </p>
          <p className={styles.briWeightsFormulaIndent}>
            + (Market &times;{' '}
            <span className={styles.briWeightsFormulaAccent}>{(weights.MARKET * 100).toFixed(0)}%</span>)
          </p>
          <p className={styles.briWeightsFormulaIndent}>
            + (Legal/Tax &times;{' '}
            <span className={styles.briWeightsFormulaAccent}>{(weights.LEGAL_TAX * 100).toFixed(0)}%</span>)
          </p>
          <p className={styles.briWeightsFormulaIndent}>
            + (Personal &times;{' '}
            <span className={styles.briWeightsFormulaAccent}>{(weights.PERSONAL * 100).toFixed(0)}%</span>)
          </p>
        </div>
      </div>

      {/* Weights Editor */}
      <div className={styles.briWeightsEditorCard}>
        <p className={styles.briWeightsEditorTitle}>Category Weights</p>
        <p className={styles.briWeightsEditorSubtitle}>
          Adjust the weight for each category. All weights must sum to exactly 100%.
        </p>

        <div className={styles.briWeightsEditorContent}>
          {/* Weight Inputs */}
          <div className={styles.briWeightsRows}>
            {(Object.keys(weights) as Array<keyof BriWeights>).map((category) => (
              <div key={category} className={styles.briWeightsRow}>
                <div className={styles.briWeightsCategoryInfo}>
                  <p className={styles.briWeightsCategoryName}>{CATEGORY_LABELS[category]}</p>
                  <p className={styles.briWeightsCategoryDesc}>{CATEGORY_DESCRIPTIONS[category]}</p>
                </div>
                <div className={styles.briWeightsInputGroup}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(weights[category] * 100)}
                    onChange={(e) => handleWeightChange(category, e.target.value)}
                    className={styles.briWeightsSlider}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(weights[category] * 100)}
                    onChange={(e) => handleWeightChange(category, e.target.value)}
                    className={styles.briWeightsNumberInput}
                  />
                  <span className={styles.briWeightsPercentSuffix}>%</span>
                </div>
                <div className={styles.briWeightsDefaultLabel}>
                  Default: {(defaultWeights[category] * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className={styles.briWeightsTotal}>
            <div className={styles.briWeightsTotalRow}>
              <span className={styles.briWeightsTotalLabel}>Total</span>
              <span className={`${styles.briWeightsTotalValue} ${isValidTotal() ? styles.valid : styles.invalid}`}>
                {totalPercent}%
              </span>
            </div>
            {!isValidTotal() && (
              <p className={styles.briWeightsTotalError}>
                Weights must sum to exactly 100%. Currently {totalPercent}%{' '}
                ({totalPercent > 100 ? 'over' : 'under'} by {Math.abs(totalPercent - 100)}%)
              </p>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className={`${styles.briWeightsAlert} ${styles.error}`}>
              {error}
            </div>
          )}
          {success && (
            <div className={`${styles.briWeightsAlert} ${styles.success}`}>
              {success}
            </div>
          )}

          {/* Actions */}
          <div className={styles.briWeightsActions}>
            <Button
              variant="outline"
              onClick={handleRevertToGlobal}
              disabled={saving || isGlobal}
            >
              Revert to Global Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isValidTotal()}
            >
              {saving ? 'Saving...' : 'Save Custom Weights'}
            </Button>
          </div>
        </div>
      </div>

      {/* Impact Note */}
      <div className={styles.briWeightsNote}>
        <span className={styles.briWeightsNoteStrong}>Note:</span>{' '}
        Saving custom weights will immediately create a new valuation snapshot
        for this company using the updated BRI calculation. The dashboard will reflect the new values.
      </div>
    </div>
  )
}
