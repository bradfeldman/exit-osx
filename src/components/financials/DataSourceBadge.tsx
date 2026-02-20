'use client'

import { Cloud, Edit3, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DataSource = 'quickbooks' | 'manual' | 'mixed'

interface DataSourceBadgeProps {
  source: DataSource
  lastSyncedAt?: Date | string | null
  className?: string
  showLabel?: boolean
}

export function DataSourceBadge({
  source,
  lastSyncedAt,
  className,
  showLabel = true
}: DataSourceBadgeProps) {
  if (source === 'quickbooks') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          "bg-green-light text-green-dark border border-green/20",
          className
        )}
        title={lastSyncedAt ? `Synced from QuickBooks` : 'QuickBooks connected'}
      >
        <Cloud className="h-3 w-3" />
        {showLabel && <span>QuickBooks</span>}
        {lastSyncedAt && (
          <RefreshCw className="h-2.5 w-2.5 text-green" />
        )}
      </div>
    )
  }

  if (source === 'mixed') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          "bg-orange-light text-orange-dark border border-orange/20",
          className
        )}
        title="Mixed data sources - some from QuickBooks, some manual"
      >
        <Cloud className="h-3 w-3" />
        <Edit3 className="h-3 w-3" />
        {showLabel && <span>Mixed</span>}
      </div>
    )
  }

  // Manual entry
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        "bg-secondary text-muted-foreground border border-border",
        className
      )}
      title="Manually entered - Connect QuickBooks to auto-sync"
    >
      <Edit3 className="h-3 w-3" />
      {showLabel && <span>Manual</span>}
    </div>
  )
}

// Helper to determine data source based on integration status
export function determineDataSource(
  hasQuickBooksIntegration: boolean,
  lastSyncedAt?: Date | string | null,
  hasManualEdits?: boolean
): DataSource {
  if (!hasQuickBooksIntegration) return 'manual'
  if (hasManualEdits && lastSyncedAt) return 'mixed'
  if (lastSyncedAt) return 'quickbooks'
  return 'manual'
}
