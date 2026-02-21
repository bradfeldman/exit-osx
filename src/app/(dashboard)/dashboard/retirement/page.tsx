'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/retirement/retirement.module.css'

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function formatShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

interface DashboardData {
  tier1?: { currentValue: number }
}

interface PersonalFinancials {
  personalFinancials?: {
    currentAge?: number
    retirementAge?: number
    monthlyRetirementSpending?: number
    personalAssets?: Array<{ category: string; description: string; value: number }>
    personalLiabilities?: Array<{ amount: number }>
  }
}

export default function RetirementPage() {
  const { selectedCompanyId } = useCompany()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [pfs, setPfs] = useState<PersonalFinancials | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/dashboard`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/personal-financials`).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([dashData, pfsData]) => {
        if (cancelled) return
        if (dashData) setDashboard(dashData)
        if (pfsData) setPfs(pfsData)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const enterpriseValue = dashboard?.tier1?.currentValue ?? 0
  const pfsData = pfs?.personalFinancials
  const currentAge = pfsData?.currentAge ?? 56
  const retirementAge = pfsData?.retirementAge ?? 62
  const monthlySpend = pfsData?.monthlyRetirementSpending ?? 15000
  const annualSpend = monthlySpend * 12

  // Simple retirement calculation
  const yearsToRetire = Math.max(0, retirementAge - currentAge)
  const planningHorizon = 30
  const inflationRate = 0.03
  const investmentReturn = 0.065
  const taxRate = 0.20
  const brokerFee = 0.05
  const transactionCosts = 0.04

  // Proceeds waterfall
  const brokerAmount = enterpriseValue * brokerFee
  const txnAmount = enterpriseValue * transactionCosts
  const taxAmount = enterpriseValue * taxRate
  const totalLiabilities = pfsData?.personalLiabilities?.reduce((s, l) => s + l.amount, 0) ?? 0
  const netProceeds = enterpriseValue - brokerAmount - txnAmount - taxAmount - totalLiabilities

  // Existing savings
  const existingSavings = pfsData?.personalAssets?.reduce((s, a) => s + a.value, 0) ?? 0

  // Total available
  const totalAvailable = netProceeds + existingSavings

  // Future spending need (inflation-adjusted)
  const futureAnnualSpend = annualSpend * Math.pow(1 + inflationRate, yearsToRetire)
  const totalRetirementNeed = futureAnnualSpend * planningHorizon * 0.65 // Discounted

  // Gap
  const gap = totalRetirementNeed - totalAvailable
  const readinessPct = totalRetirementNeed > 0 ? Math.min(100, Math.round((totalAvailable / totalRetirementNeed) * 100)) : 0

  // Ring calculations
  const ringDasharray = 427
  const ringOffset = ringDasharray - (ringDasharray * (readinessPct / 100))
  const ringColorClass = readinessPct >= 90 ? styles.scoreRingFillGreen : readinessPct >= 60 ? styles.scoreRingFillOrange : styles.scoreRingFillRed

  return (
    <>
      <TrackPageView page="/dashboard/retirement" />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Retirement Readiness</h1>
          <p>Will the sale of your business fund your retirement? Let&apos;s find out.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/coach" className={`${styles.btn} ${styles.btnSecondary}`} style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            Ask AI Coach
          </Link>
          <Link href="/dashboard/financials/retirement" className={`${styles.btn} ${styles.btnPrimary}`} style={{ textDecoration: 'none' }}>
            <EditIcon /> Update Inputs
          </Link>
        </div>
      </div>

      {/* Readiness Hero */}
      <div className={styles.retirementHero}>
        <div className={styles.scoreRing}>
          <svg viewBox="0 0 160 160">
            <circle className={styles.scoreRingTrack} cx="80" cy="80" r="68" />
            <circle className={`${styles.scoreRingFill} ${ringColorClass}`} cx="80" cy="80" r="68" strokeDasharray={ringDasharray} strokeDashoffset={ringOffset} />
          </svg>
          <div className={styles.scoreValue}>
            <div className={styles.scorePct}>{readinessPct}%</div>
            <div className={styles.scoreLabel}>of Goal</div>
          </div>
        </div>
        <div className={styles.heroText}>
          <h2>You&apos;re {readinessPct}% of the way to retirement readiness</h2>
          <p>
            Based on your current valuation, estimated sale proceeds, and retirement income needs
            {gap > 0 && <>, you have a <strong>{formatShort(gap)} gap</strong> to close</>}
            {gap <= 0 && <>, you <strong>exceed your retirement goal</strong></>}.
          </p>
          <div className={styles.heroStats}>
            <div>
              <div className={styles.heroStatVal}>{formatShort(netProceeds)}</div>
              <div className={styles.heroStatLbl}>Net Proceeds</div>
            </div>
            <div>
              <div className={styles.heroStatVal}>{formatShort(totalRetirementNeed)}</div>
              <div className={styles.heroStatLbl}>Target Needed</div>
            </div>
            <div>
              <div className={styles.heroStatVal} style={{ color: gap > 0 ? 'var(--orange)' : 'var(--green)' }}>
                {gap > 0 ? formatShort(gap) : formatShort(Math.abs(gap))}
              </div>
              <div className={styles.heroStatLbl}>{gap > 0 ? 'Gap' : 'Surplus'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Coach Insight */}
      <div className={styles.aiInsight}>
        <div className={styles.aiInsightIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className={styles.aiInsightLabel}>AI Coach Insight</div>
          <div className={styles.aiInsightText}>
            {gap > 0
              ? `Your ${formatShort(gap)} retirement gap can be reduced by improving your business's transferability and reducing owner dependence. These improvements directly increase your valuation multiple without requiring revenue growth.`
              : `Great news — your projected exit proceeds exceed your retirement needs. Consider talking to a wealth advisor about post-exit portfolio allocation and tax-efficient withdrawal strategies.`}
          </div>
        </div>
      </div>

      {/* Proceeds Waterfall */}
      {enterpriseValue > 0 && (
        <div className={styles.waterfallCard}>
          <h3>How We Get to Net Proceeds</h3>
          <div className={styles.waterfall}>
            <WaterfallBar label="Enterprise Value" value={enterpriseValue} maxValue={enterpriseValue} type="total" color="var(--accent)" />
            <WaterfallBar label="Transaction Costs" value={-txnAmount} maxValue={enterpriseValue} type="negative" color="var(--red)" />
            <WaterfallBar label={`Broker Fee (${Math.round(brokerFee * 100)}%)`} value={-brokerAmount} maxValue={enterpriseValue} type="negative" color="var(--red)" />
            <WaterfallBar label={`Est. Taxes (~${Math.round(taxRate * 100)}%)`} value={-taxAmount} maxValue={enterpriseValue} type="negative" color="var(--red)" />
            {totalLiabilities > 0 && (
              <WaterfallBar label="Debt Payoff" value={-totalLiabilities} maxValue={enterpriseValue} type="negative" color="var(--red)" />
            )}
            <WaterfallBar label="Net Proceeds" value={netProceeds} maxValue={enterpriseValue} type="total" color="var(--green)" />
          </div>
        </div>
      )}

      {/* Exit Scenarios */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Exit Scenarios</h3>
        <div className={styles.scenarioCards}>
          <div className={styles.scenarioCard}>
            <div className={styles.scenarioLabel}>Current Value</div>
            <div className={styles.scenarioAmount}>{formatShort(netProceeds)}</div>
            <div className={styles.scenarioDetail}>Net proceeds at {formatShort(enterpriseValue)} valuation</div>
            <div className={`${styles.scenarioStatus} ${gap > 0 ? styles.scenarioGap : styles.scenarioReady}`}>
              {gap > 0 ? `${formatShort(gap)} gap` : 'On track'}
            </div>
          </div>
          <div className={`${styles.scenarioCard} ${styles.scenarioCardSelected}`}>
            <div className={styles.scenarioLabel}>With Improvements</div>
            <div className={styles.scenarioAmount} style={{ color: 'var(--accent)' }}>{formatShort(netProceeds * 1.4)}</div>
            <div className={styles.scenarioDetail}>Net proceeds at {formatShort(enterpriseValue * 1.4)} valuation</div>
            <div className={`${styles.scenarioStatus} ${styles.scenarioReady}`}>
              Potential upside
            </div>
          </div>
          <div className={styles.scenarioCard}>
            <div className={styles.scenarioLabel}>Conservative</div>
            <div className={styles.scenarioAmount}>{formatShort(netProceeds * 0.8)}</div>
            <div className={styles.scenarioDetail}>Net proceeds at {formatShort(enterpriseValue * 0.8)} valuation</div>
            <div className={`${styles.scenarioStatus} ${styles.scenarioGap}`}>
              Downside scenario
            </div>
          </div>
        </div>
      </div>

      {/* Two Column: Income Needs + Assumptions */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Monthly Retirement Income</h3>
          <table className={styles.incomeTable}>
            <thead>
              <tr><th>Category</th><th className={styles.amount}>Monthly</th><th className={styles.amount}>Annual</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Needed</td>
                <td className={styles.amount} style={{ color: 'var(--accent)' }}>{formatCurrency(monthlySpend)}</td>
                <td className={styles.amount} style={{ color: 'var(--accent)' }}>{formatCurrency(annualSpend)}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px' }}>
            <Link href="/dashboard/financials/retirement" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Update spending details</Link> for a more accurate breakdown.
          </p>
        </div>

        <div className={styles.card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Calculator Assumptions</h3>
          <div className={styles.assumptionRow}>
            <span className={styles.assumptionLabel}>Current Age</span>
            <span className={styles.assumptionValue}>{currentAge}</span>
          </div>
          <div className={styles.assumptionRow}>
            <span className={styles.assumptionLabel}>Target Retirement Age</span>
            <span className={styles.assumptionValue}>{retirementAge}</span>
          </div>
          <div className={styles.assumptionRow}>
            <span className={styles.assumptionLabel}>Planning Horizon</span>
            <span className={styles.assumptionValue}>{planningHorizon} years</span>
          </div>
          <div className={styles.assumptionRow}>
            <span className={styles.assumptionLabel}>Inflation Rate</span>
            <span className={styles.assumptionValue}>{(inflationRate * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.assumptionRow}>
            <span className={styles.assumptionLabel}>Investment Return</span>
            <span className={styles.assumptionValue}>{(investmentReturn * 100).toFixed(1)}%</span>
          </div>
          <div className={styles.assumptionRow}>
            <span className={styles.assumptionLabel}>Tax Rate (est.)</span>
            <span className={styles.assumptionValue}>{Math.round(taxRate * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Retirement Timeline</h3>
        <div className={styles.timelineVisual}>
          <div className={styles.timelineTrack}>
            <div className={styles.timelineFill} style={{ width: `${Math.min(100, (1 / Math.max(1, yearsToRetire + 4)) * 100)}%` }} />
            <div className={styles.timelineDot} style={{ left: '0%' }} />
            <div className={styles.timelineDot} style={{ left: `${Math.min(80, (1 / Math.max(1, yearsToRetire + 4)) * 100)}%` }} />
            <div className={`${styles.timelineDot} ${styles.timelineDotGreen}`} style={{ left: `${Math.min(95, ((yearsToRetire) / Math.max(1, yearsToRetire + 4)) * 100)}%` }} />
            <div className={`${styles.timelineDot} ${styles.timelineDotGreen}`} style={{ left: '100%' }} />
          </div>
          <div className={styles.timelineMarkers}>
            <div className={styles.timelineMarker}>
              <div className={styles.timelineMarkerYr}>{new Date().getFullYear()}</div>
              <div className={styles.timelineMarkerDesc}>Now (Age {currentAge})</div>
            </div>
            <div className={styles.timelineMarker}>
              <div className={styles.timelineMarkerYr}>{new Date().getFullYear() + 1}</div>
              <div className={styles.timelineMarkerDesc}>Target Exit</div>
            </div>
            <div className={styles.timelineMarker}>
              <div className={styles.timelineMarkerYr}>{new Date().getFullYear() + yearsToRetire}</div>
              <div className={styles.timelineMarkerDesc}>Retire (Age {retirementAge})</div>
            </div>
            <div className={styles.timelineMarker}>
              <div className={styles.timelineMarkerYr}>{new Date().getFullYear() + yearsToRetire + 7}</div>
              <div className={styles.timelineMarkerDesc}>Social Security</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function WaterfallBar({ label, value, maxValue, type, color }: {
  label: string; value: number; maxValue: number; type: 'positive' | 'negative' | 'total'; color: string
}) {
  const absValue = Math.abs(value)
  const heightPct = maxValue > 0 ? (absValue / maxValue) * 180 : 0

  return (
    <div className={styles.waterfallItem}>
      <div className={styles.waterfallBarWrap}>
        <div
          className={styles.waterfallBar}
          style={{ height: `${Math.max(4, heightPct)}px`, background: color }}
        >
          <div className={styles.waterfallBarVal} style={{ color }}>
            {value < 0 ? '-' : ''}{formatShort(absValue)}
          </div>
        </div>
      </div>
      <div className={styles.waterfallLabel} dangerouslySetInnerHTML={{ __html: label.replace(' ', '<br>') }} />
    </div>
  )
}

function formatShortLocal(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
