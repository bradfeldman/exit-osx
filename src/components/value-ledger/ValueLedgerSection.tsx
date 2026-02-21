'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useCountUpCurrency } from '@/hooks/useCountUp'
import { BookOpen, ArrowRight } from 'lucide-react'
import { LedgerEntry } from './LedgerEntry'

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

interface LedgerResponse {
  entries: LedgerEntryData[]
  summary: {
    totalRecovered: number
    totalAtRisk: number
    netImpact: number
    entryCount: number
  }
}

export function ValueLedgerSection() {
  const { selectedCompanyId } = useCompany()
  const router = useRouter()
  const [data, setData] = useState<LedgerResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    try {
      // Get this month's entries
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const response = await fetch(
        `/api/companies/${selectedCompanyId}/value-ledger?limit=3&since=${monthStart.toISOString()}`
      )
      if (!response.ok) throw new Error('Failed to fetch')
      const json = await response.json()
      setData(json)
    } catch {
      // Silently fail — this is a non-critical section
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const { value: recoveredDisplay } = useCountUpCurrency(data?.summary.totalRecovered ?? 0)

  // Don't render if loading or no entries
  if (isLoading || !data || data.entries.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Value Ledger
          </h3>
        </div>
        <button
          onClick={() => router.push('/dashboard/value-ledger')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View full history
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Monthly stat */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Value recovered this month</p>
        <p className="text-2xl font-semibold text-green-dark tabular-nums">
          {recoveredDisplay}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Every action becomes buyer-proof.
        </p>
      </div>

      {/* Recent entries */}
      <div className="divide-y divide-border">
        {data.entries.map((entry) => (
          <LedgerEntry key={entry.id} entry={entry} mode="compact" />
        ))}
      </div>
    </div>
  )
}
