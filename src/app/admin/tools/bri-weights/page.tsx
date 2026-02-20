'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import styles from '@/components/admin/admin-tools-2.module.css'

interface Company {
  id: string
  name: string
}

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

export default function AdminBriWeightsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [weights, setWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [defaultWeights, setDefaultWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [isDefault, setIsDefault] = useState(true)
  const [isGlobal, setIsGlobal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingWeights, setLoadingWeights] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      loadWeights()
    } else {
      setWeights(DEFAULT_WEIGHTS)
      setIsDefault(true)
      setIsGlobal(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  async function loadCompanies() {
    try {
      const response = await fetch('/api/admin/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadWeights() {
    if (!selectedCompanyId) return

    setLoadingWeights(true)
    setError(null)
    setSuccess(null)

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
      console.error('Failed to load weights')
    } finally {
      setLoadingWeights(false)
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

  const totalPercent = getTotalPercent()

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Company BRI Weights</h1>
        <p>Configure custom BRI category weights for individual companies</p>
      </div>

      {/* Company Selector */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Select Company</h3>
          <p className={styles.cardDescription}>
            Choose a company to view and modify its BRI weights
          </p>
        </div>
        <div className={styles.cardBody}>
          {loading ? (
            <div className={styles.loadingRow}>
              <div className={styles.spinnerSm} />
              <span>Loading companies...</span>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className={styles.selectNative}
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedCompanyId && (
        <>
          {loadingWeights ? (
            <div className={styles.loadingInline}>
              <div className={styles.spinner} />
            </div>
          ) : (
            <>
              {/* Current Status */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Current Weight Source</h2>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.statusRow}>
                    {isGlobal ? (
                      <>
                        <span className={styles.badgeNeutral}>
                          Using Global {isDefault ? 'Defaults' : 'Custom Weights'}
                        </span>
                        <span className={styles.statusDescription}>
                          This company inherits weights from the system defaults
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.badgeWarning}>
                          Company-Specific Weights
                        </span>
                        <span className={styles.statusDescription}>
                          This company has custom weight settings
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* BRI Formula Display */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>BRI Calculation Formula</h2>
                  <p className={styles.cardDescription}>
                    The Buyer Readiness Index is a weighted average of six category scores
                  </p>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.codeBlock}>
                    <p className={styles.codeComment}>{'// Weighted BRI Calculation'}</p>
                    <p>BRI = (Financial × <span className={styles.codeHighlight}>{(weights.FINANCIAL * 100).toFixed(0)}%</span>)</p>
                    <p className={styles.codeIndent}>+ (Transferability × <span className={styles.codeHighlight}>{(weights.TRANSFERABILITY * 100).toFixed(0)}%</span>)</p>
                    <p className={styles.codeIndent}>+ (Operational × <span className={styles.codeHighlight}>{(weights.OPERATIONAL * 100).toFixed(0)}%</span>)</p>
                    <p className={styles.codeIndent}>+ (Market × <span className={styles.codeHighlight}>{(weights.MARKET * 100).toFixed(0)}%</span>)</p>
                    <p className={styles.codeIndent}>+ (Legal/Tax × <span className={styles.codeHighlight}>{(weights.LEGAL_TAX * 100).toFixed(0)}%</span>)</p>
                    <p className={styles.codeIndent}>+ (Personal × <span className={styles.codeHighlight}>{(weights.PERSONAL * 100).toFixed(0)}%</span>)</p>
                  </div>
                </div>
              </div>

              {/* Weights Editor */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>Category Weights</h2>
                  <p className={styles.cardDescription}>
                    Adjust the weight for each category. All weights must sum to exactly 100%.
                  </p>
                </div>
                <div className={styles.cardBody}>
                  {/* Weight Inputs */}
                  <div className={styles.categoryList}>
                    {(Object.keys(weights) as Array<keyof BriWeights>).map((category) => (
                      <div key={category} className={styles.weightsRow}>
                        <div className={styles.weightsLabel}>
                          <p className={styles.weightsLabelTitle}>{CATEGORY_LABELS[category]}</p>
                          <p className={styles.weightsLabelDesc}>{CATEGORY_DESCRIPTIONS[category]}</p>
                        </div>
                        <div className={styles.weightsSliderGroup}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={Math.round(weights[category] * 100)}
                            onChange={(e) => handleWeightChange(category, e.target.value)}
                            className={styles.weightsSlider}
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={Math.round(weights[category] * 100)}
                            onChange={(e) => handleWeightChange(category, e.target.value)}
                            className={styles.weightsNumberInput}
                          />
                          <span className={styles.percentSymbol}>%</span>
                        </div>
                        <div className={styles.weightsDefaultHint}>
                          Default: {(defaultWeights[category] * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Total</span>
                    <span className={isValidTotal() ? styles.totalValueValid : styles.totalValueInvalid}>
                      {totalPercent}%
                    </span>
                  </div>
                  {!isValidTotal() && (
                    <p className={styles.totalError}>
                      Weights must sum to exactly 100%. Currently {totalPercent}% ({totalPercent > 100 ? 'over' : 'under'} by {Math.abs(totalPercent - 100)}%)
                    </p>
                  )}

                  {/* Messages */}
                  {error && <div className={styles.noticeError}>{error}</div>}
                  {success && <div className={styles.noticeSuccess}>{success}</div>}

                  {/* Actions */}
                  <div className={styles.cardActions} style={{ paddingTop: '16px' }}>
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
              <div className={styles.noticeWarning}>
                <strong>Note:</strong> Saving custom weights will immediately create a new valuation snapshot
                for this company using the updated BRI calculation. The dashboard will reflect the new values.
              </div>
            </>
          )}
        </>
      )}

      {!selectedCompanyId && (
        <div className={styles.card}>
          <div className={styles.emptyPlaceholder}>
            Select a company above to view and configure its BRI weights.
          </div>
        </div>
      )}
    </div>
  )
}
