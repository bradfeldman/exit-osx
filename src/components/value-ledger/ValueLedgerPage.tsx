'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { LedgerSummaryBar } from './LedgerSummaryBar'
import { LedgerFilters } from './LedgerFilters'
import { LedgerTimeline } from './LedgerTimeline'
import { ValueLedgerLoading } from './ValueLedgerLoading'

interface LedgerEntryData {
  id: string
  eventType: string
  category: string | null
  deltaValueRecovered: number
  deltaValueAtRisk: number
  deltaBri: number | null
  narrativeSummary: string
  occurredAt: string
  taskId: string | null
  signalId: string | null
}

interface LedgerSummary {
  totalRecovered: number
  totalAtRisk: number
  netImpact: number
  entryCount: number
}

export function ValueLedgerPage() {
  const { selectedCompanyId } = useCompany()
  const [entries, setEntries] = useState<LedgerEntryData[]>([])
  const [summary, setSummary] = useState<LedgerSummary>({
    totalRecovered: 0,
    totalAtRisk: 0,
    netImpact: 0,
    entryCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [eventType, setEventType] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const fetchData = useCallback(
    async (cursor?: string) => {
      if (!selectedCompanyId) return
      if (cursor) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const params = new URLSearchParams({ limit: '20' })
        if (category) params.set('category', category)
        if (eventType) params.set('eventType', eventType)
        if (cursor) params.set('cursor', cursor)

        const response = await fetch(
          `/api/companies/${selectedCompanyId}/value-ledger?${params}`
        )
        if (!response.ok) throw new Error('Failed to fetch')
        const json = await response.json()

        if (cursor) {
          setEntries((prev) => [...prev, ...json.entries])
        } else {
          setEntries(json.entries)
          setSummary(json.summary)
        }
        setNextCursor(json.nextCursor)
      } catch {
        // Error handling — keep existing state
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [selectedCompanyId, category, eventType]
  )

  // Initial load and filter changes
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          fetchData(nextCursor)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [nextCursor, isLoadingMore, fetchData])

  if (isLoading) return <ValueLedgerLoading />

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnimatedStagger className="space-y-6" staggerDelay={0.12}>
        {/* Page Header */}
        <AnimatedItem>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Value Ledger</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Every action, every signal — your buyer-proof value story.
            </p>
          </div>
        </AnimatedItem>

        {/* Summary Bar */}
        <AnimatedItem>
          <LedgerSummaryBar
            totalRecovered={summary.totalRecovered}
            totalAtRisk={summary.totalAtRisk}
            entryCount={summary.entryCount}
          />
        </AnimatedItem>

        {/* Filters */}
        <AnimatedItem>
          <LedgerFilters
            selectedCategory={category}
            selectedEventType={eventType}
            onCategoryChange={setCategory}
            onEventTypeChange={setEventType}
          />
        </AnimatedItem>

        {/* Timeline */}
        <AnimatedItem>
          <LedgerTimeline entries={entries} />
        </AnimatedItem>

        {/* Infinite scroll trigger */}
        {nextCursor && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {isLoadingMore && (
              <p className="text-sm text-zinc-400 animate-pulse">Loading more...</p>
            )}
          </div>
        )}
      </AnimatedStagger>
    </div>
  )
}
