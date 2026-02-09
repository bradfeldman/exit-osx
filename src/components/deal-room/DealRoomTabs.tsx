'use client'

import { cn } from '@/lib/utils'

export type DealRoomTab = 'pipeline' | 'contacts' | 'data-room' | 'activity'

interface DealRoomTabsProps {
  activeTab: DealRoomTab
  onTabChange: (tab: DealRoomTab) => void
  buyerCount: number
  contactsCount: number
  openQuestions: number
  recentActivityCount: number
}

export function DealRoomTabs({
  activeTab,
  onTabChange,
  buyerCount,
  contactsCount,
  openQuestions,
  recentActivityCount,
}: DealRoomTabsProps) {
  const tabs: { id: DealRoomTab; label: string; badge: number | null }[] = [
    { id: 'pipeline', label: 'Pipeline', badge: buyerCount > 0 ? buyerCount : null },
    { id: 'contacts', label: 'Contacts', badge: contactsCount > 0 ? contactsCount : null },
    { id: 'data-room', label: 'Data Room', badge: openQuestions > 0 ? openQuestions : null },
    { id: 'activity', label: 'Activity', badge: recentActivityCount > 0 ? recentActivityCount : null },
  ]

  return (
    <div className="border-b border-border/50 mb-6">
      <div className="flex gap-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'pb-3 text-sm font-medium cursor-pointer transition-colors',
              activeTab === tab.id
                ? 'text-foreground border-b-2 border-[var(--burnt-orange)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.badge !== null && (
              <span className="ml-1 text-xs text-muted-foreground">({tab.badge})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
