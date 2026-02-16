// PFS Wizard Types
// Shared types for the Personal Financial Snapshot onboarding wizard

export interface RetirementAccount {
  id: string
  name: string
  value: number
}

export interface DebtItem {
  id: string
  category: string
  amount: number
}

export interface PFSWizardData {
  // Step 1: About You
  currentAge: number | null
  maritalStatus: 'single' | 'married' | null

  // Step 2: Home & Real Estate
  ownsHome: boolean | null
  homeValue: number
  mortgageBalance: number
  hasOtherRealEstate: boolean
  otherRealEstateValue: number
  otherRealEstateDebt: number

  // Step 3: Retirement Accounts
  hasRetirementAccounts: boolean | null
  retirementAccounts: RetirementAccount[]

  // Step 4: Other Assets
  cashAndSavings: number
  investmentAccounts: number
  vehicles: number
  otherAssets: number

  // Step 5: Debts
  hasOtherDebts: boolean | null
  debts: DebtItem[]
}

export interface PFSWizardStepProps {
  data: PFSWizardData
  onUpdate: (updates: Partial<PFSWizardData>) => void
  onNext: () => void
  onBack: () => void
}

export interface BusinessInfo {
  companyId: string
  companyName: string
  currentValue: number
  ownershipPercent: number
}

export const DEBT_CATEGORIES = [
  'Auto Loans',
  'Student Loans',
  'Credit Cards',
  'Personal Loans',
  'Other Liabilities',
] as const

export const INITIAL_WIZARD_DATA: PFSWizardData = {
  currentAge: null,
  maritalStatus: null,
  ownsHome: null,
  homeValue: 0,
  mortgageBalance: 0,
  hasOtherRealEstate: false,
  otherRealEstateValue: 0,
  otherRealEstateDebt: 0,
  hasRetirementAccounts: null,
  retirementAccounts: [],
  cashAndSavings: 0,
  investmentAccounts: 0,
  vehicles: 0,
  otherAssets: 0,
  hasOtherDebts: null,
  debts: [],
}
