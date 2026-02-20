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
  CORPORATE: { label: 'Corporate & Legal', icon: 'Building2', color: 'bg-accent-light text-primary' },
  LEGAL: { label: 'Legal', icon: 'Scale', color: 'bg-purple-light text-purple-dark' },
  FINANCIAL: { label: 'Financial', icon: 'DollarSign', color: 'bg-green-light text-green-dark' },
  TAX: { label: 'Tax', icon: 'Receipt', color: 'bg-orange-light text-orange-dark' },
  OPERATIONS: { label: 'Operations', icon: 'Settings', color: 'bg-secondary text-foreground' },
  EMPLOYEES: { label: 'Human Resources', icon: 'Users', color: 'bg-red-light text-red-dark' },
  CUSTOMERS: { label: 'Customers', icon: 'UserCheck', color: 'bg-teal/10 text-teal' },
  SALES_MARKETING: { label: 'Sales & Marketing', icon: 'TrendingUp', color: 'bg-orange-light text-orange-dark' },
  IP: { label: 'Intellectual Property', icon: 'Lightbulb', color: 'bg-orange-light text-orange-dark' },
  TECHNOLOGY: { label: 'Technology', icon: 'Code', color: 'bg-accent-light text-primary' },
  INSURANCE: { label: 'Insurance', icon: 'Shield', color: 'bg-teal/10 text-teal' },
  REAL_ESTATE: { label: 'Real Estate', icon: 'Home', color: 'bg-secondary text-foreground' },
  ENVIRONMENTAL: { label: 'Environmental', icon: 'Leaf', color: 'bg-green-light text-green-dark' },
  CUSTOM: { label: 'Other', icon: 'Folder', color: 'bg-secondary text-foreground' },
  TASK_PROOF: { label: 'Task Proof', icon: 'CheckCircle', color: 'bg-green-light text-green-dark' },
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
