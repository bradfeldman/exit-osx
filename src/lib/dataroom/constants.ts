/**
 * Client-safe constants for the data room.
 * These can be imported in client components ('use client').
 */

// Category types (matching Prisma enum)
export type DataRoomCategoryType =
  | 'FINANCIAL'
  | 'LEGAL'
  | 'OPERATIONS'
  | 'CUSTOMERS'
  | 'EMPLOYEES'
  | 'IP'
  | 'CUSTOM'
  | 'TASK_PROOF'
  | 'TAX'
  | 'SALES_MARKETING'
  | 'TECHNOLOGY'
  | 'REAL_ESTATE'
  | 'ENVIRONMENTAL'
  | 'INSURANCE'
  | 'CORPORATE'

// Stage types (matching Prisma enum)
export type DataRoomStageType =
  | 'PREPARATION'
  | 'TEASER'
  | 'POST_NDA'
  | 'DUE_DILIGENCE'
  | 'CLOSED'

/**
 * Category metadata for UI display
 */
export const CATEGORY_INFO: Record<DataRoomCategoryType, { label: string; icon: string; color: string }> = {
  CORPORATE: { label: 'Corporate & Legal', icon: 'Building2', color: 'bg-blue-100 text-blue-700' },
  LEGAL: { label: 'Legal', icon: 'Scale', color: 'bg-purple-100 text-purple-700' },
  FINANCIAL: { label: 'Financial', icon: 'DollarSign', color: 'bg-green-100 text-green-700' },
  TAX: { label: 'Tax', icon: 'Receipt', color: 'bg-orange-100 text-orange-700' },
  OPERATIONS: { label: 'Operations', icon: 'Settings', color: 'bg-gray-100 text-gray-700' },
  EMPLOYEES: { label: 'Human Resources', icon: 'Users', color: 'bg-pink-100 text-pink-700' },
  CUSTOMERS: { label: 'Customers', icon: 'UserCheck', color: 'bg-cyan-100 text-cyan-700' },
  SALES_MARKETING: { label: 'Sales & Marketing', icon: 'TrendingUp', color: 'bg-yellow-100 text-yellow-700' },
  IP: { label: 'Intellectual Property', icon: 'Lightbulb', color: 'bg-amber-100 text-amber-700' },
  TECHNOLOGY: { label: 'Technology', icon: 'Code', color: 'bg-indigo-100 text-indigo-700' },
  INSURANCE: { label: 'Insurance', icon: 'Shield', color: 'bg-teal-100 text-teal-700' },
  REAL_ESTATE: { label: 'Real Estate', icon: 'Home', color: 'bg-stone-100 text-stone-700' },
  ENVIRONMENTAL: { label: 'Environmental', icon: 'Leaf', color: 'bg-lime-100 text-lime-700' },
  CUSTOM: { label: 'Other', icon: 'Folder', color: 'bg-slate-100 text-slate-700' },
  TASK_PROOF: { label: 'Task Proof', icon: 'CheckCircle', color: 'bg-emerald-100 text-emerald-700' },
}

/**
 * Stage metadata for UI display
 */
export const STAGE_INFO: Record<DataRoomStageType, { label: string; description: string; color: string }> = {
  PREPARATION: {
    label: 'Preparation',
    description: 'Internal prep, no external access',
    color: 'gray',
  },
  TEASER: {
    label: 'Teaser',
    description: 'Limited docs for initial interest',
    color: 'blue',
  },
  POST_NDA: {
    label: 'Post-NDA',
    description: 'Management presentation level',
    color: 'yellow',
  },
  DUE_DILIGENCE: {
    label: 'Due Diligence',
    description: 'Full DD access',
    color: 'green',
  },
  CLOSED: {
    label: 'Closed',
    description: 'Deal closed, archive mode',
    color: 'purple',
  },
}
