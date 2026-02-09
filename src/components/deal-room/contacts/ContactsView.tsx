'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDealParticipants } from '@/hooks/useContactSystem'
import { ParticipantRow } from './ParticipantRow'
import { AddParticipantModal } from './AddParticipantModal'
import { ParticipantDetailPanel } from './ParticipantDetailPanel'
import type { DealParticipantData } from '@/hooks/useContactSystem'

interface ContactsViewProps {
  dealId: string
  companyId: string | null
}

type SideFilter = 'ALL' | 'BUYER' | 'SELLER' | 'NEUTRAL'

export function ContactsView({ dealId, companyId }: ContactsViewProps) {
  const [sideFilter, setSideFilter] = useState<SideFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<DealParticipantData | null>(null)

  const { participants, counts, isLoading, refresh } = useDealParticipants(dealId)

  const total = counts.BUYER + counts.SELLER + counts.NEUTRAL

  // Client-side filter by search query and side
  const filtered = useMemo(() => {
    let result = participants
    if (sideFilter !== 'ALL') {
      result = result.filter(p => p.side === sideFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => {
        const name = `${p.canonicalPerson.firstName} ${p.canonicalPerson.lastName}`.toLowerCase()
        const email = p.canonicalPerson.email?.toLowerCase() ?? ''
        return name.includes(q) || email.includes(q)
      })
    }
    return result
  }, [participants, sideFilter, searchQuery])

  // Group by side
  const grouped = useMemo(() => {
    const groups: Record<string, DealParticipantData[]> = { SELLER: [], BUYER: [], NEUTRAL: [] }
    for (const p of filtered) {
      if (groups[p.side]) {
        groups[p.side].push(p)
      }
    }
    return groups
  }, [filtered])

  const filterPills: { id: SideFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: total },
    { id: 'BUYER', label: 'Buyer', count: counts.BUYER },
    { id: 'SELLER', label: 'Seller', count: counts.SELLER },
    { id: 'NEUTRAL', label: 'Neutral', count: counts.NEUTRAL },
  ]

  const sideOrder: ('SELLER' | 'BUYER' | 'NEUTRAL')[] =
    sideFilter === 'ALL' ? ['SELLER', 'BUYER', 'NEUTRAL'] : [sideFilter as 'SELLER' | 'BUYER' | 'NEUTRAL']

  const sideLabels: Record<string, string> = {
    SELLER: 'Seller Side',
    BUYER: 'Buyer Side',
    NEUTRAL: 'Neutral',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="animate-pulse text-sm">Loading contacts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: filter pills + add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          {filterPills.map(pill => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSideFilter(pill.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                sideFilter === pill.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {pill.label}
              {pill.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({pill.count})</span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9 h-9"
        />
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-16">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No contacts yet</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Add your CPA, attorney, M&A advisor, or any deal participant
          </p>
          <Button size="sm" variant="outline" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add First Contact
          </Button>
        </div>
      )}

      {/* Grouped list */}
      {total > 0 && (
        <div className="space-y-6">
          {sideOrder.map(side => {
            const items = grouped[side]
            if (!items || items.length === 0) return null
            return (
              <section key={side}>
                {sideFilter === 'ALL' && (
                  <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                    {sideLabels[side]} ({items.length})
                  </h3>
                )}
                <div className="space-y-0.5">
                  {items.map(p => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      onClick={() => setSelectedParticipant(p)}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {filtered.length === 0 && searchQuery && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No contacts match &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Add modal */}
      <AddParticipantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dealId={dealId}
        companyId={companyId}
        onCreated={() => {
          setIsAddModalOpen(false)
          refresh()
        }}
      />

      {/* Detail panel */}
      {selectedParticipant && (
        <ParticipantDetailPanel
          participant={selectedParticipant}
          dealId={dealId}
          onClose={() => setSelectedParticipant(null)}
          onUpdate={() => {
            setSelectedParticipant(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
