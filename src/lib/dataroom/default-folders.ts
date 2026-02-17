import { DataRoomCategory, DataRoomStage } from '@prisma/client'

export interface FolderTemplate {
  name: string
  category: DataRoomCategory
  sortOrder: number
  minStage: DataRoomStage
  children: string[]
}

/**
 * Default folder structure for a new data room.
 * Based on standard M&A due diligence categories.
 */
export const DEFAULT_FOLDERS: FolderTemplate[] = [
  {
    name: '1. Corporate & Legal',
    category: 'CORPORATE',
    sortOrder: 1,
    minStage: 'PREPARATION',
    children: [
      'Formation Documents',
      'Bylaws & Operating Agreement',
      'Board Minutes',
      'Shareholder Agreements',
      'Cap Table',
    ],
  },
  {
    name: '2. Legal',
    category: 'LEGAL',
    sortOrder: 2,
    minStage: 'POST_NDA',
    children: [
      'Contracts & Agreements',
      'Litigation History',
      'Regulatory Filings',
      'Licenses & Permits',
    ],
  },
  {
    name: '3. Financial',
    category: 'FINANCIAL',
    sortOrder: 3,
    minStage: 'POST_NDA',
    children: [
      'Annual Financial Statements (3 years)',
      'Monthly Financials (12 months)',
      'Budget & Projections',
      'Accounts Receivable Aging',
      'Accounts Payable Aging',
      'Debt Schedule',
      'Revenue by Customer',
    ],
  },
  {
    name: '4. Tax',
    category: 'TAX',
    sortOrder: 4,
    minStage: 'DUE_DILIGENCE',
    children: [
      'Federal Tax Returns (3 years)',
      'State Tax Returns',
      'Sales Tax Filings',
      'Tax Audits & Correspondence',
    ],
  },
  {
    name: '5. Operations',
    category: 'OPERATIONS',
    sortOrder: 5,
    minStage: 'POST_NDA',
    children: [
      'Organizational Chart',
      'Key Processes & SOPs',
      'Vendor Contracts',
      'Facility Leases',
      'Equipment List',
      'Certifications & Compliance',
    ],
  },
  {
    name: '6. Human Resources',
    category: 'EMPLOYEES',
    sortOrder: 6,
    minStage: 'DUE_DILIGENCE',
    children: [
      'Employee Census',
      'Employment Agreements',
      'Benefit Plans',
      'Compensation Summary',
      'Handbook & Policies',
      'Non-Compete Agreements',
    ],
  },
  {
    name: '7. Customers',
    category: 'CUSTOMERS',
    sortOrder: 7,
    minStage: 'POST_NDA',
    children: [
      'Top Customer List',
      'Customer Contracts',
      'Sales Pipeline',
      'Customer Concentration Analysis',
      'Churn Analysis',
    ],
  },
  {
    name: '8. Sales & Marketing',
    category: 'SALES_MARKETING',
    sortOrder: 8,
    minStage: 'TEASER',
    children: [
      'Marketing Materials',
      'Competitor Analysis',
      'Pricing Strategy',
      'Brand Assets',
    ],
  },
  {
    name: '9. Intellectual Property',
    category: 'IP',
    sortOrder: 9,
    minStage: 'POST_NDA',
    children: [
      'Patents & Trademarks',
      'Copyrights',
      'Trade Secrets',
      'IP Assignments',
      'License Agreements',
    ],
  },
  {
    name: '10. Technology',
    category: 'TECHNOLOGY',
    sortOrder: 10,
    minStage: 'DUE_DILIGENCE',
    children: [
      'Software Licenses',
      'Technology Architecture',
      'Security Policies',
      'Source Code (if applicable)',
    ],
  },
  {
    name: '11. Insurance',
    category: 'INSURANCE',
    sortOrder: 11,
    minStage: 'DUE_DILIGENCE',
    children: [
      'Policy Summaries',
      'Claims History',
    ],
  },
  {
    name: '12. Real Estate',
    category: 'REAL_ESTATE',
    sortOrder: 12,
    minStage: 'DUE_DILIGENCE',
    children: [
      'Property Leases',
      'Property Deeds',
      'Zoning Documentation',
    ],
  },
  {
    name: '13. Environmental',
    category: 'ENVIRONMENTAL',
    sortOrder: 13,
    minStage: 'DUE_DILIGENCE',
    children: [
      'Environmental Assessments',
      'Compliance Reports',
      'Remediation Plans',
    ],
  },
  {
    name: 'Other Documents',
    category: 'CUSTOM',
    sortOrder: 100,
    minStage: 'PREPARATION',
    children: [],
  },
]

/**
 * Category metadata for UI display
 */
export const CATEGORY_INFO: Record<DataRoomCategory, { label: string; icon: string; color: string }> = {
  CORPORATE: { label: 'Corporate & Legal', icon: 'Building2', color: 'blue' },
  LEGAL: { label: 'Legal', icon: 'Scale', color: 'purple' },
  FINANCIAL: { label: 'Financial', icon: 'DollarSign', color: 'green' },
  TAX: { label: 'Tax', icon: 'Receipt', color: 'orange' },
  OPERATIONS: { label: 'Operations', icon: 'Settings', color: 'gray' },
  EMPLOYEES: { label: 'Human Resources', icon: 'Users', color: 'pink' },
  CUSTOMERS: { label: 'Customers', icon: 'UserCheck', color: 'cyan' },
  SALES_MARKETING: { label: 'Sales & Marketing', icon: 'TrendingUp', color: 'yellow' },
  IP: { label: 'Intellectual Property', icon: 'Lightbulb', color: 'amber' },
  TECHNOLOGY: { label: 'Technology', icon: 'Code', color: 'indigo' },
  INSURANCE: { label: 'Insurance', icon: 'Shield', color: 'teal' },
  REAL_ESTATE: { label: 'Real Estate', icon: 'Home', color: 'brown' },
  ENVIRONMENTAL: { label: 'Environmental', icon: 'Leaf', color: 'lime' },
  CUSTOM: { label: 'Other', icon: 'Folder', color: 'slate' },
  TASK_PROOF: { label: 'Task Proof', icon: 'CheckCircle', color: 'emerald' },
}

/**
 * Stage metadata for UI display
 */
export const STAGE_INFO: Record<DataRoomStage, { label: string; description: string; color: string }> = {
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
  OFFER_RECEIVED: {
    label: 'Offer Received',
    description: 'IOI/LOI stage access',
    color: 'amber',
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
