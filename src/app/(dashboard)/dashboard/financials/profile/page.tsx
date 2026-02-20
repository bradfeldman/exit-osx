'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { PeriodSelector, FinancialPeriod } from '@/components/financials'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Droplets,
  Scale,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import styles from '@/components/financials/financials-pages.module.css'

interface FinancialMetric {
  label: string
  value: number | null
  unit: 'percent' | 'ratio' | 'days' | 'times'
  benchmark?: { low: number; high: number }
  description: string
  trend?: number // YoY change
}

interface MetricCategory {
  name: string
  icon: React.ReactNode
  colorKey: 'profitability' | 'liquidity' | 'leverage' | 'efficiency'
  metrics: FinancialMetric[]
}

function getHealthStatus(
  value: number | null,
  benchmark?: { low: number; high: number }
): 'good' | 'warning' | 'poor' | 'unknown' {
  if (value === null || !benchmark) return 'unknown'
  if (value >= benchmark.high) return 'good'
  if (value >= benchmark.low) return 'warning'
  return 'poor'
}

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return '-'
  switch (unit) {
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'ratio':
      return value.toFixed(2)
    case 'days':
      return `${Math.round(value)} days`
    case 'times':
      return `${value.toFixed(1)}x`
    default:
      return value.toString()
  }
}

