'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { getAllPlaybooks } from '@/lib/playbook/playbook-registry'
import { PlaybookCard } from '@/components/playbook/PlaybookCard'
import type { PlaybookDefinition } from '../../../../../prisma/seed-data/playbook-definitions'

const CATEGORY_LABELS: Record<string, string> = {
  PERSONAL: 'Personal',
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operations',
  LEGAL: 'Legal',
  MARKET_GROWTH: 'Growth',
  DEAL_PREP: 'Deal Prep',
}

const JOURNEY_PHASES = [
  { label: 'Personal Readiness', slugRange: [1, 5] },
  { label: 'Financial Cleanup', slugRange: [6, 11] },
  { label: 'Operations', slugRange: [12, 19] },
  { label: 'Legal & Compliance', slugRange: [20, 25] },
  { label: 'Growth & Value', slugRange: [26, 30] },
  { label: 'Deal Preparation', slugRange: [31, 38] },
  { label: 'Contingency', slugRange: [39, 44] },
]

interface RecommendedPlaybook {
  playbook: PlaybookDefinition
  relevanceScore: number
  estimatedImpactLow: number
  estimatedImpactHigh: number
  isRecommended: boolean
}

function getSlugNumber(slug: string): number {
  const match = slug.match(/PB-(\d+)/i)
  return match ? parseInt(match[1], 10) : 0
}

function getProgress(slug: string): { percent: number; lastActive: string | null } {
  if (typeof window === 'undefined') return { percent: 0, lastActive: null }
  try {
    const stored = localStorage.getItem(`exitosx-${slug.toLowerCase()}`)
    if (!stored) return { percent: 0, lastActive: null }
    const data = JSON.parse(stored)
    const completed = data.completedSections?.length ?? 0
    const total = data.totalSections ?? 1
    return {
      percent: (completed / total) * 100,
      lastActive: data.lastUpdated ?? null,
    }
  } catch {
    return { percent: 0, lastActive: null }
  }
}

/** Generate a brief rationale from BRI category gap */
function getRationale(category: string): string {
  const map: Record<string, string> = {
    PERSONAL: 'Addresses your personal readiness gap',
    FINANCIAL: 'Strengthens your financial position',
    OPERATIONAL: 'Reduces operational risk for buyers',
    LEGAL: 'Closes legal compliance gaps',
    MARKET_GROWTH: 'Improves growth trajectory for buyers',
    DEAL_PREP: 'Prepares you for deal execution',
  }
  return map[category] || 'Recommended based on your profile'
}

export default function PlaybookHubPage() {
  const { selectedCompanyId } = useCompany()
  const { planTier } = useSubscription()
  const allPlaybooks = getAllPlaybooks()
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'not-started'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [progressMap, setProgressMap] = useState<Map<string, { percent: number; lastActive: string | null }>>(new Map())
  const [recommended, setRecommended] = useState<RecommendedPlaybook[]>([])

  // Load progress from localStorage
  useEffect(() => {
    const map = new Map<string, { percent: number; lastActive: string | null }>()
    for (const pb of allPlaybooks) {
      map.set(pb.slug, getProgress(pb.slug))
    }
    setProgressMap(map)
  }, [allPlaybooks])

  // Fetch recommendations from API
  useEffect(() => {
    if (!selectedCompanyId) return
    fetch(`/api/companies/${selectedCompanyId}/playbook-recommendations`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.recommendations) {
          setRecommended(
            data.recommendations
              .filter((r: RecommendedPlaybook) => r.isRecommended)
              .slice(0, 3)
          )
        }
      })
      .catch(() => {}) // non-blocking
  }, [selectedCompanyId])

  const activePlaybooks = allPlaybooks.filter(
    (pb) => (progressMap.get(pb.slug)?.percent ?? 0) > 0 && (progressMap.get(pb.slug)?.percent ?? 0) < 100
  )

  const filteredPlaybooks = allPlaybooks.filter((pb) => {
    const progress = progressMap.get(pb.slug)?.percent ?? 0
    if (filter === 'in-progress' && (progress === 0 || progress >= 100)) return false
    if (filter === 'not-started' && progress > 0) return false
    if (categoryFilter !== 'all' && pb.category !== categoryFilter) return false
    if (search && !pb.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categories = Array.from(new Set(allPlaybooks.map((pb) => pb.category)))

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
          Programs
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
          Step-by-step playbooks to improve your exit readiness across every category.
        </p>
      </div>

      {/* Active Playbooks (if any) */}
      {activePlaybooks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
            Continue Where You Left Off
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePlaybooks.slice(0, 3).map((pb) => {
              const progress = progressMap.get(pb.slug)
              return (
                <Link
                  key={pb.slug}
                  href={`/playbook/${pb.slug}`}
                  className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
                  style={{ borderColor: 'var(--border, #E5E7EB)' }}
                >
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
                    {pb.title}
                  </p>
                  <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress?.percent ?? 0}%`,
                        backgroundColor: 'var(--accent, #0071E3)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary, #8E8E93)' }}>
                      {Math.round(progress?.percent ?? 0)}% complete
                    </span>
                    <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--accent, #0071E3)' }}>
                      Continue <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Recommended For You */}
      {recommended.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary, #1D1D1F)' }}>
            Recommended For You
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((rec) => (
              <PlaybookCard
                key={rec.playbook.slug}
                definition={rec.playbook}
                progress={progressMap.get(rec.playbook.slug)}
                planTier={planTier}
                rationale={getRationale(rec.playbook.category)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'in-progress', 'not-started'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: filter === f ? 'var(--accent-light, #EBF5FF)' : 'transparent',
                color: filter === f ? 'var(--accent, #0071E3)' : 'var(--text-secondary, #6E6E73)',
              }}
            >
              {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : 'Not Started'}
            </button>
          ))}
          <span className="w-px h-6 self-center" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: categoryFilter === cat ? 'var(--accent-light, #EBF5FF)' : 'transparent',
                color: categoryFilter === cat ? 'var(--accent, #0071E3)' : 'var(--text-secondary, #6E6E73)',
              }}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search playbooks..."
          className="h-9 px-3 text-sm rounded-lg border bg-white w-full sm:w-64"
          style={{ borderColor: 'var(--border, #E5E7EB)' }}
        />
      </div>

      {/* Journey view */}
      <div className="space-y-8">
        {JOURNEY_PHASES.map((phase) => {
          const phasePlaybooks = filteredPlaybooks.filter((pb) => {
            const num = getSlugNumber(pb.slug)
            return num >= phase.slugRange[0] && num <= phase.slugRange[1]
          })

          if (phasePlaybooks.length === 0) return null

          return (
            <section key={phase.label}>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary, #6E6E73)' }}>
                {phase.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {phasePlaybooks.map((pb) => (
                  <PlaybookCard key={pb.slug} definition={pb} progress={progressMap.get(pb.slug)} planTier={planTier} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
