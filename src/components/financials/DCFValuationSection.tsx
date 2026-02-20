'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Settings, TrendingUp, AlertCircle } from 'lucide-react'
import { WACCModal } from './WACCModal'
import styles from '@/components/valuation/valuation-pages.module.css'

interface DCFData {
  wacc: number | null
  enterpriseValue: number | null
  equityValue: number | null
  projections: Array<{
    year: number
    fcf: number
    discountFactor: number
    presentValue: number
  }>
  terminalValuePV: number | null
}

interface DCFValuationSectionProps {
  companyId: string
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(2)}%`
}

export function DCFValuationSection({ companyId }: DCFValuationSectionProps) {
  const [dcfData, setDcfData] = useState<DCFData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWACCModal, setShowWACCModal] = useState(false)
  const [hasAssumptions, setHasAssumptions] = useState(false)

  const fetchDCFData = useCallback(async () => {
    if (!companyId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}/dcf`)
      if (response.ok) {
        const data = await response.json()
        if (data.assumptions) {
          setHasAssumptions(true)
          setDcfData({
            wacc: data.assumptions.calculatedWACC ? Number(data.assumptions.calculatedWACC) : null,
            enterpriseValue: data.assumptions.enterpriseValue ? Number(data.assumptions.enterpriseValue) : null,
            equityValue: data.assumptions.equityValue ? Number(data.assumptions.equityValue) : null,
            projections: data.projections || [],
            terminalValuePV: data.terminalValuePV || null,
          })
        } else {
          setHasAssumptions(false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch DCF data:', error)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchDCFData()
  }, [fetchDCFData])

  const handleWACCSaved = () => {
    fetchDCFData()
  }

  if (loading) {
    return (
      <div className={styles.dcfValLoadCard}>
        <div className={styles.dcfValLoadCardSpinner} />
      </div>
    )
  }

  // No DCF assumptions configured yet
  if (!hasAssumptions) {
    return (
      <>
        <div className={styles.dcfValSectionCard}>
          <div className={styles.dcfValSectionHeader}>
            <div>
              <div className={styles.dcfValSectionTitleRow}>
                <TrendingUp />
                DCF Valuation
              </div>
              <p className={styles.dcfValSectionDesc}>
                Discounted Cash Flow analysis for your company
              </p>
            </div>
          </div>

          <div className={styles.dcfValConfigureState}>
            <div className={styles.dcfValConfigureIcon}>
              <AlertCircle />
            </div>
            <p className={styles.dcfValConfigureTitle}>Configure WACC Variables</p>
            <p className={styles.dcfValConfigureDesc}>
              Set up your Weighted Average Cost of Capital (WACC) assumptions to calculate DCF valuation.
            </p>
            <Button onClick={() => setShowWACCModal(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Configure WACC
            </Button>
          </div>
        </div>

        <WACCModal
          open={showWACCModal}
          onClose={() => setShowWACCModal(false)}
          companyId={companyId}
          onSaved={handleWACCSaved}
        />
      </>
    )
  }

  return (
    <>
      <div className={styles.dcfValSectionCard}>
        <div className={styles.dcfValSectionHeader}>
          <div>
            <div className={styles.dcfValSectionTitleRow}>
              <TrendingUp />
              DCF Valuation
            </div>
            <p className={styles.dcfValSectionDesc}>
              Discounted Cash Flow analysis based on your WACC assumptions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowWACCModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Edit WACC
          </Button>
        </div>

        <div className={styles.dcfValSectionContent}>
          {/* Summary metric tiles */}
          <div className={styles.dcfValMetricGrid}>
            <div className={`${styles.dcfValMetric} ${styles.blue}`}>
              <p className={styles.dcfValMetricLabel}>Enterprise Value</p>
              <p className={styles.dcfValMetricValue}>
                {formatCurrency(dcfData?.enterpriseValue)}
              </p>
            </div>
            <div className={`${styles.dcfValMetric} ${styles.green}`}>
              <p className={styles.dcfValMetricLabel}>Equity Value</p>
              <p className={styles.dcfValMetricValue}>
                {formatCurrency(dcfData?.equityValue)}
              </p>
            </div>
            <div className={styles.dcfValMetric}>
              <p className={styles.dcfValMetricLabel}>WACC</p>
              <p className={styles.dcfValMetricValue}>
                {formatPercent(dcfData?.wacc)}
              </p>
            </div>
          </div>

          {/* Discounted Cash Flow Table */}
          {dcfData?.projections && dcfData.projections.length > 0 && (
            <div>
              <p className={styles.dcfValTableTitle}>Discounted Cash Flows</p>
              <div className={styles.dcfValTableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-right">FCF</TableHead>
                      <TableHead className="text-right">Discount Factor</TableHead>
                      <TableHead className="text-right">Present Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dcfData.projections.map((row) => (
                      <TableRow key={row.year}>
                        <TableCell className="font-medium">Year {row.year}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.fcf)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.discountFactor.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.presentValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {dcfData.terminalValuePV && (
                      <TableRow>
                        <TableCell colSpan={3} className="font-medium">Terminal Value (PV)</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(dcfData.terminalValuePV)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      <WACCModal
        open={showWACCModal}
        onClose={() => setShowWACCModal(false)}
        companyId={companyId}
        onSaved={handleWACCSaved}
      />
    </>
  )
}
