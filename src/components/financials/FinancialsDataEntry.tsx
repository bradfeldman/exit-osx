'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { PLFormGrid } from './PLFormGrid'
import { FinancialsSpreadsheet } from './FinancialsSpreadsheet'
import { FYESettingsLink } from './FYESettingsLink'
import { AddPeriodDialog } from './AddPeriodDialog'

type DataEntryTab = 'pnl' | 'balance-sheet' | 'add-backs' | 'cash-flow'

interface FinancialsDataEntryProps {
  companyId: string
}

export function FinancialsDataEntry({ companyId }: FinancialsDataEntryProps) {
  const [activeTab, setActiveTab] = useState<DataEntryTab>('pnl')
  const [showAddDialog, setShowAddDialog] = useState(false)
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

  const handlePeriodCreated = useCallback(() => {
    setShowAddDialog(false)
    // PLFormGrid will reload on its own since companyId hasn't changed,
    // but we could add a key-based refresh if needed
  }, [])

  return (
    <div className="space-y-4">
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Year
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'pnl' ? (
        <PLFormGrid companyId={companyId} />
      ) : (
        <FinancialsSpreadsheet
          companyId={companyId}
          initialTab={activeTab}
          hideTabs
          hidePnlTab
        />
      )}

      {/* Add Period Dialog (for power users) */}
      <AddPeriodDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        companyId={companyId}
        onPeriodCreated={handlePeriodCreated}
      />
    </div>
  )
}
