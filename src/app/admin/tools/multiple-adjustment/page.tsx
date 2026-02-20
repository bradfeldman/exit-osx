'use client'

import { useEffect, useState } from 'react'
import styles from '@/components/admin/admin-tools.module.css'

interface Company {
  id: string
  name: string
}

interface SnapshotData {
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number
  briScore: number
  alphaConstant: number
  baseMultiple: number
  discountFraction: number
  finalMultiple: number
  currentValue: number
  potentialValue: number
  adjustedEbitda: number
}

export default function AdminMultipleAdjustmentPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      loadSnapshot()
    } else {
      setSnapshot(null)
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

  async function loadSnapshot() {
    if (!selectedCompanyId) return

    setLoadingSnapshot(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/latest-snapshot`)
      if (response.ok) {
        const data = await response.json()
        setSnapshot(data.snapshot)
      } else {
        setSnapshot(null)
      }
    } catch (error) {
      console.error('Failed to load snapshot:', error)
      setSnapshot(null)
    } finally {
      setLoadingSnapshot(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Multiple Adjustment Formula</h1>
        <p className={styles.pageDescription}>
          Technical documentation for the EBITDA multiple calculation methodology
        </p>
      </div>

      {/* Company Selector */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Select Company</h2>
          <p className={styles.cardDescription}>
            Choose a company to view its current valuation calculations
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

      {/* Formula Overview */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitleLg}>Valuation Formula</h2>
          <p className={styles.cardDescription}>
            Three-step process to calculate the applied EBITDA multiple
          </p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.spacer4}>
            {/* Step 1 */}
            <div className={styles.formulaStep}>
              <h3 className={styles.formulaStepTitle}>Step 1: Base Multiple (Core Score Positioning)</h3>
              <div className={styles.formulaDisplay}>
                BaseMultiple = L + (CS / 100) × (H - L)
              </div>
              <p className={styles.formulaNote}>
                Core Score positions the company within the industry multiple range. A higher Core Score
                places the base multiple closer to the industry ceiling.
              </p>
            </div>

            {/* Step 2 */}
            <div className={styles.formulaStep}>
              <h3 className={styles.formulaStepTitle}>Step 2: Discount Fraction (BRI Impact)</h3>
              <div className={styles.formulaDisplay}>
                DiscountFraction = (1 - BRI / 100)<sup>α</sup>
              </div>
              <p className={styles.formulaNote}>
                Non-linear discount based on Buyer Readiness Index. The alpha exponent (α = 1.4) creates
                buyer skepticism curve where lower BRI scores receive disproportionately higher discounts.
              </p>
            </div>

            {/* Step 3 */}
            <div className={styles.formulaStep}>
              <h3 className={styles.formulaStepTitle}>Step 3: Final Multiple (Floor Guarantee)</h3>
              <div className={styles.formulaDisplay}>
                FinalMultiple = L + (BaseMultiple - L) × (1 - DiscountFraction)
              </div>
              <p className={styles.formulaNote}>
                Final multiple applies the BRI discount while guaranteeing the industry floor (L) as the minimum.
                This ensures no company falls below the industry baseline regardless of BRI score.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Variable Definitions */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitleLg}>Variable Definitions</h2>
          <p className={styles.cardDescription}>
            Input parameters for the multiple calculation
          </p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Name</th>
                  <th>Range</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tdMono}>L</td>
                  <td>Industry Multiple Low</td>
                  <td>Varies by industry</td>
                  <td className={styles.tdMuted}>Floor multiple for the industry classification</td>
                </tr>
                <tr>
                  <td className={styles.tdMono}>H</td>
                  <td>Industry Multiple High</td>
                  <td>Varies by industry</td>
                  <td className={styles.tdMuted}>Ceiling multiple for the industry classification</td>
                </tr>
                <tr>
                  <td className={styles.tdMono}>CS</td>
                  <td>Core Score</td>
                  <td>0 - 100</td>
                  <td className={styles.tdMuted}>
                    Structural business factors: revenue size, revenue model, gross margin,
                    labor intensity, asset intensity, owner involvement
                  </td>
                </tr>
                <tr>
                  <td className={styles.tdMono}>BRI</td>
                  <td>Buyer Readiness Index</td>
                  <td>0 - 100</td>
                  <td className={styles.tdMuted}>
                    Weighted score across 6 categories: Financial (25%), Transferability (20%),
                    Operational (20%), Market (15%), Legal/Tax (10%), Personal (10%)
                  </td>
                </tr>
                <tr>
                  <td className={styles.tdMono}>α</td>
                  <td>Alpha (Skepticism Exponent)</td>
                  <td>1.3 - 1.6</td>
                  <td className={styles.tdMuted}>
                    Controls buyer skepticism curve. Higher values = more skeptical buyers.
                    Default: 1.4
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Current Values */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitleLg}>Current Values</h2>
          <p className={styles.cardDescription}>
            {snapshot ? 'Live data from latest valuation snapshot' : 'Select a company to view current values'}
          </p>
        </div>
        <div className={styles.cardContent}>
          {loadingSnapshot ? (
            <div className={styles.loadingCenter}>
              <div className={styles.spinnerLg} />
            </div>
          ) : snapshot ? (
            <div className={styles.spacer4}>
              {/* Input Variables */}
              <div>
                <h4 className={styles.sectionSubheader}>Input Variables</h4>
                <div className={styles.metricGrid5}>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>L (Low)</p>
                    <p className={styles.metricValue}>{snapshot.industryMultipleLow.toFixed(1)}x</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>H (High)</p>
                    <p className={styles.metricValue}>{snapshot.industryMultipleHigh.toFixed(1)}x</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>CS (Core Score)</p>
                    <p className={styles.metricValue}>{Math.round(snapshot.coreScore * 100)}</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>BRI</p>
                    <p className={styles.metricValue}>{Math.round(snapshot.briScore * 100)}</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>α (Alpha)</p>
                    <p className={styles.metricValue}>{snapshot.alphaConstant}</p>
                  </div>
                </div>
              </div>

              {/* Calculated Values */}
              <div>
                <h4 className={styles.sectionSubheader}>Calculated Values</h4>
                <div className={styles.metricGrid3}>
                  <div className={styles.metricCardBlue}>
                    <p className={styles.metricLabelBlue}>Base Multiple</p>
                    <p className={styles.metricValueBlue}>{snapshot.baseMultiple.toFixed(2)}x</p>
                  </div>
                  <div className={styles.metricCardOrange}>
                    <p className={styles.metricLabelOrange}>Discount Fraction</p>
                    <p className={styles.metricValueOrange}>{(snapshot.discountFraction * 100).toFixed(1)}%</p>
                  </div>
                  <div className={styles.metricCardGreen}>
                    <p className={styles.metricLabelGreen}>Final Multiple</p>
                    <p className={styles.metricValueGreen}>{snapshot.finalMultiple.toFixed(2)}x</p>
                  </div>
                </div>
              </div>

              {/* Valuation Results */}
              <div>
                <h4 className={styles.sectionSubheader}>Valuation Results</h4>
                <div className={styles.metricGrid3}>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>Adjusted EBITDA</p>
                    <p className={styles.metricValue}>${(snapshot.adjustedEbitda / 1000).toFixed(0)}K</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>Current Value</p>
                    <p className={styles.metricValue}>${(snapshot.currentValue / 1000000).toFixed(2)}M</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>Potential Value</p>
                    <p className={styles.metricValue}>${(snapshot.potentialValue / 1000000).toFixed(2)}M</p>
                  </div>
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className={styles.calcBreakdown}>
                <p className={styles.calcComment}>{'// Step-by-step calculation:'}</p>
                <p className={styles.calcLine}>
                  BaseMultiple = {snapshot.industryMultipleLow.toFixed(1)} + ({Math.round(snapshot.coreScore * 100)} / 100) × ({snapshot.industryMultipleHigh.toFixed(1)} - {snapshot.industryMultipleLow.toFixed(1)}) = <span className={styles.calcValueBlue}>{snapshot.baseMultiple.toFixed(2)}x</span>
                </p>
                <p className={styles.calcLineMt}>
                  DiscountFraction = (1 - {Math.round(snapshot.briScore * 100)} / 100)^{snapshot.alphaConstant} = <span className={styles.calcValueOrange}>{(snapshot.discountFraction * 100).toFixed(1)}%</span>
                </p>
                <p className={styles.calcLineMt}>
                  FinalMultiple = {snapshot.industryMultipleLow.toFixed(1)} + ({snapshot.baseMultiple.toFixed(2)} - {snapshot.industryMultipleLow.toFixed(1)}) × (1 - {snapshot.discountFraction.toFixed(3)}) = <span className={styles.calcValueGreen}>{snapshot.finalMultiple.toFixed(2)}x</span>
                </p>
                <p className={styles.calcLineMtLg + ' ' + styles.calcComment}>{'// Final valuation:'}</p>
                <p className={styles.calcLine}>
                  CurrentValue = ${(snapshot.adjustedEbitda / 1000).toFixed(0)}K × {snapshot.finalMultiple.toFixed(2)}x = <span className={styles.calcValueBold}>${(snapshot.currentValue / 1000000).toFixed(2)}M</span>
                </p>
              </div>
            </div>
          ) : (
            <p className={styles.emptyStateText}>
              {selectedCompanyId ? 'No assessment completed yet for this company.' : 'Select a company to view valuation data.'}
            </p>
          )}
        </div>
      </div>

      {/* Alpha Sensitivity */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitleLg}>Alpha Sensitivity Reference</h2>
          <p className={styles.cardDescription}>
            How different alpha values affect the discount at various BRI levels
          </p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Buyer Readiness</th>
                  <th className={styles.thCenter}>α = 1.3</th>
                  <th className={styles.thCenter}>α = 1.4 (default)</th>
                  <th className={styles.thCenter}>α = 1.5</th>
                  <th className={styles.thCenter}>α = 1.6</th>
                </tr>
              </thead>
              <tbody>
                {[90, 80, 70, 60, 50, 40, 30, 20].map(bri => (
                  <tr key={bri}>
                    <td style={{ fontWeight: 600 }}>{bri}</td>
                    <td className={styles.tdCenter}>{(Math.pow(1 - bri/100, 1.3) * 100).toFixed(1)}%</td>
                    <td className={styles.tdHighlight}>{(Math.pow(1 - bri/100, 1.4) * 100).toFixed(1)}%</td>
                    <td className={styles.tdCenter}>{(Math.pow(1 - bri/100, 1.5) * 100).toFixed(1)}%</td>
                    <td className={styles.tdCenter}>{(Math.pow(1 - bri/100, 1.6) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableNote}>
            Discount percentages shown represent how much of the range above the floor is removed.
            Lower BRI scores result in higher discounts, with the effect amplified by higher alpha values.
          </p>
        </div>
      </div>
    </div>
  )
}
