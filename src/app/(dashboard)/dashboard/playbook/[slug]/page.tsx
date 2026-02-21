'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import { getPlaybookDefinition, getAllPlaybooks } from '@/lib/playbook/playbook-registry'
import styles from '@/components/playbook/playbook.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: 'Personal Readiness',
  FINANCIAL: 'Financial Health',
  OPERATIONAL: 'Operations',
  LEGAL: 'Legal & Compliance',
  MARKET_GROWTH: 'Revenue Growth',
  DEAL_PREP: 'Deal Preparation',
}

function formatImpact(low: number, high: number): string {
  const fmtK = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    return `$${Math.round(v / 1000)}K`
  }
  return `+${fmtK(low)} – ${fmtK(high)}`
}

function formatDuration(low: number, high: number): string {
  if (low === high) return `${low} months`
  return `${low}–${high} months`
}

export default function PlaybookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { selectedCompanyId } = useCompany()
  const definition = getPlaybookDefinition(slug)
  const allPlaybooks = getAllPlaybooks()
  const [percentComplete, setPercentComplete] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/active-playbooks`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.playbooks) return
        const found = data.playbooks.find((p: { id: string; percentComplete: number }) => p.id === slug)
        if (found) setPercentComplete(found.percentComplete)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId, slug])

  if (!definition) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Playbook not found.</p>
        <Link href="/dashboard/playbook" className={styles.sectionLink} style={{ marginTop: '8px', display: 'inline-block' }}>
          Back to Library
        </Link>
      </div>
    )
  }

  const circumference = 2 * Math.PI * 52 // r=52
  const offset = circumference * (1 - percentComplete / 100)

  const relatedPlaybooks = allPlaybooks
    .filter(pb => pb.category === definition.category && pb.slug !== definition.slug)
    .slice(0, 2)

  const statusLabel = percentComplete >= 100 ? 'Completed' : percentComplete > 0 ? 'In Progress' : 'Not Started'
  const statusColor = percentComplete > 0 ? 'var(--accent)' : 'var(--text-tertiary)'

  const difficultyLabel =
    definition.difficulty === 'LOW' || definition.difficulty === 'NONE' ? 'Easy'
    : definition.difficulty === 'MEDIUM' ? 'Medium'
    : 'Hard'

  return (
    <>
      <TrackPageView page={`/dashboard/playbook/${slug}`} />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/playbook">Playbook</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <Link href="/dashboard/playbook">Library</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>{definition.title}</span>
      </div>

      {/* Hero */}
      <div className={styles.playbookHero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroCategory}>{CATEGORY_LABELS[definition.category] || definition.category}</div>
          <div className={styles.heroTitle}>{definition.title}</div>
          <div className={styles.heroBadges}>
            <span className={`${styles.heroBadge} ${styles.heroBadgeGreen}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              {formatImpact(definition.impactBaseLow, definition.impactBaseHigh)} potential uplift
            </span>
            <span className={`${styles.heroBadge} ${styles.heroBadgeBlue}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Estimated {formatDuration(definition.durationLow, definition.durationHigh)}
            </span>
          </div>
        </div>
        <div className={styles.progressRing}>
          <svg viewBox="0 0 120 120">
            <circle className={styles.ringBg} cx="60" cy="60" r="52"/>
            <circle
              className={styles.ringFill}
              cx="60" cy="60" r="52"
              style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
            />
          </svg>
          <div className={styles.ringCenter}>
            <div className={styles.ringPct}>{percentComplete}%</div>
            <div className={styles.ringLabel}>Complete</div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.playbookLayout}>

        {/* LEFT: Main content */}
        <div>

          {/* Overview */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Overview</div>
            <div className={styles.overviewText}>
              <p>{definition.description}</p>
              <p>
                This playbook contains <strong>{definition.phases.length} phases</strong> designed to
                systematically address this area of your business. Complete each phase to improve your
                score in the <strong>{CATEGORY_LABELS[definition.category] || definition.category}</strong> dimension
                and unlock valuation uplift.
              </p>
            </div>
          </div>

          {/* Phase Timeline */}
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Phases</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {definition.phases.length} phases to complete
                </div>
              </div>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add to Action Center
              </button>
            </div>

            <div>
              {definition.phases.map((phase, i) => {
                const isFirst = i === 0
                const isLast = i === definition.phases.length - 1
                const dotClass = isFirst ? styles.phaseDotActive : styles.phaseDotUpcoming
                const progressClass = isFirst ? styles.phaseProgressPartial : styles.phaseProgressPending
                const progressLabel = isFirst ? 'In Progress' : 'Not started'
                return (
                  <div key={i} className={styles.phase}>
                    <div className={styles.phaseHeader}>
                      <div className={`${styles.phaseDot} ${dotClass}`}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className={styles.phaseTitle} style={i > 0 ? { color: 'var(--text-secondary)' } : undefined}>
                          {phase.title}
                        </div>
                        <div className={styles.phaseTimeline}>{phase.description}</div>
                      </div>
                      <span className={`${styles.phaseProgress} ${progressClass}`}>{progressLabel}</span>
                    </div>
                    <div className={styles.phaseTasks}>
                      {/* TODO: wire phase tasks to API — task detail not yet in PlaybookDefinition */}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resources */}
          <div className={styles.card}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Resources</div>
            {/* TODO: wire to API — playbook resources not yet in PlaybookDefinition */}
            <div className={styles.resourceList}>
              <a href="#" className={styles.resourceItem}>
                <div className={`${styles.resourceIcon} ${styles.resourceIconArticle}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.resourceTitle}>Related resources coming soon</div>
                  <div className={styles.resourceMeta}>Exit OSx Resource Center</div>
                </div>
                <div style={{ color: 'var(--text-tertiary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </div>
              </a>
            </div>
          </div>

          {/* Related Playbooks */}
          {relatedPlaybooks.length > 0 && (
            <div className={styles.card}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Related Playbooks</div>
              <div className={styles.relatedGrid}>
                {relatedPlaybooks.map(rp => (
                  <Link key={rp.slug} href={`/dashboard/playbook/${rp.slug}`} className={styles.relatedCard}>
                    <div className={styles.relatedTag}>{CATEGORY_LABELS[rp.category] || rp.category}</div>
                    <div className={styles.relatedTitle}>{rp.title}</div>
                    <div className={styles.relatedImpact}>{formatImpact(rp.impactBaseLow, rp.impactBaseHigh)} potential</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR */}
        <div>

          {/* Progress Meta */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Your Progress</div>
            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Status</div>
                <div className={styles.metaValue} style={{ color: statusColor }}>{statusLabel}</div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Phases</div>
                <div className={styles.metaValue}>{definition.phases.length} total</div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Difficulty</div>
                <div className={styles.metaValue}>{difficultyLabel}</div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Estimated Time</div>
                <div className={styles.metaValue}>{formatDuration(definition.durationLow, definition.durationHigh)}</div>
              </div>
            </div>
            <div className={styles.progressMini}>
              <div className={styles.progressMiniLabel}>
                <span>Overall completion</span>
                <strong style={{ color: 'var(--purple)' }}>{percentComplete}%</strong>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${styles.progressFillPurple}`}
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>

          {/* Impact Estimate */}
          <div className={styles.card} style={{ background: 'var(--green-light)', borderColor: 'rgba(52,199,89,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1B7A34', marginBottom: 8 }}>
              Value Impact Estimate
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1B7A34', letterSpacing: '-0.5px' }}>
              {formatImpact(definition.impactBaseLow, definition.impactBaseHigh)}
            </div>
            <div style={{ fontSize: 12, color: '#2D8A47', marginTop: 4 }}>
              Based on sector acquisition multiples and current assessment scores
            </div>
            {/* TODO: wire score bar to live BRI/DRS score once API supports it */}
            <div className={styles.impactScoreRow}>
              <div className={styles.impactScoreLabel}>Opportunity area identified</div>
              <div className={styles.impactScoreBar}>
                <div className={styles.impactScoreBarFill} style={{ width: '42%' }} />
              </div>
              <div className={styles.impactScoreTarget}>Complete this playbook to maximize exit value</div>
            </div>
          </div>

          {/* Actions */}
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.addTasksBtn}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add All Tasks to Action Center
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.askCoachBtn}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Ask AI Coach
          </button>

        </div>
      </div>
    </>
  )
}
