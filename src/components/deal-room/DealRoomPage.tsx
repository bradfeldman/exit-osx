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

interface PipelineStage {
  visualStage: string
  label: string
  buyerCount: number
  buyers: PipelineBuyer[]
}

interface PipelineData {
  totalBuyers: number
  activeBuyers: number
  exitedBuyers: number
  offersReceived: number
  stages: PipelineStage[]
  exitedBuyersSummary: Array<{
    id: string
    companyName: string
    exitStage: string
    exitReason: string | null
    exitedAt: string
  }>
}

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
  pipeline: PipelineData | null
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
  const [localPipeline, setLocalPipeline] = useState<PipelineData | null>(null)
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
      setLocalPipeline(json.pipeline)
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

  const handleBuyerFieldUpdate = (buyerId: string, fields: Partial<PipelineBuyer>) => {
    setLocalPipeline(prev => {
      if (!prev) return prev
      return {
        ...prev,
        stages: prev.stages.map(stage => ({
          ...stage,
          buyers: stage.buyers.map(b =>
            b.id === buyerId ? { ...b, ...fields } : b
          ),
        })),
      }
    })
  }

  const handleStageChange = async (buyerId: string, newVisualStage: string, overrideApproval?: boolean) => {
    if (!selectedCompanyId || !localPipeline) return

    // Find buyer and current stage
    let movedBuyer: PipelineBuyer | undefined
    let sourceStageIdx = -1
    for (let i = 0; i < localPipeline.stages.length; i++) {
      const found = localPipeline.stages[i].buyers.find(b => b.id === buyerId)
      if (found) {
        movedBuyer = found
        sourceStageIdx = i
        break
      }
    }
    if (!movedBuyer || sourceStageIdx === -1) return

    const targetStageIdx = localPipeline.stages.findIndex(s => s.visualStage === newVisualStage)
    if (targetStageIdx === -1 || targetStageIdx === sourceStageIdx) return

    const stageName = localPipeline.stages[targetStageIdx].label

    // Save pre-move state for rollback
    const previousPipeline = localPipeline

    // Optimistically move the buyer
    setLocalPipeline(prev => {
      if (!prev) return prev
      const newStages = prev.stages.map((stage, idx) => {
        if (idx === sourceStageIdx) {
          const newBuyers = stage.buyers.filter(b => b.id !== buyerId)
          return { ...stage, buyers: newBuyers, buyerCount: newBuyers.length }
        }
        if (idx === targetStageIdx) {
          const newBuyers = [...stage.buyers, movedBuyer!]
          return { ...stage, buyers: newBuyers, buyerCount: newBuyers.length }
        }
        return stage
      })
      return { ...prev, stages: newStages }
    })

    // Fire PATCH in background
    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-room/buyers/${buyerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: newVisualStage,
            ...(overrideApproval ? { overrideApproval: true } : {}),
          }),
        }
      )
      if (!res.ok) throw new Error('Failed to update stage')

      toast.success(`${movedBuyer.companyName} moved to ${stageName}`)
    } catch {
      // Rollback on failure
      setLocalPipeline(previousPipeline)
      toast.error('Failed to update stage. Please try again.')
      await fetchData()
    }
  }

  // Find the selected buyer across all stages
  const selectedBuyer = localPipeline?.stages
    .flatMap(s => s.buyers)
    .find(b => b.id === selectedBuyerId) ?? null

  if (isLoading) return <DealRoomLoading />
  if (error || !data) return <DealRoomError onRetry={fetchData} />

  // Not activated — show activation gate
  if (!data.activation.isActivated) {
    return (
      <div className="max-w-[1200px] mx-auto sm:px-2 py-2 sm:py-8">
        <ActivationGate
          activation={data.activation}
          onActivate={handleActivate}
          isActivating={isActivating}
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto sm:px-2 py-2 sm:py-8">
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
      {activeTab === 'pipeline' && localPipeline && (
        <PipelineView
          pipeline={localPipeline}
          offers={data.offers}
          companyId={selectedCompanyId}
          onBuyerClick={handleBuyerClick}
          onStageChange={handleStageChange}
          onRefresh={fetchData}
          onAddBuyer={handleAddBuyer}
          isAddingBuyer={isAddingBuyer}
        />
      )}

      {activeTab === 'contacts' && data.deal && (
        <ContactsView
          dealId={data.deal.id}
          companyId={selectedCompanyId}
          onNavigateToPipeline={() => setActiveTab('pipeline')}
        />
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
          onBuyerFieldUpdate={handleBuyerFieldUpdate}
        />
      )}
    </div>
  )
}
