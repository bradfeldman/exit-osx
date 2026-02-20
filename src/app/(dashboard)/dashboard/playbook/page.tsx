'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import { getAllPlaybooks } from '@/lib/playbook/playbook-registry'
import styles from '@/components/playbook/playbook.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: 'Personal',
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operations',
  LEGAL: 'Legal & Compliance',
  MARKET_GROWTH: 'Revenue Growth',
  DEAL_PREP: 'Deal Prep',
}

const ICON_COLORS: Record<string, string> = {
  PERSONAL: 'iconPurple',
  FINANCIAL: 'iconBlue',
  OPERATIONAL: 'iconOrange',
  LEGAL: 'iconTeal',
  MARKET_GROWTH: 'iconGreen',
  DEAL_PREP: 'iconRed',
}

interface Recommendation {
  playbook: { slug: string; title: string; category: string; description?: string }
  relevanceScore: number
  estimatedImpactLow: number
  estimatedImpactHigh: number
  isRecommended: boolean
}

interface ActivePlaybook {
  id: string
  title: string
  percentComplete: number
  category: string
}

function formatImpact(low: number, high: number): string {
  const fmtK = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    return `$${Math.round(v / 1000)}K`
  }
  return `+${fmtK(low)}–${fmtK(high)}`
}

export default function PlaybookPage() {
  const { selectedCompanyId } = useCompany()
  const allPlaybooks = getAllPlaybooks()
  const [recommended, setRecommended] = useState<Recommendation[]>([])
  const [activePlaybooks, setActivePlaybooks] = useState<ActivePlaybook[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/playbook-recommendations`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/active-playbooks`).then(r => r.ok ? r.json() : null),
    ]).then(([recData, activeData]) => {
      if (cancelled) return
      if (recData?.recommendations) {
        setRecommended(recData.recommendations.filter((r: Recommendation) => r.isRecommended).slice(0, 3))
      }
      if (activeData?.playbooks) {
        setActivePlaybooks(activeData.playbooks)
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId])

  const categories = Array.from(new Set(allPlaybooks.map(pb => pb.category)))
  const categoryCounts: Record<string, number> = {}
  for (const pb of allPlaybooks) {
    categoryCounts[pb.category] = (categoryCounts[pb.category] || 0) + 1
  }

  const filteredPlaybooks = allPlaybooks.filter(pb => {
    if (categoryFilter !== 'all' && pb.category !== categoryFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
      <TrackPageView page="/dashboard/playbook" />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Playbook</h1>
          <p>Proven step-by-step guides to increase your business value and close readiness gaps</p>
        </div>
        <div>
          <Link href="/dashboard/playbook/library" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
            View Library
          </Link>
        </div>
      </div>

      {/* Recommended Banner */}
      {recommended.length > 0 && (
        <div className={styles.recommendedBanner}>
          <div className={styles.recHeader}>
            <div className={styles.recIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
            </div>
            <h2>Recommended for You</h2>
          </div>
          <div className={styles.recDesc}>Based on your assessment results, BRI score, and value gaps — these playbooks will have the highest impact on your valuation.</div>
          <div className={styles.recCards}>
            {recommended.map((rec, i) => (
              <Link key={rec.playbook.slug} href={`/dashboard/playbook/${rec.playbook.slug}`} className={styles.recCard}>
                <div className={styles.recCardRank} style={i === 1 ? { background: 'var(--orange)' } : i === 2 ? { background: 'var(--accent)' } : undefined}>
                  #{i + 1} Impact
                </div>
                <div className={styles.recCardTitle}>{rec.playbook.title}</div>
                <div className={styles.recCardDesc}>{rec.playbook.description || 'Targeted playbook to address key value gaps.'}</div>
                <div className={styles.recCardMeta}>
                  <span className={styles.recCardImpact}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                    {formatImpact(rec.estimatedImpactLow, rec.estimatedImpactHigh)}
                  </span>
                  <span>Score: {Math.round(rec.relevanceScore)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Playbooks */}
      {activePlaybooks.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Playbooks</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{activePlaybooks.length} in progress</span>
          </div>
          <div className={styles.playbookGrid} style={{ marginBottom: 32 }}>
            {activePlaybooks.map(ap => {
              const def = allPlaybooks.find(p => p.slug === ap.id)
              const iconColor = ICON_COLORS[ap.category] || 'iconBlue'
              return (
                <Link key={ap.id} href={`/dashboard/playbook/${ap.id}`} className={`${styles.playbookCard} ${styles.activePlaybook}`}>
                  <div className={styles.playbookCardTop}>
                    <div className={`${styles.playbookIcon} ${styles[iconColor]}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                    </div>
                    <div className={styles.playbookInfo}>
                      <div className={styles.playbookTitle}>{ap.title}</div>
                      <div className={styles.playbookDesc}>{def?.description || ''}</div>
                    </div>
                  </div>
                  <div className={styles.playbookCardBottom}>
                    <div className={styles.pbMeta}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {ap.percentComplete}% complete
                    </div>
                    <span className={`${styles.pbStatus} ${styles.pbStatusActive}`}>In Progress</span>
                  </div>
                  <div className={styles.pbCta}>
                    Continue playbook
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Browse All */}
      <div className={styles.browseHeader}>
        <h2>All Playbooks</h2>
        <span className={styles.browseCount}>{allPlaybooks.length} playbooks available</span>
      </div>

      <div className={styles.catTabs}>
        <button
          className={`${styles.catTab} ${categoryFilter === 'all' ? styles.catTabActive : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          All <span className={styles.catCount}>({allPlaybooks.length})</span>
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`${styles.catTab} ${categoryFilter === cat ? styles.catTabActive : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {CATEGORY_LABELS[cat] || cat} <span className={styles.catCount}>({categoryCounts[cat]})</span>
          </button>
        ))}
      </div>

      <div className={styles.playbookGrid}>
        {filteredPlaybooks.map(pb => {
          const iconColor = ICON_COLORS[pb.category] || 'iconBlue'
          return (
            <Link key={pb.slug} href={`/dashboard/playbook/${pb.slug}`} className={styles.playbookCard}>
              <div className={styles.playbookCardTop}>
                <div className={`${styles.playbookIcon} ${styles[iconColor]}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                </div>
                <div className={styles.playbookInfo}>
                  <div className={styles.playbookTitle}>{pb.title}</div>
                  <div className={styles.playbookDesc}>{pb.description}</div>
                </div>
              </div>
              <div className={styles.playbookCardBottom}>
                <div className={styles.pbMeta}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {pb.phases.length} phases
                </div>
                <div className={styles.pbImpact}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                  {CATEGORY_LABELS[pb.category] || pb.category}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
