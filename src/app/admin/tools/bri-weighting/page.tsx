'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import styles from '@/components/admin/admin-tools-2.module.css'

interface BRIWeights {
  FINANCIAL: number
  TRANSFERABILITY: number
  OPERATIONAL: number
  MARKET: number
  LEGAL_TAX: number
  PERSONAL: number
}

const DEFAULT_WEIGHTS: BRIWeights = {
  FINANCIAL: 25,
  TRANSFERABILITY: 20,
  OPERATIONAL: 20,
  MARKET: 15,
  LEGAL_TAX: 10,
  PERSONAL: 10,
}

const CATEGORY_LABELS: Record<keyof BRIWeights, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_DESCRIPTIONS: Record<keyof BRIWeights, string> = {
  FINANCIAL: 'Revenue stability, profitability, cash flow quality',
  TRANSFERABILITY: 'Owner dependence, management depth, key person risk',
  OPERATIONAL: 'Systems, processes, documentation quality',
  MARKET: 'Competitive position, customer concentration, market trends',
  LEGAL_TAX: 'Compliance, contracts, tax structure',
  PERSONAL: 'Owner readiness, transition planning, deal expectations',
}

export default function AdminBRIWeightingPage() {
  const [weights, setWeights] = useState<BRIWeights>(DEFAULT_WEIGHTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadWeights()
  }, [])

  async function loadWeights() {
    try {
      const response = await fetch('/api/settings/bri-weights')
      if (response.ok) {
        const data = await response.json()
        if (data.weights) {
          // API returns decimals (0.25), convert to integers (25) for display
          const displayWeights: BRIWeights = {
            FINANCIAL: Math.round(data.weights.FINANCIAL * 100),
            TRANSFERABILITY: Math.round(data.weights.TRANSFERABILITY * 100),
            OPERATIONAL: Math.round(data.weights.OPERATIONAL * 100),
            MARKET: Math.round(data.weights.MARKET * 100),
            LEGAL_TAX: Math.round(data.weights.LEGAL_TAX * 100),
            PERSONAL: Math.round(data.weights.PERSONAL * 100),
          }
          setWeights(displayWeights)
        }
      }
    } catch (err) {
      console.error('Failed to load weights:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(category: keyof BRIWeights, value: string) {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setWeights(prev => ({ ...prev, [category]: numValue }))
      setError(null)
      setSuccess(null)
    }
  }

  function getTotalWeight(): number {
    return Object.values(weights).reduce((sum, w) => sum + w, 0)
  }

  function isValid(): boolean {
    return getTotalWeight() === 100
  }

  async function handleSave() {
    if (!isValid()) {
      setError('Weights must sum to 100%')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Convert integers (25) to decimals (0.25) for API
      const apiWeights = {
        FINANCIAL: weights.FINANCIAL / 100,
        TRANSFERABILITY: weights.TRANSFERABILITY / 100,
        OPERATIONAL: weights.OPERATIONAL / 100,
        MARKET: weights.MARKET / 100,
        LEGAL_TAX: weights.LEGAL_TAX / 100,
        PERSONAL: weights.PERSONAL / 100,
      }

      const response = await fetch('/api/settings/bri-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: apiWeights }),
      })

      if (response.ok) {
        setSuccess('Global BRI weights updated successfully')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save weights')
      }
    } catch {
      setError('Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setWeights(DEFAULT_WEIGHTS)
    setError(null)
    setSuccess(null)
  }

  if (loading) {
    return (
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    )
  }

  const totalWeight = getTotalWeight()
  const isValidTotal = totalWeight === 100

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Global BRI Weighting</h1>
        <p>Configure the default weights for Buyer Readiness Index categories</p>
      </div>

      <div className={styles.noticeInfo}>
        <strong>Note:</strong> These are the system-wide default weights. Individual companies
        can override these with custom weights if needed.
      </div>

      {error && <div className={styles.noticeError}>{error}</div>}
      {success && <div className={styles.noticeSuccess}>{success}</div>}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Category Weights</h2>
          <p className={styles.cardDescription}>
            Adjust the percentage weight for each BRI category. Total must equal 100%.
          </p>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.categoryList}>
            {(Object.keys(weights) as Array<keyof BRIWeights>).map((category) => (
              <div key={category} className={styles.categoryRow}>
                <div>
                  <p className={styles.categoryLabel}>{CATEGORY_LABELS[category]}</p>
                  <p className={styles.categoryDescription}>{CATEGORY_DESCRIPTIONS[category]}</p>
                </div>
                <div className={styles.sliderWrapper}>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={weights[category]}
                    onChange={(e) => handleChange(category, e.target.value)}
                  />
                </div>
                <div className={styles.numberInputWrapper}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[category]}
                    onChange={(e) => handleChange(category, e.target.value)}
                    className={styles.numberInput}
                  />
                  <span className={styles.percentSymbol}>%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${weights[category]}%` }}
                  />
                </div>
              </div>
            ))}

            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total</span>
              <span className={isValidTotal ? styles.totalValueValid : styles.totalValueInvalid}>
                {totalWeight}%
                {!isValidTotal && (
                  <span className={styles.totalOffsetHint}>
                    ({totalWeight > 100 ? '+' : ''}{totalWeight - 100}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardBodyFlush}>
          <div className={styles.cardActions}>
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving || !isValidTotal}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Understanding BRI Weights</h2>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.infoText}>
            The Buyer Readiness Index (BRI) is a weighted score that reflects how prepared
            a company is for acquisition from a buyer&apos;s perspective.
          </p>
          <p className={styles.infoText}>
            <strong>Weight Distribution:</strong> The default weights (25-20-20-15-10-10)
            reflect typical buyer priorities, with Financial factors carrying the most weight.
          </p>
          <p className={styles.infoText}>
            <strong>Impact:</strong> Adjusting weights will affect how the BRI score is
            calculated for all companies, which in turn affects valuation discounts.
          </p>
        </div>
      </div>
    </div>
  )
}
