import { type EvidenceCategory } from './evidence-categories'

export type RefreshCadence = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'AS_NEEDED' | 'ONE_TIME'

export interface ExpectedDocument {
  id: string
  name: string
  category: EvidenceCategory
  buyerExplanation: string
  importance: 'required' | 'expected' | 'helpful'
  sortOrder: number
  refreshCadence: RefreshCadence
}

export const EXPECTED_DOCUMENTS: ExpectedDocument[] = [
  // Financial (12 documents, weight 0.30)
  {
    id: 'fin-annual-statements-2025',
    name: '2025 Financial Statements',
    category: 'financial',
    buyerExplanation: 'The most recent fiscal year financials are the foundation of every buyer\'s valuation model. Audited or reviewed statements are strongly preferred.',
    importance: 'required',
    sortOrder: 1,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'fin-annual-statements-2024',
    name: '2024 Financial Statements',
    category: 'financial',
    buyerExplanation: 'Two years of historical financials let buyers assess year-over-year trends in revenue, margins, and operating costs.',
    importance: 'required',
    sortOrder: 2,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'fin-annual-statements-2023',
    name: '2023 Financial Statements',
    category: 'financial',
    buyerExplanation: 'Three years of financials is the standard for acquisitions. It shows trend lines and helps buyers distinguish one-time events from recurring patterns.',
    importance: 'required',
    sortOrder: 3,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'fin-monthly-pl',
    name: 'Monthly P&L (trailing 12 months)',
    category: 'financial',
    buyerExplanation: 'Monthly granularity reveals seasonality, one-time events, and run-rate accuracy. Buyers use this to validate annual numbers and project forward.',
    importance: 'required',
    sortOrder: 4,
    refreshCadence: 'MONTHLY',
  },
  {
    id: 'fin-balance-sheet',
    name: 'Balance Sheet (current)',
    category: 'financial',
    buyerExplanation: 'Working capital, debt levels, and asset composition directly affect purchase price structure and cash-at-close calculations.',
    importance: 'required',
    sortOrder: 5,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'fin-tax-returns-2025',
    name: '2025 Tax Return',
    category: 'financial',
    buyerExplanation: 'The most recent tax return is cross-referenced against financials. Discrepancies raise red flags that delay or kill deals.',
    importance: 'required',
    sortOrder: 6,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'fin-tax-returns-2024',
    name: '2024 Tax Return',
    category: 'financial',
    buyerExplanation: 'Buyers cross-reference two years of returns against financials to verify consistency and identify adjustments.',
    importance: 'required',
    sortOrder: 7,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'fin-tax-returns-2023',
    name: '2023 Tax Return',
    category: 'financial',
    buyerExplanation: 'Three years of tax returns is standard in 100% of acquisitions. Missing returns are a deal-breaker for serious buyers.',
    importance: 'required',
    sortOrder: 8,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'fin-budget-projections',
    name: 'Budget & Projections',
    category: 'financial',
    buyerExplanation: 'Projections show management credibility. Realistic, assumption-backed projections strengthen valuation. Aggressive projections without support damage credibility.',
    importance: 'expected',
    sortOrder: 9,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'fin-ar-aging',
    name: 'Accounts Receivable Aging',
    category: 'financial',
    buyerExplanation: 'AR aging reveals collection efficiency and revenue quality. High concentrations in 60-90+ days signal cash flow risk to buyers.',
    importance: 'expected',
    sortOrder: 10,
    refreshCadence: 'MONTHLY',
  },
  {
    id: 'fin-debt-schedule',
    name: 'Debt Schedule',
    category: 'financial',
    buyerExplanation: 'Every acquisition involves assumption or payoff of debt. Buyers need a complete picture of all obligations to calculate true enterprise value.',
    importance: 'expected',
    sortOrder: 11,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'fin-revenue-by-customer',
    name: 'Revenue by Customer',
    category: 'financial',
    buyerExplanation: 'Revenue concentration analysis helps buyers assess customer dependency risk. Top 10 customers with percentages is standard.',
    importance: 'helpful',
    sortOrder: 12,
    refreshCadence: 'QUARTERLY',
  },

  // Legal (6 documents, weight 0.20)
  {
    id: 'legal-formation',
    name: 'Formation Documents',
    category: 'legal',
    buyerExplanation: 'Articles of incorporation, certificates of formation, and amendments prove the entity\'s legal existence and authority to transact.',
    importance: 'required',
    sortOrder: 1,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'legal-operating-agreement',
    name: 'Operating Agreement / Bylaws',
    category: 'legal',
    buyerExplanation: 'Governance documents reveal transfer restrictions, consent requirements, and authority provisions that directly affect deal structure.',
    importance: 'required',
    sortOrder: 2,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'legal-material-contracts',
    name: 'Material Contracts',
    category: 'legal',
    buyerExplanation: 'Contracts with customers, vendors, and partners are evaluated for assignment clauses, change-of-control provisions, and termination rights.',
    importance: 'required',
    sortOrder: 3,
    refreshCadence: 'AS_NEEDED',
  },
  {
    id: 'legal-litigation',
    name: 'Litigation History',
    category: 'legal',
    buyerExplanation: 'Pending or threatened litigation is a deal-killer if undisclosed. A clean litigation summary builds confidence; surprises during DD destroy it.',
    importance: 'expected',
    sortOrder: 4,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'legal-insurance',
    name: 'Insurance Certificates',
    category: 'legal',
    buyerExplanation: 'Current coverage levels, claims history, and policy gaps are standard diligence items. Missing coverage creates post-close liability risk.',
    importance: 'expected',
    sortOrder: 5,
    refreshCadence: 'ANNUALLY',
  },
  {
    id: 'legal-licenses',
    name: 'Licenses & Permits',
    category: 'legal',
    buyerExplanation: 'Industry-specific licenses and permits must transfer with the business. Non-transferable licenses can delay or restructure deals.',
    importance: 'helpful',
    sortOrder: 6,
    refreshCadence: 'ANNUALLY',
  },

  // Operations (5 documents, weight 0.15)
  {
    id: 'ops-org-chart',
    name: 'Organizational Chart',
    category: 'operational',
    buyerExplanation: 'Buyers need to understand the management team, reporting structure, and key person dependencies. The org chart is their first map of the business.',
    importance: 'required',
    sortOrder: 1,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'ops-sops',
    name: 'Key Processes & SOPs',
    category: 'operational',
    buyerExplanation: 'Documented processes prove the business can run without the owner. This is the #1 transferability signal buyers evaluate.',
    importance: 'required',
    sortOrder: 2,
    refreshCadence: 'AS_NEEDED',
  },
  {
    id: 'ops-vendor-contracts',
    name: 'Vendor Contracts',
    category: 'operational',
    buyerExplanation: 'Material vendor relationships, contract terms, and concentration risk affect operations continuity post-acquisition.',
    importance: 'expected',
    sortOrder: 3,
    refreshCadence: 'AS_NEEDED',
  },
  {
    id: 'ops-facility-leases',
    name: 'Facility Leases',
    category: 'operational',
    buyerExplanation: 'Lease terms, assignment provisions, and remaining obligations are standard diligence items that affect deal structure.',
    importance: 'expected',
    sortOrder: 4,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'ops-equipment',
    name: 'Equipment List',
    category: 'operational',
    buyerExplanation: 'A depreciation schedule and condition assessment of major equipment helps buyers understand capital requirements.',
    importance: 'helpful',
    sortOrder: 5,
    refreshCadence: 'ANNUALLY',
  },

  // Customers (4 documents, weight 0.15)
  {
    id: 'cust-top-list',
    name: 'Top Customer List',
    category: 'customers',
    buyerExplanation: 'Revenue by customer with contract status shows concentration risk and revenue durability. This is evaluated in every deal.',
    importance: 'required',
    sortOrder: 1,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'cust-contracts',
    name: 'Customer Contracts',
    category: 'customers',
    buyerExplanation: 'Buyers review key customer contracts for terms, assignability, auto-renewal provisions, and termination clauses.',
    importance: 'required',
    sortOrder: 2,
    refreshCadence: 'AS_NEEDED',
  },
  {
    id: 'cust-concentration',
    name: 'Customer Concentration Analysis',
    category: 'customers',
    buyerExplanation: 'A clear analysis of revenue concentration with mitigation strategy demonstrates management awareness and reduces buyer risk perception.',
    importance: 'expected',
    sortOrder: 3,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'cust-pipeline',
    name: 'Sales Pipeline / Churn Data',
    category: 'customers',
    buyerExplanation: 'Pipeline visibility and historical churn rates help buyers project future revenue and assess growth trajectory.',
    importance: 'helpful',
    sortOrder: 4,
    refreshCadence: 'MONTHLY',
  },

  // Team/HR (5 documents, weight 0.10)
  {
    id: 'team-census',
    name: 'Employee Census',
    category: 'team',
    buyerExplanation: 'Headcount, tenure, roles, and compensation structure help buyers assess workforce stability and integration complexity.',
    importance: 'required',
    sortOrder: 1,
    refreshCadence: 'QUARTERLY',
  },
  {
    id: 'team-key-agreements',
    name: 'Key Employee Agreements',
    category: 'team',
    buyerExplanation: 'Employment agreements for key employees \u2014 including non-competes, non-solicits, and IP assignments \u2014 protect deal value post-close.',
    importance: 'required',
    sortOrder: 2,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'team-compensation',
    name: 'Compensation Summary',
    category: 'team',
    buyerExplanation: 'Total compensation including benefits, bonuses, and equity helps buyers model post-close operating costs.',
    importance: 'expected',
    sortOrder: 3,
    refreshCadence: 'ANNUALLY',
  },
  {
    id: 'team-handbook',
    name: 'Employee Handbook',
    category: 'team',
    buyerExplanation: 'A current handbook demonstrates HR compliance and reduces post-close employment liability risk.',
    importance: 'expected',
    sortOrder: 4,
    refreshCadence: 'ANNUALLY',
  },
  {
    id: 'team-benefits',
    name: 'Benefit Plan Documents',
    category: 'team',
    buyerExplanation: 'Health, retirement, and equity plan details are needed to assess continuation costs and integration complexity.',
    importance: 'helpful',
    sortOrder: 5,
    refreshCadence: 'ANNUALLY',
  },

  // IP/Tech (2 documents, weight 0.10)
  {
    id: 'ip-assignments',
    name: 'IP Assignment Agreements',
    category: 'ipTech',
    buyerExplanation: 'Buyers verify that all intellectual property is owned by the entity, not individuals. Missing IP assignments can kill a deal in diligence.',
    importance: 'required',
    sortOrder: 1,
    refreshCadence: 'ONE_TIME',
  },
  {
    id: 'ip-licenses',
    name: 'Software Licenses / Tech Architecture',
    category: 'ipTech',
    buyerExplanation: 'Technology stack, third-party dependencies, and license compliance are evaluated for risk and scalability.',
    importance: 'expected',
    sortOrder: 2,
    refreshCadence: 'ANNUALLY',
  },
]

export function getExpectedDocsByCategory(category: EvidenceCategory): ExpectedDocument[] {
  return EXPECTED_DOCUMENTS
    .filter(d => d.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getScoringDocsByCategory(category: EvidenceCategory): ExpectedDocument[] {
  return getExpectedDocsByCategory(category).filter(d => d.importance !== 'helpful')
}
