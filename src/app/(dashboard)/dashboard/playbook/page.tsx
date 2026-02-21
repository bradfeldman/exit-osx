'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import { getAllPlaybooks } from '@/lib/playbook/playbook-registry'
import styles from '@/components/playbook/playbook.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: 'Owner Dependence',
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operations',
  LEGAL: 'Legal',
  MARKET_GROWTH: 'Growth',
  DEAL_PREP: 'Deal Prep',
}

// Maps category to the pb-cat modifier class
const CATEGORY_TAG_CLASS: Record<string, string> = {
  PERSONAL: 'pbCatOwner',
  FINANCIAL: 'pbCatFinancial',
  OPERATIONAL: 'pbCatOperations',
  LEGAL: 'pbCatLegal',
  MARKET_GROWTH: 'pbCatGrowth',
  DEAL_PREP: 'pbCatOwner',
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
  return `+${fmtK(low)} – ${fmtK(high)}`
}

function formatDuration(low: number, high: number): string {
  if (low === high) return `${low} months`
  return `${low}–${high} months`
}

function getDifficultyLabel(difficulty: string): string {
  if (difficulty === 'LOW' || difficulty === 'NONE') return 'Easy'
  if (difficulty === 'MEDIUM') return 'Medium'
  return 'Hard'
}

function getDifficultyClass(difficulty: string): string {
  if (difficulty === 'LOW' || difficulty === 'NONE') return 'pbBadgeEasy'
  if (difficulty === 'MEDIUM') return 'pbBadgeMedium'
  return 'pbBadgeHard'
}