function MetricCard({ metric }: { metric: FinancialMetric }) {
  const status = getHealthStatus(metric.value, metric.benchmark)

  const statusClass = {
    good: styles.profileMetricStatusGood,
    warning: styles.profileMetricStatusWarning,
    poor: styles.profileMetricStatusPoor,
    unknown: styles.profileMetricStatusUnknown,
  }[status]

  const statusIcon = {
    good: <CheckCircle2 />,
    warning: <AlertTriangle />,
    poor: <AlertTriangle />,
    unknown: <Info />,
  }[status]

  return (
    <div className={styles.profileMetricCard}>
      <div className={styles.profileMetricTop}>
        <span className={styles.profileMetricLabel}>{metric.label}</span>
        <div className={`${styles.profileMetricStatus} ${statusClass}`}>
          {statusIcon}
        </div>
      </div>
      <div className={styles.profileMetricBottom}>
        <span className={styles.profileMetricValue}>
          {formatMetricValue(metric.value, metric.unit)}
        </span>
        {metric.trend !== undefined && metric.trend !== 0 && (
          <div className={`${styles.profileMetricTrend} ${metric.trend > 0 ? styles.profileMetricTrendUp : styles.profileMetricTrendDown}`}>
            {metric.trend > 0 ? <TrendingUp /> : <TrendingDown />}
            <span>{metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <p className={styles.profileMetricDesc}>{metric.description}</p>
      {metric.benchmark && (
        <div className={styles.profileMetricBenchmark}>
          Target: {formatMetricValue(metric.benchmark.low, metric.unit)} -{' '}
          {formatMetricValue(metric.benchmark.high, metric.unit)}
        </div>
      )}
    </div>
  )
}

function getHealthGradientClass(score: number | null): string {
  if (score === null) return styles.profileHealthGradientUnknown
  if (score >= 80) return styles.profileHealthGradientGood
  if (score >= 60) return styles.profileHealthGradientOk
  return styles.profileHealthGradientPoor
}

function HealthScoreCard({ score, label }: { score: number | null; label: string }) {
  return (
    <div className={styles.profileHealthCard}>
      <div className={`${styles.profileHealthGradient} ${getHealthGradientClass(score)}`}>
        <div className={styles.profileHealthText}>
          <p className={styles.profileHealthLabel}>{label}</p>
          <p className={styles.profileHealthScore}>
            {score !== null ? `${Math.round(score)}` : '-'}
          </p>
          <p className={styles.profileHealthSub}>out of 100</p>
        </div>
        <div className={styles.profileHealthIcon}>
          <Activity />
        </div>
      </div>
    </div>
  )
}

const categoryIconClass: Record<MetricCategory['colorKey'], string> = {
  profitability: styles.profileCategoryIconProfitability,
  liquidity: styles.profileCategoryIconLiquidity,
  leverage: styles.profileCategoryIconLeverage,
  efficiency: styles.profileCategoryIconEfficiency,
}

export default function FinancialProfilePage() {
  const { selectedCompanyId } = useCompany()
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [profileData, setProfileData] = useState<{
    healthScore: number | null
    categories: MetricCategory[]
  } | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-profile?periodId=${selectedPeriod.id}`
      )
      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
      } else {
        setProfileData({
          healthScore: null,
          categories: getDefaultCategories(),
        })
      }
    } catch (error) {
      console.error('Failed to fetch financial profile:', error)
      setProfileData({
        healthScore: null,
        categories: getDefaultCategories(),
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, selectedPeriod])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  function getDefaultCategories(): MetricCategory[] {
    return [
      {
        name: 'Profitability',
        icon: <TrendingUp />,
        colorKey: 'profitability',
        metrics: [
          { label: 'Gross Margin', value: null, unit: 'percent', benchmark: { low: 30, high: 50 }, description: 'Revenue retained after direct costs' },
          { label: 'EBITDA Margin', value: null, unit: 'percent', benchmark: { low: 10, high: 25 }, description: 'Operating profitability before D&A' },
          { label: 'Net Margin', value: null, unit: 'percent', benchmark: { low: 5, high: 15 }, description: 'Bottom-line profitability' },
        ],
      },
      {
        name: 'Liquidity',
        icon: <Droplets />,
        colorKey: 'liquidity',
        metrics: [
          { label: 'Current Ratio', value: null, unit: 'ratio', benchmark: { low: 1.2, high: 2.0 }, description: 'Ability to pay short-term obligations' },
          { label: 'Quick Ratio', value: null, unit: 'ratio', benchmark: { low: 0.8, high: 1.5 }, description: 'Liquid assets vs current liabilities' },
          { label: 'Cash Ratio', value: null, unit: 'ratio', benchmark: { low: 0.2, high: 0.5 }, description: 'Cash-only coverage of liabilities' },
        ],
      },
      {
        name: 'Leverage',
        icon: <Scale />,
        colorKey: 'leverage',
        metrics: [
          { label: 'Debt-to-Equity', value: null, unit: 'ratio', benchmark: { low: 0, high: 1.5 }, description: 'Total debt relative to equity' },
          { label: 'Interest Coverage', value: null, unit: 'times', benchmark: { low: 3, high: 10 }, description: 'Ability to service debt interest' },
          { label: 'Debt-to-EBITDA', value: null, unit: 'times', benchmark: { low: 0, high: 3 }, description: 'Debt relative to cash flow' },
        ],
      },
      {
        name: 'Efficiency',
        icon: <Zap />,
        colorKey: 'efficiency',
        metrics: [
          { label: 'DSO', value: null, unit: 'days', benchmark: { low: 30, high: 45 }, description: 'Days to collect receivables' },
          { label: 'DPO', value: null, unit: 'days', benchmark: { low: 30, high: 60 }, description: 'Days to pay suppliers' },
          { label: 'Asset Turnover', value: null, unit: 'times', benchmark: { low: 0.5, high: 2.0 }, description: 'Revenue per dollar of assets' },
        ],
      },
    ]
  }

  if (!selectedCompanyId) {
    return (
      <div className={styles.profilePageEmpty}>
        <div className={styles.pageHeader}>
          <div>
            <h1>Financial Profile</h1>
            <p>Select a company to view financial health metrics</p>
          </div>
        </div>
        <div className={styles.dcfEmptyCard}>
          <p>No company selected. Please select a company from the dropdown above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.profilePage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Financial Profile</h1>
          <p>Comprehensive view of financial health metrics and trends</p>
        </div>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        companyId={selectedCompanyId}
        selectedPeriodId={selectedPeriod?.id || null}
        onPeriodChange={setSelectedPeriod}
      />

      {isLoading ? (
        <div className={styles.profileLoading}>
          <div className={styles.profileLoadingSpinner} />
        </div>
      ) : !selectedPeriod ? (
        <div className={styles.profileEmptyPeriod}>
          <Activity className={styles.profileEmptyIcon} />
          <p className={styles.profileEmptyTitle}>Select a Fiscal Year</p>
          <p className={styles.profileEmptyDesc}>
            Choose a fiscal year above to view your financial profile
          </p>
        </div>
      ) : (
        <div className={styles.profileContent}>
          {/* Health Score */}
          <HealthScoreCard
            score={profileData?.healthScore ?? null}
            label="Financial Health Score"
          />

          {/* Info Banner — shown when no data yet */}
          {profileData?.healthScore === null && (
            <div className={styles.profileInfoBanner}>
              <Info />
              <p>
                Enter financial data in the <strong>Statements</strong> page to see your
                financial profile metrics.
              </p>
            </div>
          )}

          {/* Metric Categories */}
          {(profileData?.categories || getDefaultCategories()).map((category) => (
            <div key={category.name} className={styles.profileCategoryCard}>
              <div className={styles.profileCategoryHeader}>
                <div className={`${styles.profileCategoryIcon} ${categoryIconClass[category.colorKey]}`}>
                  {category.icon}
                </div>
                <span>{category.name}</span>
              </div>
              <div className={styles.profileMetricGrid}>
                {category.metrics.map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
