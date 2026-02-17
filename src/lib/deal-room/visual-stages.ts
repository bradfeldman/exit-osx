import { DealStage } from '@prisma/client'

export type VisualStage = 'identified' | 'engaged' | 'under_nda' | 'offer_received' | 'diligence' | 'closed'

export interface VisualStageConfig {
  id: VisualStage
  label: string
  color: string
  backendStages: DealStage[]
}

export const VISUAL_STAGES: VisualStageConfig[] = [
  {
    id: 'identified',
    label: 'Prospect',
    color: 'slate',
    backendStages: [DealStage.IDENTIFIED, DealStage.SELLER_REVIEWING, DealStage.APPROVED],
  },
  {
    id: 'engaged',
    label: 'Teaser Sent',
    color: 'blue',
    backendStages: [DealStage.TEASER_SENT, DealStage.INTERESTED, DealStage.NDA_SENT, DealStage.NDA_NEGOTIATING],
  },
  {
    id: 'under_nda',
    label: 'NDA Signed',
    color: 'indigo',
    backendStages: [DealStage.NDA_EXECUTED, DealStage.CIM_ACCESS, DealStage.LEVEL_2_ACCESS, DealStage.LEVEL_3_ACCESS, DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.MANAGEMENT_MEETING_COMPLETED],
  },
  {
    id: 'offer_received',
    label: 'Offer Received',
    color: 'amber',
    backendStages: [DealStage.IOI_REQUESTED, DealStage.IOI_RECEIVED, DealStage.IOI_ACCEPTED, DealStage.LOI_REQUESTED, DealStage.LOI_RECEIVED, DealStage.LOI_SELECTED, DealStage.LOI_BACKUP],
  },
  {
    id: 'diligence',
    label: 'Diligence',
    color: 'purple',
    backendStages: [DealStage.DUE_DILIGENCE, DealStage.PA_DRAFTING, DealStage.PA_NEGOTIATING, DealStage.CLOSING],
  },
  {
    id: 'closed',
    label: 'Closed',
    color: 'emerald',
    backendStages: [DealStage.CLOSED],
  },
]

export const EXIT_STAGES: DealStage[] = [
  DealStage.DECLINED,
  DealStage.PASSED,
  DealStage.IOI_DECLINED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
]

export const VISUAL_STAGE_MAP: Record<VisualStage, VisualStageConfig> = Object.fromEntries(
  VISUAL_STAGES.map(vs => [vs.id, vs])
) as Record<VisualStage, VisualStageConfig>

/** Map a backend DealStage to one of the 6 visual stages (or 'exited') */
export function getVisualStage(backendStage: DealStage): VisualStage | 'exited' {
  for (const vs of VISUAL_STAGES) {
    if (vs.backendStages.includes(backendStage)) return vs.id
  }
  if (EXIT_STAGES.includes(backendStage)) return 'exited'
  return 'identified' // fallback
}

/** Human-readable label for a backend DealStage */
export function getStageLabel(stage: DealStage): string {
  return stage
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Resolve visual stage selection to the best backend stage based on context
 */
export function resolveBackendStage(
  _currentStage: DealStage,
  targetVisual: VisualStage,
  context: {
    hasNDA?: boolean
    hasIOI?: boolean
    hasLOI?: boolean
    offerType?: 'IOI' | 'LOI'
  }
): DealStage {
  switch (targetVisual) {
    case 'identified':
      return DealStage.IDENTIFIED
    case 'engaged':
      return DealStage.TEASER_SENT
    case 'under_nda':
      return DealStage.NDA_EXECUTED
    case 'offer_received':
      if (context.offerType === 'LOI' || context.hasLOI) return DealStage.LOI_RECEIVED
      if (context.offerType === 'IOI' || context.hasIOI) return DealStage.IOI_RECEIVED
      return DealStage.IOI_RECEIVED
    case 'diligence':
      return DealStage.DUE_DILIGENCE
    case 'closed':
      return DealStage.CLOSED
  }
}

/**
 * Calculate engagement level based on recent VDR activity
 */
export function calculateEngagementLevel(
  docViewsLast7Days: number,
  lastActivityDaysAgo: number | null
): 'hot' | 'warm' | 'cold' | 'none' {
  if (lastActivityDaysAgo === null) return 'none'
  if (docViewsLast7Days >= 3) return 'hot'
  if (docViewsLast7Days >= 1 || lastActivityDaysAgo <= 7) return 'warm'
  if (lastActivityDaysAgo > 14) return 'cold'
  return 'warm'
}
