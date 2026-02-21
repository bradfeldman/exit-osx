'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/reports/reports.module.css'

// ── Static Demo Data ─────────────────────────────────────────────────────────
// TODO: wire to API

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb']

const HERO_STATS = [
  { label: 'Business Readiness', old: '67', new: '71', delta: '+4 points', hasOld: true },
  { label: 'Valuation', old: '$7.8M', new: '$8.2M', delta: '+$400K', hasOld: true },
  { label: 'Tasks Completed', old: null, new: '5', delta: 'Across 2 playbooks', hasOld: false },
  { label: 'Retirement Funded', old: '68%', new: '72%', delta: '+4% closer', hasOld: true },
]

const TIMELINE_EVENTS = [
  {
    state: 'positive',
    date: 'January 5',
    title: 'Completed SOP documentation playbook phase',
    desc: '14 standard operating procedures documented for service dispatch, billing, and field operations.',
    impactType: 'bri',
    impact: 'BRI +2',
  },
  {
    state: 'positive',
    date: 'January 12',
    title: 'Uploaded Q3 financial statements',
    desc: 'QuickBooks sync brought financials from 9 months stale to 3 months stale. Valuation recalculated.',
    impactType: 'value',
    impact: 'Valuation +$180K',
  },
  {
    state: 'positive',
    date: 'January 18',
    title: 'Completed owner function documentation',
    desc: 'Mapped all 23 functions currently performed by Mike Reynolds. 8 identified for immediate delegation.',
    impactType: 'bri',
    impact: 'BRI +1.5',
  },
  {
    state: 'neutral',
    date: 'January 25',
    title: 'Revenue signal: 12% YoY growth detected',
    desc: 'Consistent growth trend automatically expanded your industry multiple from 3.9x to 4.1x.',
    impactType: 'multiple',
    impact: 'Multiple +0.2x',
  },
]

const CHART_BARS = [
  { month: 'Aug', height: 55, score: 55, isCurrent: false },
  { month: 'Sep', height: 58, score: 58, isCurrent: false },
  { month: 'Oct', height: 62, score: 62, isCurrent: false },
  { month: 'Nov', height: 65, score: 65, isCurrent: false },
  { month: 'Dec', height: 67, score: 67, isCurrent: false },
  { month: 'Jan', height: 71, score: 71, isCurrent: true },
]

const NEXT_PRIORITIES = [
  {
    num: 1,
    numColor: 'red',
    title: 'Hire or promote an operations manager',
    sub: 'Owner Dependence Playbook \u00b7 Phase 2',
    impact: '+$800K potential',
    impactColor: 'green',
  },
  {
    num: 2,
    numColor: 'orange',
    title: 'Complete customer relationship mapping',
    sub: 'Owner Dependence Playbook \u00b7 Phase 1',
    impact: '+$200K potential',
    impactColor: 'green',
  },
  {
    num: 3,
    numColor: 'accent',
    title: 'Upload Q4 2025 financial statements',
    sub: 'Keeps valuation current for buyer conversations',
    impact: 'Data freshness',
    impactColor: 'accent',
  },
]

// ── Page Component ────────────────────────────────────────────────────────────

