'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PLFormGrid } from './PLFormGrid'
import { BSFormGrid } from './BSFormGrid'
import { AddBacksFormGrid } from './AddBacksFormGrid'
import { CashFlowFormGrid } from './CashFlowFormGrid'
import { FYESettingsLink } from './FYESettingsLink'
import { QuickBooksCard } from '@/components/integrations'

type DataEntryTab = 'pnl' | 'balance-sheet' | 'add-backs' | 'cash-flow'

interface FinancialsDataEntryProps {
  companyId: string
}

export function FinancialsDataEntry({ companyId }: FinancialsDataEntryProps) {
  const [activeTab, setActiveTab] = useState<DataEntryTab>('pnl')
  const [fyeMonth, setFyeMonth] = useState(12)
  const [fyeDay, setFyeDay] = useState(31)

  // Load company FYE settings
  useEffect(() => {
    async function loadFYE() {
      try {
        const response = await fetch(`/api/companies/${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setFyeMonth(data.company?.fiscalYearEndMonth || 12)
          setFyeDay(data.company?.fiscalYearEndDay || 31)
        }
      } catch (err) {
        console.error('Error loading company FYE:', err)
      }
    }
    loadFYE()
  }, [companyId])

  const handleFYEChange = useCallback((month: number, day: number) => {
    setFyeMonth(month)
    setFyeDay(day)
  }, [])

  return (
    <div className="space-y-4">
      {/* QuickBooks Integration */}
      <QuickBooksCard companyId={companyId} />

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DataEntryTab)}>
            <TabsList>
              <TabsTrigger value="pnl">P&L</TabsTrigger>
              <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
              <TabsTrigger value="add-backs">Add-Backs</TabsTrigger>
              <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            </TabsList>
          </Tabs>

          <FYESettingsLink
            companyId={companyId}
            fiscalYearEndMonth={fyeMonth}
            fiscalYearEndDay={fyeDay}
            onFYEChange={handleFYEChange}
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'pnl' && <PLFormGrid companyId={companyId} />}
      {activeTab === 'balance-sheet' && <BSFormGrid companyId={companyId} />}
      {activeTab === 'add-backs' && <AddBacksFormGrid companyId={companyId} />}
      {activeTab === 'cash-flow' && <CashFlowFormGrid companyId={companyId} />}
    </div>
  )
}