export default function PlaybookPage() {
  const { selectedCompanyId } = useCompany()
  const allPlaybooks = getAllPlaybooks()
  const [activePlaybooks, setActivePlaybooks] = useState<ActivePlaybook[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    Promise.all([
      fetch(`/api/companies/${selectedCompanyId}/playbook-recommendations`).then(r => r.ok ? r.json() : null),
      fetch(`/api/companies/${selectedCompanyId}/active-playbooks`).then(r => r.ok ? r.json() : null),
    ]).then(([_recData, activeData]) => {
      if (cancelled) return
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

  const activeIds = new Set(activePlaybooks.map(ap => ap.id))
  // Completed = 100%, in-progress = >0% and <100%
  const completedIds = new Set(activePlaybooks.filter(ap => ap.percentComplete >= 100).map(ap => ap.id))
  const inProgressIds = new Set(activePlaybooks.filter(ap => ap.percentComplete > 0 && ap.percentComplete < 100).map(ap => ap.id))

  const filteredPlaybooks = allPlaybooks.filter(pb => {
    if (categoryFilter !== 'all' && pb.category !== categoryFilter) return false
    if (search && !pb.title.toLowerCase().includes(search.toLowerCase()) && !pb.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Split filtered playbooks into sections
  const inProgressPlaybooks = filteredPlaybooks.filter(pb => inProgressIds.has(pb.slug))
  const completedPlaybooks = filteredPlaybooks.filter(pb => completedIds.has(pb.slug))
  const notStartedPlaybooks = filteredPlaybooks.filter(pb => !activeIds.has(pb.slug))

  // Summary stats
  const totalPotential = allPlaybooks.reduce((sum, pb) => sum + pb.impactBaseLow + pb.impactBaseHigh, 0)
  const totalPotentialFmt = totalPotential >= 2_000_000
    ? `+$${(totalPotential / 2 / 1_000_000).toFixed(1)}M`
    : `+$${Math.round(totalPotential / 2 / 1000)}K`

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

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">Home</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Playbook Library</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Playbook Library</h1>
          <p>{allPlaybooks.length} proven strategies to increase your business value before going to market</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className={styles.libSummaryStats}>
        <div className={styles.libStatCard}>
          <div className={styles.libStatLabel}>Total Potential</div>
          <div className={`${styles.libStatValue} ${styles.libStatGreen}`}>{totalPotentialFmt}</div>
          <div className={styles.libStatSub}>Across all {allPlaybooks.length} playbooks</div>
        </div>
        <div className={styles.libStatCard}>
          <div className={styles.libStatLabel}>In Progress</div>
          <div className={`${styles.libStatValue} ${styles.libStatBlue}`}>{inProgressIds.size}</div>
          <div className={styles.libStatSub}>Active playbooks</div>
        </div>
        <div className={styles.libStatCard}>
          <div className={styles.libStatLabel}>Completed</div>
          <div className={`${styles.libStatValue} ${styles.libStatGreen}`}>{completedIds.size}</div>
          <div className={styles.libStatSub}>Fully executed</div>
        </div>
        <div className={styles.libStatCard}>
          <div className={styles.libStatLabel}>Not Started</div>
          <div className={`${styles.libStatValue} ${styles.libStatOrange}`}>{allPlaybooks.length - activeIds.size}</div>
          <div className={styles.libStatSub}>Available to start</div>
        </div>
      </div>

      {/* Controls: filter tabs + search */}
      <div className={styles.libControlsRow}>
        <div className={styles.libFilterTabs}>
          <button
            className={`${styles.libFilterTab} ${categoryFilter === 'all' ? styles.libFilterTabActive : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All ({allPlaybooks.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.libFilterTab} ${categoryFilter === cat ? styles.libFilterTabActive : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {CATEGORY_LABELS[cat] || cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>
        <div className={styles.libSearchBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search playbooks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* In Progress section */}
      {inProgressPlaybooks.length > 0 && (
        <>
          <div className={styles.libGridSectionLabel}>In Progress</div>
          <div className={styles.libPlaybookGrid}>
            {inProgressPlaybooks.map(pb => {
              const ap = activePlaybooks.find(a => a.id === pb.slug)
              const pct = ap?.percentComplete ?? 0
              const catClass = CATEGORY_TAG_CLASS[pb.category] || 'pbCatOwner'
              const diffClass = getDifficultyClass(pb.difficulty)
              return (
                <Link key={pb.slug} href={`/dashboard/playbook/${pb.slug}`} className={styles.pbCard}>
                  <div className={styles.pbCardHeader}>
                    <div className={styles[catClass]}>{CATEGORY_LABELS[pb.category] || pb.category}</div>
                    <div className={styles.pbTitle}>{pb.title}</div>
                    <div className={styles.pbDesc}>{pb.description}</div>
                  </div>
                  <div className={styles.pbCardMeta}>
                    <div className={styles.pbMetaRow}>
                      <span className={styles.pbImpact}>{formatImpact(pb.impactBaseLow, pb.impactBaseHigh)}</span>
                      <span className={`${styles.pbBadge} ${styles[diffClass]}`}>{getDifficultyLabel(pb.difficulty)}</span>
                      <span className={styles.pbDuration}>{formatDuration(pb.durationLow, pb.durationHigh)}</span>
                    </div>
                    <div className={styles.pbStatusRow}>
                      <div className={`${styles.pbStatusDot} ${styles.pbStatusDotInProgress}`} />
                      <div className={styles.pbStatusText}>
                        In Progress &mdash; <strong>{pct}% complete</strong>
                      </div>
                    </div>
                    <div className={styles.pbProgress}>
                      <div className={styles.pbProgressFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className={styles.pbCardFooter}>
                    <span className={`${styles.pbBtn} ${styles.pbBtnContinue}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      Continue
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Completed section */}
      {completedPlaybooks.length > 0 && (
        <>
          <div className={styles.libGridSectionLabel}>Completed</div>
          <div className={styles.libPlaybookGrid}>
            {completedPlaybooks.map(pb => {
              const catClass = CATEGORY_TAG_CLASS[pb.category] || 'pbCatOwner'
              const diffClass = getDifficultyClass(pb.difficulty)
              return (
                <Link key={pb.slug} href={`/dashboard/playbook/${pb.slug}`} className={`${styles.pbCard} ${styles.pbCardCompleted}`}>
                  <div className={styles.pbCardHeader}>
                    <div className={styles[catClass]}>{CATEGORY_LABELS[pb.category] || pb.category}</div>
                    <div className={styles.pbTitle}>{pb.title}</div>
                    <div className={styles.pbDesc}>{pb.description}</div>
                  </div>
                  <div className={styles.pbCardMeta}>
                    <div className={styles.pbMetaRow}>
                      <span className={styles.pbImpact}>{formatImpact(pb.impactBaseLow, pb.impactBaseHigh)}</span>
                      <span className={`${styles.pbBadge} ${styles[diffClass]}`}>{getDifficultyLabel(pb.difficulty)}</span>
                      <span className={styles.pbDuration}>{formatDuration(pb.durationLow, pb.durationHigh)}</span>
                    </div>
                    <div className={styles.pbStatusRow}>
                      <div className={`${styles.pbStatusDot} ${styles.pbStatusDotComplete}`} />
                      <div className={`${styles.pbStatusText} ${styles.pbStatusTextComplete}`}>Completed</div>
                    </div>
                    <div className={styles.pbProgress}>
                      <div className={`${styles.pbProgressFill} ${styles.pbProgressFillGreen}`} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div className={styles.pbCardFooter}>
                    <span className={`${styles.pbBtn} ${styles.pbBtnCompleted}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Completed
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Not Started section */}
      {notStartedPlaybooks.length > 0 && (
        <>
          <div className={styles.libGridSectionLabel}>Not Started</div>
          <div className={styles.libPlaybookGrid}>
            {notStartedPlaybooks.map(pb => {
              const catClass = CATEGORY_TAG_CLASS[pb.category] || 'pbCatOwner'
              const diffClass = getDifficultyClass(pb.difficulty)
              return (
                <Link key={pb.slug} href={`/dashboard/playbook/${pb.slug}`} className={styles.pbCard}>
                  <div className={styles.pbCardHeader}>
                    <div className={styles[catClass]}>{CATEGORY_LABELS[pb.category] || pb.category}</div>
                    <div className={styles.pbTitle}>{pb.title}</div>
                    <div className={styles.pbDesc}>{pb.description}</div>
                  </div>
                  <div className={styles.pbCardMeta}>
                    <div className={styles.pbMetaRow}>
                      <span className={styles.pbImpact}>{formatImpact(pb.impactBaseLow, pb.impactBaseHigh)}</span>
                      <span className={`${styles.pbBadge} ${styles[diffClass]}`}>{getDifficultyLabel(pb.difficulty)}</span>
                      <span className={styles.pbDuration}>{formatDuration(pb.durationLow, pb.durationHigh)}</span>
                    </div>
                    <div className={styles.pbStatusRow}>
                      <div className={`${styles.pbStatusDot} ${styles.pbStatusDotNotStarted}`} />
                      <div className={styles.pbStatusText}>Not Started</div>
                    </div>
                  </div>
                  <div className={styles.pbCardFooter}>
                    <span className={`${styles.pbBtn} ${styles.pbBtnStart}`}>Start Playbook</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {filteredPlaybooks.length === 0 && (
        <div className={styles.card} style={{ textAlign: 'center', padding: '48px 40px', color: 'var(--text-secondary)' }}>
          No playbooks match your search or filter.
        </div>
      )}
    </>
  )
}