export default function ProgressReportPage() {
  const [activeMonth, setActiveMonth] = useState(2) // 'Jan' index

  return (
    <>
      <TrackPageView page="reports_progress" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/reports">Reports</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Your Progress Report</span>
      </div>

      {/* Page Header */}
      <div className={styles.reportPageHeader}>
        <div>
          <h1>Your Progress Report</h1>
          <p>See how far you&rsquo;ve come</p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            Email to Advisor
          </button>
        </div>
      </div>

      {/* Month Tabs */}
      <div className={styles.monthTabs}>
        {MONTHS.map((m, i) => (
          <button
            key={m}
            className={`${styles.monthTab} ${i === activeMonth ? styles.monthTabActive : ''}`}
            onClick={() => setActiveMonth(i)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Hero Summary */}
      <div className={styles.progressHero}>
        <div className={styles.heroTagline}>In January, you moved the needle.</div>
        <div className={styles.heroStats}>
          {HERO_STATS.map((s) => (
            <div key={s.label} className={styles.heroStat}>
              <div className={styles.heroStatLabel}>{s.label}</div>
              {s.hasOld ? (
                <div className={styles.heroStatRow}>
                  <span className={styles.heroStatOld}>{s.old}</span>
                  <span className={styles.heroStatArrow}>&#8594;</span>
                  <span className={styles.heroStatNew}>{s.new}</span>
                </div>
              ) : (
                <div className={styles.heroStatNew} style={{ fontSize: '28px' }}>{s.new}</div>
              )}
              <div className={styles.heroStatDelta}>{s.delta}</div>
            </div>
          ))}
        </div>
        <div className={styles.heroBenchmark}>
          You&rsquo;re in the <strong>top 25%</strong> of Exit OS users for monthly progress.
        </div>
      </div>

      {/* What Moved the Needle */}
      <div className={styles.progressCard}>
        <div className={styles.progressCardTitle}>What Moved the Needle</div>
        <div className={styles.progressTimeline}>
          {TIMELINE_EVENTS.map((ev, i) => (
            <div key={i} className={styles.progressTimelineItem}>
              <div className={`${styles.progressTimelineDot} ${ev.state === 'positive' ? styles.progressTimelineDotPositive : ev.state === 'neutral' ? styles.progressTimelineDotNeutral : styles.progressTimelineDotNegative}`}>
                {ev.state === 'positive' ? (
                  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                    <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="white" strokeWidth="3" />
                    <polyline points="17 6 23 6 23 12" stroke="white" strokeWidth="3" />
                  </svg>
                )}
              </div>
              <div className={styles.progressTimelineDate}>{ev.date}</div>
              <div className={styles.progressTimelineTitle}>{ev.title}</div>
              <div className={styles.progressTimelineDesc}>{ev.desc}</div>
              <span className={`${styles.progressTimelineImpact} ${ev.impactType === 'bri' ? styles.impactBri : ev.impactType === 'value' ? styles.impactValue : styles.impactMultiple}`}>
                {ev.impact}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BRI Trajectory Chart */}
      <div className={styles.progressCard}>
        <div className={styles.progressCardTitle}>BRI Score Trajectory</div>
        <div className={styles.progressCardSubtitle}>6-month trend &mdash; you&rsquo;ve gained 16 points since August</div>
        <div className={styles.chartContainer}>
          {CHART_BARS.map((bar) => (
            <div key={bar.month} className={styles.chartBarWrap}>
              <div
                className={styles.chartBar}
                style={{
                  height: `${bar.height}%`,
                  background: bar.isCurrent ? 'var(--accent)' : 'var(--accent-light)',
                }}
              >
                <div
                  className={styles.chartBarValue}
                  style={{ color: bar.isCurrent ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {bar.score}
                </div>
              </div>
              <div
                className={styles.chartLabel}
                style={bar.isCurrent ? { fontWeight: 700, color: 'var(--accent)' } : undefined}
              >
                {bar.month}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
          At this rate, you&rsquo;ll reach a BRI of <strong style={{ color: 'var(--accent)' }}>80+</strong> by April 2026
        </div>
      </div>

      {/* Consequence Chain */}
      <div className={styles.consequenceChain}>
        <div className={styles.chainHeading}>What Your January Progress Means for Your Exit</div>
        <div className={styles.chain}>
          <span className={styles.chainStep}>BRI +4</span>
          <span className={styles.chainArrow}>&#8594;</span>
          <span className={styles.chainStep}>Multiple: 4.0x &#8594; 4.1x</span>
          <span className={styles.chainArrow}>&#8594;</span>
          <span className={styles.chainStep}>Valuation: +$400K</span>
          <span className={styles.chainArrow}>&#8594;</span>
          <span className={styles.chainStep}>After-tax: +$290K</span>
          <span className={styles.chainArrow}>&#8594;</span>
          <span className={styles.chainFinal}>Retirement: 68% &#8594; 72%</span>
        </div>
        <div className={styles.chainFootnote}>You moved $290K closer to your retirement goal this month.</div>
      </div>

      {/* AI Coach Monthly Summary */}
      <div className={styles.aiCoachSummary}>
        <div className={styles.aiCoachIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div>
          <div className={styles.aiCoachSummaryTitle}>AI Coach Monthly Summary</div>
          <div className={styles.aiCoachSummaryText}>
            Your biggest win this month was documenting SOPs &mdash; buyers specifically ask for these during due
            diligence, and having 14 already written puts you ahead of 80% of sellers. Your biggest remaining gap is{' '}
            <strong>owner dependence (42/100)</strong>. Focusing here next month could add $600K&ndash;$900K to your
            exit value. That&rsquo;s the single highest-ROI action available to you right now.
          </div>
        </div>
      </div>

      {/* Recommended Priorities for Next Month */}
      <div className={styles.progressCard}>
        <div className={styles.progressCardTitle}>Recommended Priorities for February</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {NEXT_PRIORITIES.map((p) => (
            <div key={p.num} className={styles.priorityItem}>
              <div className={`${styles.priorityNum} ${p.numColor === 'red' ? styles.priorityNumRed : p.numColor === 'orange' ? styles.priorityNumOrange : styles.priorityNumBlue}`}>
                {p.num}
              </div>
              <div className={styles.priorityInfo}>
                <div className={styles.priorityTitle}>{p.title}</div>
                <div className={styles.prioritySubtitle}>{p.sub}</div>
              </div>
              <span className={`${styles.priorityImpact} ${p.impactColor === 'green' ? styles.priorityImpactGreen : styles.priorityImpactBlue}`}>
                {p.impact}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Share Row */}
      <div className={styles.shareRow}>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          Email to Advisor
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share Link
        </button>
      </div>
    </>
  )
}
