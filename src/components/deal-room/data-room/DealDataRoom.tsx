'use client'

import { FileText, Users, MessageSquare } from 'lucide-react'

interface DataRoomSummary {
  id: string
  stage: string
  activeBuyerAccessCount: number
  totalDocuments: number
  evidenceScore: number
  openQuestions: number
  recentViews: number
  recentDownloads: number
}

interface DealDataRoomProps {
  dataRoom: DataRoomSummary | null
}

export function DealDataRoom({ dataRoom }: DealDataRoomProps) {
  if (!dataRoom) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Data room not yet initialized.
      </div>
    )
  }

  const stageLabel = dataRoom.stage
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          DATA ROOM
        </h2>
        <span className="text-xs text-muted-foreground">
          Stage: {stageLabel} · {dataRoom.activeBuyerAccessCount} buyers active
        </span>
      </div>

      {/* Buyer Access Summary */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Buyer Access</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{dataRoom.activeBuyerAccessCount}</p>
            <p className="text-xs text-muted-foreground">Active buyers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{dataRoom.recentViews}</p>
            <p className="text-xs text-muted-foreground">Views (7d)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{dataRoom.recentDownloads}</p>
            <p className="text-xs text-muted-foreground">Downloads (7d)</p>
          </div>
        </div>
      </div>

      {/* Documents Summary */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Documents</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {dataRoom.totalDocuments} docs · {dataRoom.evidenceScore}% ready
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green transition-all"
            style={{ width: `${dataRoom.evidenceScore}%` }}
          />
        </div>
      </div>

      {/* Q&A */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Q&A</h3>
          {dataRoom.openQuestions > 0 && (
            <span className="text-xs font-medium text-orange-dark dark:text-orange ml-auto">
              {dataRoom.openQuestions} open questions
            </span>
          )}
          {dataRoom.openQuestions === 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              No open questions
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
