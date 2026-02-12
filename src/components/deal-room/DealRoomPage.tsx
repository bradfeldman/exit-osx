'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { toast } from 'sonner'
import { ActivationGate } from './ActivationGate'
import { DealRoomTabs, type DealRoomTab } from './DealRoomTabs'
import { PipelineView } from './pipeline/PipelineView'
import { BuyerDetailPanel } from './pipeline/BuyerDetailPanel'
import { VirtualDataRoom } from './data-room/VirtualDataRoom'
import { ActivityFeed } from './activity/ActivityFeed'
import { ContactsView } from './contacts/ContactsView'
import { DealRoomLoading } from './DealRoomLoading'
import { DealRoomError } from './DealRoomError'
import type { PipelineBuyer } from './pipeline/BuyerCard'

interface DealRoomData {
  activation: {
    evidenceReady: boolean
    evidenceScore: number
    isActivated: boolean
    activatedAt: string | null
    canActivate: boolean
  }
  deal: {
    id: string
    codeName: string
    status: string
    startedAt: string
    targetCloseDate: string | null
  } | null
  pipeline: {
    totalBuyers: number
    activeBuyers: number
    exitedBuyers: number
    offersReceived: number
    stages: Array<{
      visualStage: string
      label: string
      buyerCount: number
      buyers: PipelineBuyer[]
    }>
    exitedBuyersSummary: Array<{
      id: string
      companyName: string
      exitStage: string
      exitReason: string | null
      exitedAt: string
    }>
  } | null
  offers: Array<{
    buyerId: string
    companyName: string
    buyerType: string
    offerType: 'IOI' | 'LOI'
    amount: number
    deadline: string | null
    exclusivityStart: string | null
    exclusivityEnd: string | null
    engagementLevel: 'hot' | 'warm' | 'cold'
    docViewsTotal: number
    lastActive: string | null
    notes: string | null
  }>
  dataRoom: {
    id: string
    stage: string
    activeBuyerAccessCount: number
    totalDocuments: number
    evidenceScore: number
    openQuestions: number
    recentViews: number
    recentDownloads: number
  } | null
  recentActivityCount: number
  contactsSummary: {
    total: number
    buyer: number
    seller: number
    neutral: number
  } | null
}

export function DealRoomPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<DealRoomData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<DealRoomTab>('contacts')
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [isAddingBuyer, setIsAddingBuyer] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(false)

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleActivate = async () => {
    if (!selectedCompanyId) return
    setIsActivating(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to activate')
      await fetchData()
    } catch {
      // Re-fetch to show current state
      await fetchData()
    } finally {
      setIsActivating(false)
    }
  }

  const handleAddBuyer = async (buyerData: {
    companyName: string
    buyerType: string
    contactName: string
    contactEmail: string
    notes?: string
  }) => {
    if (!selectedCompanyId) return
    setIsAddingBuyer(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room/buyers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buyerData),
      })
      if (!res.ok) throw new Error('Failed to add buyer')
      await fetchData()
    } catch {
      // Silently fail, data will refetch
    } finally {
      setIsAddingBuyer(false)
    }
  }

  const handleBuyerClick = (buyerId: string) => {
    setSelectedBuyerId(buyerId)
  }

  const handleStageChange = async (buyerId: string, newVisualStage: string) => {
    if (!selectedCompanyId) return

    // Find buyer name for toast message
    const buyer = data?.pipeline?.stages
      .flatMap(s => s.buyers)
      .find(b => b.id === buyerId)

    const stageName = newVisualStage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-room/buyers/${buyerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: newVisualStage }),
        }
      )
      if (!res.ok) throw new Error('Failed to update stage')

      toast.success(
        buyer
          ? `${buyer.companyName} moved to ${stageName}`
          : `Stage updated to ${stageName}`
      )

      await fetchData()
    } catch (error) {
      console.error('Failed to update buyer stage:', error)
      toast.error('Failed to update stage. Please try again.')
      // Re-fetch to ensure UI is in sync
      await fetchData()
    }
  }

  // Find the selected buyer across all stages
  const selectedBuyer = data?.pipeline?.stages
    .flatMap(s => s.buyers)
    .find(b => b.id === selectedBuyerId) ?? null

  if (isLoading) return <DealRoomLoading />
  if (error || !data) return <DealRoomError onRetry={fetchData} />

  // Not activated — show activation gate
  if (!data.activation.isActivated) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <ActivationGate
          activation={data.activation}
          onActivate={handleActivate}
          isActivating={isActivating}
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Tabs */}
      <DealRoomTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        buyerCount={data.pipeline?.totalBuyers ?? 0}
        contactsCount={data.contactsSummary?.total ?? 0}
        openQuestions={data.dataRoom?.openQuestions ?? 0}
        recentActivityCount={data.recentActivityCount}
      />

      {/* Tab Content */}
      {activeTab === 'pipeline' && data.pipeline && (
        <PipelineView
          pipeline={data.pipeline}
          offers={data.offers}
          onBuyerClick={handleBuyerClick}
          onStageChange={handleStageChange}
          onAddBuyer={handleAddBuyer}
          isAddingBuyer={isAddingBuyer}
        />
      )}

      {activeTab === 'contacts' && data.deal && (
        <ContactsView dealId={data.deal.id} companyId={selectedCompanyId} />
      )}

      {activeTab === 'data-room' && (
        <VirtualDataRoom />
      )}

      {activeTab === 'activity' && selectedCompanyId && (
        <ActivityFeed companyId={selectedCompanyId} />
      )}

      {/* Buyer Detail Panel */}
      {selectedBuyer && (
        <BuyerDetailPanel
          buyer={selectedBuyer}
          companyId={selectedCompanyId}
          onClose={() => setSelectedBuyerId(null)}
          onStageChange={fetchData}
        />
      )}
    </div>
  )
}
