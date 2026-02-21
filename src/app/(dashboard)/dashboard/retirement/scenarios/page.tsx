'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/retirement/retirement.module.css'

// TODO: wire to API — /api/companies/[id]/retirement/scenarios

const BASE_ASSUMPTIONS = [
  { label: 'Transaction Costs', value: '7.5', unit: '%' },
  { label: 'Effective Tax Rate', value: '22.0', unit: '%' },
  { label: 'Investment Return', value: '5.5', unit: '%' },
  { label: 'Monthly Spending', value: '$12,500', unit: '' },
  { label: 'Years of Income Needed', value: '40', unit: 'yrs' },
  { label: 'Inflation Rate', value: '3.0', unit: '%' },
]

const SHARED_ASSUMPTIONS = [
  { label: 'Inflation rate', value: '3.0%' },
  { label: 'Social Security (age)', value: '62' },
  { label: 'Social Security benefit', value: '$2,100/mo' },
  { label: 'Life expectancy', value: '88' },
  { label: 'Current age', value: '52' },
  { label: 'Target retirement age', value: '57' },
  { label: 'Existing liquid assets', value: '$380,000' },
  { label: 'Existing 401(k) / IRA', value: '$740,000' },
  { label: 'Monthly retirement goal', value: '$14,000' },
]

