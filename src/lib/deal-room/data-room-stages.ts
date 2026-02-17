import { DataRoomStage } from '@prisma/client'

export interface DataRoomColumnConfig {
  id: DataRoomStage | 'UNASSIGNED'
  label: string
  dbValue: DataRoomStage | null
}

/** Ordered Kanban columns — left to right */
export const DATA_ROOM_COLUMNS: DataRoomColumnConfig[] = [
  { id: 'UNASSIGNED', label: 'Unassigned', dbValue: null },
  { id: DataRoomStage.TEASER, label: 'Teaser Sent', dbValue: DataRoomStage.TEASER },
  { id: DataRoomStage.POST_NDA, label: 'NDA Signed', dbValue: DataRoomStage.POST_NDA },
  { id: DataRoomStage.OFFER_RECEIVED, label: 'Offer Received', dbValue: DataRoomStage.OFFER_RECEIVED },
  { id: DataRoomStage.DUE_DILIGENCE, label: 'Diligence', dbValue: DataRoomStage.DUE_DILIGENCE },
]

/** Numeric index for stage ordering (null = unassigned = -1) */
const STAGE_ORDER: Record<string, number> = {
  UNASSIGNED: -1,
  [DataRoomStage.TEASER]: 0,
  [DataRoomStage.POST_NDA]: 1,
  [DataRoomStage.OFFER_RECEIVED]: 2,
  [DataRoomStage.DUE_DILIGENCE]: 3,
}

/**
 * Returns true if a document assigned to `docStage` is visible
 * to a buyer at `buyerStage`. Cumulative: buyer sees docs at
 * their stage or any earlier stage.
 */
export function isDocVisibleAtStage(
  docStage: DataRoomStage | null,
  buyerStage: DataRoomStage
): boolean {
  if (docStage === null) return false // unassigned docs are not visible to buyers
  const docIdx = STAGE_ORDER[docStage] ?? -1
  const buyerIdx = STAGE_ORDER[buyerStage] ?? -1
  return docIdx <= buyerIdx
}
