'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import styles from '@/components/admin/admin-tools.module.css'

interface Company {
  id: string
  name: string
}

interface SnapshotData {
  id: string
  companyId: string
  createdAt: string
  snapshotReason: string | null
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number
  briScore: number
  briFinancial: number
  briTransferability: number
  briOperational: number
  briMarket: number
  briLegalTax: number
  briPersonal: number
  alphaConstant: number
  baseMultiple: number
  discountFraction: number
  finalMultiple: number
  currentValue: number
  potentialValue: number
  valueGap: number
}

interface SnapshotLogEntry {
  id: string
  date: string
  dateFormatted: string
  reason: string | null
  createdBy: { name: string; email: string } | null
  currentValue: number
  briScore: number
  coreScore: number
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatScore(value: number): string {
  return Math.round(value * 100).toString()
}

function DataRow({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className={styles.dataRow}>
      <div>
        <span className={styles.dataRowLabel}>{label}</span>
        {description && <p className={styles.dataRowDesc}>{description}</p>}
      </div>
      <span className={styles.dataRowValue}>{value}</span>
    </div>
  )
}

export default function AdminSnapshotPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)
  const [snapshotHistory, setSnapshotHistory] = useState<SnapshotLogEntry[]>([])
  const [latestSnapshotId, setLatestSnapshotId] = useState<string | null>(null)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      loadHistory()
    } else {
      setSnapshotHistory([])
      setSnapshot(null)
      setSelectedSnapshotId(null)
      setLatestSnapshotId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  useEffect(() => {
    if (selectedCompanyId && selectedSnapshotId) {
      loadSnapshot()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, selectedSnapshotId])

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

  async function loadHistory() {
    if (!selectedCompanyId) return

    setLoadingHistory(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/valuation-history?limit=50`)
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot history')
      }
      const data = await response.json()

      // chartData is in chronological order, we want reverse (newest first) for display
      const history = [...data.chartData].reverse()
      setSnapshotHistory(history)

      if (history.length > 0) {
        setLatestSnapshotId(history[0].id)
        setSelectedSnapshotId(history[0].id)
      } else {
        setLatestSnapshotId(null)
        setSelectedSnapshotId(null)
        setSnapshot(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingHistory(false)
    }
  }

  async function loadSnapshot() {
    if (!selectedCompanyId || !selectedSnapshotId) return

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/latest-snapshot?snapshotId=${selectedSnapshotId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot')
      }
      const data = await response.json()
      setSnapshot(data.snapshot)
    } catch (err) {
      console.error('Error loading snapshot:', err)
    }
  }

  const isViewingHistorical = selectedSnapshotId && latestSnapshotId && selectedSnapshotId !== latestSnapshotId

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Valuation Snapshot</h1>
        <p className={styles.pageDescription}>
          View stored valuation data from assessment completions
        </p>
      </div>

      {/* Company Selector */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Select Company</h2>
          <p className={styles.cardDescription}>
            Choose a company to view its valuation snapshots
          </p>
        </div>
        <div className={styles.cardContent}>
          {loading ? (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>Loading companies...</span>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className={styles.companySelect}
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

      {error && (
        <div className={styles.bannerError}>
          <p>{error}</p>
        </div>
      )}

      {selectedCompanyId && (
        <>
          {loadingHistory ? (
            <div className={styles.loadingCenter}>
              <div className={styles.spinnerLg} />
            </div>
          ) : snapshotHistory.length === 0 ? (
            <div className={styles.card}>
              <div className={styles.emptyState}>
                No snapshots available for this company. Complete an assessment to generate one.
              </div>
            </div>
          ) : (
            <>
              {/* Historical Warning Banner */}
              {isViewingHistorical && (
                <div className={styles.bannerWarning}>
                  <p className={styles.bannerWarningTitle}>Viewing Historical Snapshot</p>
                  <p className={styles.bannerWarningText}>
                    This snapshot is not current. You are viewing data from{' '}
                    {new Date(snapshot?.createdAt || '').toLocaleDateString()}.{' '}
                    <button
                      onClick={() => setSelectedSnapshotId(latestSnapshotId)}
                      className={styles.bannerWarningLink}
                    >
                      View current snapshot
                    </button>
                  </p>
                </div>
              )}

              {/* Snapshot History Log */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitleLg}>Snapshot History</h2>
                  <p className={styles.cardDescription}>Click a date to view that snapshot</p>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.historyTableWrapper}>
                    <table className={styles.table}>
                      <thead className={styles.historyTableHead}>
                        <tr>
                          <th>Date/Time</th>
                          <th>Triggered By</th>
                          <th>Reason</th>
                          <th className={styles.thRight}>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshotHistory.map((entry) => {
                          const isSelected = entry.id === selectedSnapshotId
                          const isLatest = entry.id === latestSnapshotId

                          return (
                            <tr
                              key={entry.id}
                              onClick={() => setSelectedSnapshotId(entry.id)}
                              className={isSelected ? styles.historyRowSelected : styles.historyRow}
                            >
                              <td>
                                <button style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  <span className={isSelected ? styles.historyDateLinkSelected : styles.historyDateLink}>
                                    {new Date(entry.date).toLocaleString()}
                                  </span>
                                  {isLatest && (
                                    <span className={styles.historyCurrentBadge}>Current</span>
                                  )}
                                </button>
                              </td>
                              <td className={styles.tdMuted}>{entry.createdBy?.name || 'System'}</td>
                              <td className={styles.tdMuted}>{entry.reason || 'N/A'}</td>
                              <td className={styles.tdRight}>{formatCurrency(entry.currentValue)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {snapshot && (
                <>
                  {/* Metadata */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Snapshot Metadata</h2>
                      <p className={styles.cardDescription}>When and why this snapshot was created</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow label="Snapshot ID" value={snapshot.id} />
                      <DataRow label="Company ID" value={snapshot.companyId} />
                      <DataRow
                        label="Created At"
                        value={new Date(snapshot.createdAt).toLocaleString()}
                      />
                      <DataRow
                        label="Reason"
                        value={snapshot.snapshotReason || 'N/A'}
                      />
                    </div>
                  </div>

                  {/* Financial Inputs */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Financial Inputs</h2>
                      <p className={styles.cardDescription}>Base financial data used in valuation</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow
                        label="Adjusted EBITDA"
                        value={formatCurrency(snapshot.adjustedEbitda)}
                        description="Normalized earnings (base EBITDA + add-backs + excess owner comp - deductions)"
                      />
                    </div>
                  </div>

                  {/* Industry Multiples */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Industry Multiples</h2>
                      <p className={styles.cardDescription}>EBITDA multiple range for the selected industry</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow
                        label="Industry Multiple Low (L)"
                        value={`${snapshot.industryMultipleLow.toFixed(1)}x`}
                        description="Floor multiple - guaranteed minimum"
                      />
                      <DataRow
                        label="Industry Multiple High (H)"
                        value={`${snapshot.industryMultipleHigh.toFixed(1)}x`}
                        description="Ceiling multiple - best case scenario"
                      />
                    </div>
                  </div>

                  {/* Core Score */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Core Index</h2>
                      <p className={styles.cardDescription}>Structural business factors positioning within industry range</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow
                        label="Core Score (CS)"
                        value={formatScore(snapshot.coreScore)}
                        description="0-100 scale based on revenue size, revenue model, gross margin, labor intensity, asset intensity, owner involvement"
                      />
                    </div>
                  </div>

                  {/* BRI Scores */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Buyer Readiness Index (BRI)</h2>
                      <p className={styles.cardDescription}>Weighted assessment scores by category</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow
                        label="Buyer Readiness Index"
                        value={formatScore(snapshot.briScore)}
                        description="Weighted average of all categories (0-100)"
                      />
                      <div className={styles.categoryBreakdown}>
                        <p className={styles.sectionSubheaderSm}>Category Breakdown</p>
                        <DataRow
                          label="Financial"
                          value={formatScore(snapshot.briFinancial)}
                          description="Weight: 25%"
                        />
                        <DataRow
                          label="Transferability"
                          value={formatScore(snapshot.briTransferability)}
                          description="Weight: 20%"
                        />
                        <DataRow
                          label="Operational"
                          value={formatScore(snapshot.briOperational)}
                          description="Weight: 20%"
                        />
                        <DataRow
                          label="Market"
                          value={formatScore(snapshot.briMarket)}
                          description="Weight: 15%"
                        />
                        <DataRow
                          label="Legal/Tax"
                          value={formatScore(snapshot.briLegalTax)}
                          description="Weight: 10%"
                        />
                        <DataRow
                          label="Personal"
                          value={formatScore(snapshot.briPersonal)}
                          description="Weight: 10%"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Multiple Calculation */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Multiple Calculation</h2>
                      <p className={styles.cardDescription}>Step-by-step derivation of the final EBITDA multiple</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow
                        label="Alpha Constant (α)"
                        value={snapshot.alphaConstant.toFixed(2)}
                        description="Buyer skepticism exponent (1.3-1.6 range)"
                      />
                      <DataRow
                        label="Base Multiple"
                        value={`${snapshot.baseMultiple.toFixed(2)}x`}
                        description="L + (CS/100) × (H - L)"
                      />
                      <DataRow
                        label="Discount Fraction"
                        value={formatPercent(snapshot.discountFraction)}
                        description="(1 - BRI/100)^α"
                      />
                      <DataRow
                        label="Final Multiple"
                        value={`${snapshot.finalMultiple.toFixed(2)}x`}
                        description="L + (BaseMultiple - L) × (1 - DiscountFraction)"
                      />
                    </div>
                  </div>

                  {/* Valuation Outputs */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Valuation Outputs</h2>
                      <p className={styles.cardDescription}>Final calculated values</p>
                    </div>
                    <div className={styles.cardContent}>
                      <DataRow
                        label="Current Value"
                        value={formatCurrency(snapshot.currentValue)}
                        description="Adjusted EBITDA × Final Multiple"
                      />
                      <DataRow
                        label="Potential Value"
                        value={formatCurrency(snapshot.potentialValue)}
                        description="Adjusted EBITDA × Base Multiple (if BRI were 100)"
                      />
                      <DataRow
                        label="Value Gap"
                        value={formatCurrency(snapshot.valueGap)}
                        description="Potential Value - Current Value"
                      />
                    </div>
                  </div>

                  {/* Raw JSON */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitleLg}>Raw Data</h2>
                      <p className={styles.cardDescription}>Complete snapshot as JSON</p>
                    </div>
                    <div className={styles.cardContent}>
                      <pre className={styles.jsonBlock}>
                        {JSON.stringify(snapshot, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {!selectedCompanyId && (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            Select a company above to view its valuation snapshots.
          </div>
        </div>
      )}
    </div>
  )
}