export default function ScenarioModelerPage() {
  const [scenarioAPrice, setScenarioAPrice] = useState('$8,200,000')
  const [scenarioBPrice, setScenarioBPrice] = useState('$10,500,000')
  const [scenarioBWait, setScenarioBWait] = useState('18')
  const [scenarioCPrice, setScenarioCPrice] = useState('$7,800,000')
  const [scenarioCCosts, setScenarioCCosts] = useState('6.0')

  return (
    <div>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/retirement">Retirement</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Scenario Modeler</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeaderRow}>
        <div>
          <h1>What-If Scenario Builder</h1>
          <p>Model different exit paths and compare their impact on your retirement income.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Comparison
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save Scenario
          </button>
        </div>
      </div>

      {/* AI Insight */}
      <div className={styles.aiInsightLight}>
        <div className={styles.aiInsightLightIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightLightLabel}>AI Coach Insight</div>
          <div className={styles.aiInsightLightText}>
            Scenario B delivers <strong>29% more net proceeds</strong> by investing 18 months in value improvements. At your current EBITDA growth trajectory, the wait is well justified — you&apos;d need just 14 months to break even on the delay.
          </div>
        </div>
      </div>

      {/* Base Assumptions Card */}
      <div className={styles.baseAssumptionsCard}>
        <div className={styles.baseAssumptionsHeader}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
          <h3>Base Assumptions</h3>
          <span>Shared across all scenarios</span>
        </div>
        <div className={styles.baseAssumptionsGrid}>
          {BASE_ASSUMPTIONS.map((a) => (
            <div key={a.label} className={styles.scenarioInputRow} style={{ marginBottom: 0 }}>
              <div className={styles.inputLabel}>{a.label}</div>
              <div className={styles.inputWithUnit}>
                <input className={styles.inputField} type="text" defaultValue={a.value} style={a.unit ? { paddingRight: a.unit === 'yrs' ? 44 : 28 } : {}} />
                {a.unit && <span className={styles.inputUnit}>{a.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Column Scenario Grid */}
      <div className={styles.scenarioModelerGrid}>

        {/* Scenario A */}
        <div className={styles.scenarioModelerCard}>
          <div className={styles.scenarioModelerHeader}>
            <div className={styles.scenarioModelerLabel}>Scenario A</div>
            <div className={styles.scenarioModelerName}>Sell Now at Current Value</div>
          </div>
          <div className={styles.scenarioKpis}>
            <div className={styles.kpiGrid2}>
              <div><div className={styles.kpiLabel}>Sale Price</div><div className={styles.kpiValue}>$8.2M</div></div>
              <div><div className={styles.kpiLabel}>Net Proceeds</div><div className={styles.kpiValue}>$5.9M</div></div>
              <div><div className={styles.kpiLabel}>Monthly Income</div><div className={styles.kpiValue}>$12,800</div></div>
              <div><div className={styles.kpiLabel}>Runway</div><div className={styles.kpiValue}>38 yrs</div></div>
            </div>
            <div>
              <div className={styles.runwayBar}><div className={styles.runwayFill} style={{ width: '76%', background: '#FF9500' }} /></div>
              <div className={styles.runwayScale}><span>0 years</span><span>50 years</span></div>
            </div>
            <div className={`${styles.goalMet} ${styles.goalMetNo}`}>
              <div className={styles.goalDot} style={{ background: '#FF3B30' }} />
              Retirement goal: Not quite met
            </div>
          </div>
          <div className={styles.scenarioInputs}>
            <div className={styles.scenarioInputsLabel}>Adjust Assumptions</div>
            <div className={styles.scenarioInputRow}>
              <div className={styles.inputLabel}>Sale Price</div>
              <div className={styles.inputWithUnit}>
                <input className={styles.inputField} type="text" value={scenarioAPrice} onChange={(e) => setScenarioAPrice(e.target.value)} />
              </div>
            </div>
            <div className={styles.inputBaseNote}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              Using base assumptions for all other inputs
            </div>
          </div>
        </div>

        {/* Scenario B — Recommended */}
        <div className={`${styles.scenarioModelerCard} ${styles.scenarioModelerCardRecommended}`}>
          <div className={styles.scenarioModelerHeader}>
            <div className={styles.scenarioModelerLabel}>Scenario B</div>
            <div className={styles.scenarioModelerName}>Improve &amp; Sell in 18 Months</div>
            <div><span className={styles.scenarioPriceBadge}>+28% sale price</span></div>
            <div className={styles.recommendedBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Recommended
            </div>
          </div>
          <div className={styles.scenarioKpis}>
            <div className={styles.kpiGrid2}>
              <div><div className={styles.kpiLabel}>Sale Price</div><div className={`${styles.kpiValue} ${styles.kpiValueHighlight}`}>$10.5M</div></div>
              <div><div className={styles.kpiLabel}>Net Proceeds</div><div className={`${styles.kpiValue} ${styles.kpiValueHighlight}`}>$7.6M</div></div>
              <div><div className={styles.kpiLabel}>Monthly Income</div><div className={`${styles.kpiValue} ${styles.kpiValueHighlight}`}>$16,400</div></div>
              <div><div className={styles.kpiLabel}>Runway</div><div className={styles.kpiValue}>47 yrs</div></div>
            </div>
            <div>
              <div className={styles.runwayBar}><div className={styles.runwayFill} style={{ width: '94%', background: '#34C759' }} /></div>
              <div className={styles.runwayScale}><span>0 years</span><span>50 years</span></div>
            </div>
            <div className={`${styles.goalMet} ${styles.goalMetYes}`}>
              <div className={styles.goalDot} style={{ background: '#34C759' }} />
              Retirement goal: Met with buffer
            </div>
          </div>
          <div className={styles.scenarioInputs}>
            <div className={styles.scenarioInputsLabel}>Changes from Base</div>
            <div className={styles.scenarioInputRow}>
              <div className={styles.inputLabel}>Sale Price</div>
              <div className={styles.inputWithUnit}>
                <input className={styles.inputField} type="text" value={scenarioBPrice} onChange={(e) => setScenarioBPrice(e.target.value)} />
              </div>
            </div>
            <div className={styles.scenarioInputRow}>
              <div className={styles.inputLabel}>Wait Period</div>
              <div className={styles.inputWithUnit}>
                <input className={styles.inputField} type="text" value={scenarioBWait} onChange={(e) => setScenarioBWait(e.target.value)} style={{ paddingRight: 44 }} />
                <span className={styles.inputUnit}>mo</span>
              </div>
            </div>
            <div className={styles.inputBaseNote}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              All other inputs from base assumptions
            </div>
          </div>
        </div>

        {/* Scenario C */}
        <div className={styles.scenarioModelerCard}>
          <div className={styles.scenarioModelerHeader}>
            <div className={styles.scenarioModelerLabel}>Scenario C</div>
            <div className={styles.scenarioModelerName}>Sell to ServiceMaster PE (Current LOI)</div>
            <div><span className={`${styles.scenarioPriceBadge} ${styles.scenarioPriceBadgeOrange}`}>-5% costs, PE deal structure</span></div>
          </div>
          <div className={styles.scenarioKpis}>
            <div className={styles.kpiGrid2}>
              <div><div className={styles.kpiLabel}>Sale Price</div><div className={styles.kpiValue}>$7.8M</div></div>
              <div><div className={styles.kpiLabel}>Net Proceeds</div><div className={styles.kpiValue}>$5.6M</div></div>
              <div><div className={styles.kpiLabel}>Monthly Income</div><div className={styles.kpiValue}>$12,100</div></div>
              <div><div className={styles.kpiLabel}>Runway</div><div className={styles.kpiValue}>36 yrs</div></div>
            </div>
            <div>
              <div className={styles.runwayBar}><div className={styles.runwayFill} style={{ width: '72%', background: '#FF9500' }} /></div>
              <div className={styles.runwayScale}><span>0 years</span><span>50 years</span></div>
            </div>
            <div className={`${styles.goalMet} ${styles.goalMetNo}`}>
              <div className={styles.goalDot} style={{ background: '#FF3B30' }} />
              Retirement goal: Below target
            </div>
          </div>
          <div className={styles.scenarioInputs}>
            <div className={styles.scenarioInputsLabel}>Changes from Base</div>
            <div className={styles.scenarioInputRow}>
              <div className={styles.inputLabel}>Sale Price (LOI)</div>
              <div className={styles.inputWithUnit}>
                <input className={styles.inputField} type="text" value={scenarioCPrice} onChange={(e) => setScenarioCPrice(e.target.value)} />
              </div>
            </div>
            <div className={styles.scenarioInputRow}>
              <div className={styles.inputLabel}>Transaction Costs</div>
              <div className={styles.inputWithUnit}>
                <input className={styles.inputField} type="text" value={scenarioCCosts} onChange={(e) => setScenarioCCosts(e.target.value)} style={{ paddingRight: 28 }} />
                <span className={styles.inputUnit}>%</span>
              </div>
            </div>
            <div className={styles.inputBaseNote}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              All other inputs from base assumptions
            </div>
          </div>
        </div>

      </div>

      {/* Comparison Chart */}
      <div className={styles.card} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>Net Proceeds Comparison</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>After transaction costs and taxes</div>
          </div>
        </div>
        <div className={styles.comparisonChartWrap}>
          <div className={styles.chartYAxis}>
            {['$8M', '$6M', '$4M', '$2M', '$0'].map((l) => (
              <div key={l} className={styles.chartYLabel}>{l}</div>
            ))}
          </div>
          <div className={styles.chartArea}>
            <div className={styles.chartGridLine} style={{ top: 0 }} />
            <div className={styles.chartGridLine} style={{ top: '25%' }} />
            <div className={styles.chartGridLine} style={{ top: '50%' }} />
            <div className={styles.chartGridLine} style={{ top: '75%' }} />
            <div className={styles.chartBarsRow}>
              <div className={styles.chartBarGroup}>
                <div className={styles.chartBarVal}>$5.9M</div>
                <div className={styles.chartBar} style={{ height: '73.75%', background: '#6E6E73' }} />
                <div className={styles.chartBarName}>Scenario A</div>
              </div>
              <div className={styles.chartBarGroup}>
                <div className={`${styles.chartBarVal} ${styles.chartBarValAccent}`}>$7.6M</div>
                <div className={styles.chartBar} style={{ height: '95%', background: 'var(--accent)', position: 'relative' }}>
                  <div className={styles.chartBarBestLabel}>BEST</div>
                </div>
                <div className={`${styles.chartBarName} ${styles.chartBarNameAccent}`}>Scenario B</div>
              </div>
              <div className={styles.chartBarGroup}>
                <div className={styles.chartBarVal}>$5.6M</div>
                <div className={styles.chartBar} style={{ height: '70%', background: '#AEAEB2' }} />
                <div className={styles.chartBarName}>Scenario C</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.chartLegend} style={{ marginTop: 4 }}>
          <div className={styles.chartLegendItem}><div className={styles.chartLegendDot} style={{ background: '#6E6E73' }} />Scenario A — Sell Now</div>
          <div className={styles.chartLegendItem}><div className={styles.chartLegendDot} style={{ background: 'var(--accent)' }} />Scenario B — Improve &amp; Sell</div>
          <div className={styles.chartLegendItem}><div className={styles.chartLegendDot} style={{ background: '#AEAEB2' }} />Scenario C — ServiceMaster LOI</div>
        </div>
      </div>

      {/* Shared Assumptions */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Shared Assumptions</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Applied to all scenarios unless overridden</div>
          </div>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>Edit</button>
        </div>
        <div className={styles.assumptionsGrid3}>
          {SHARED_ASSUMPTIONS.map((a) => (
            <div key={a.label} className={styles.assumptionItem3}>
              <span className={styles.assumptionItemLabel}>{a.label}</span>
              <span className={styles.assumptionItemValue}>{a.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Row */}
      <div className={styles.actionRow} style={{ marginTop: 4 }}>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
          </svg>
          Save Scenario Set
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Comparison PDF
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Discuss with AI Coach
        </button>
      </div>
    </div>
  )
}
