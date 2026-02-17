// PFS Wizard Utilities
// Maps wizard state to the API payload format expected by personalFinancialsSchema

import type { PFSWizardData, BusinessInfo } from './PFSWizardTypes'
import { detectTaxTreatment } from '@/lib/retirement/account-type-detector'

interface PersonalAsset {
  id: string
  category: string
  description: string
  value: number
}

interface PersonalLiability {
  id: string
  category: string
  description: string
  amount: number
}

interface RetirementAccountPayload {
  name: string
  value: number
  taxTreatment: string
}

interface WizardNotes {
  wizardCompleted: boolean
  wizardCompletedAt: string
  wizardVersion: number
  maritalStatus: 'single' | 'married' | null
  completionQuality: 'full' | 'partial'
  stepsSkipped: number[]
}

/**
 * Convert wizard data to PersonalAsset[] for the API
 * Only includes assets with value > 0
 */
export function wizardToPersonalAssets(data: PFSWizardData): PersonalAsset[] {
  const assets: PersonalAsset[] = []
  let counter = 0

  if (data.ownsHome && data.homeValue > 0) {
    assets.push({
      id: `wizard-asset-${counter++}`,
      category: 'Real Estate',
      description: 'Primary Residence',
      value: data.homeValue,
    })
  }

  if (data.hasOtherRealEstate && data.otherRealEstateValue > 0) {
    assets.push({
      id: `wizard-asset-${counter++}`,
      category: 'Real Estate',
      description: 'Other Real Estate',
      value: data.otherRealEstateValue,
    })
  }

  if (data.hasRetirementAccounts) {
    for (const account of data.retirementAccounts) {
      if (account.value > 0) {
        assets.push({
          id: `wizard-asset-${counter++}`,
          category: 'Retirement Accounts',
          description: account.name || 'Retirement Account',
          value: account.value,
        })
      }
    }
  }

  if (data.cashAndSavings > 0) {
    assets.push({
      id: `wizard-asset-${counter++}`,
      category: 'Cash & Savings',
      description: 'Cash & Savings',
      value: data.cashAndSavings,
    })
  }

  if (data.investmentAccounts > 0) {
    assets.push({
      id: `wizard-asset-${counter++}`,
      category: 'Investment Accounts',
      description: 'Investment Accounts',
      value: data.investmentAccounts,
    })
  }

  if (data.vehicles > 0) {
    assets.push({
      id: `wizard-asset-${counter++}`,
      category: 'Vehicles',
      description: 'Vehicles',
      value: data.vehicles,
    })
  }

  if (data.otherAssets > 0) {
    assets.push({
      id: `wizard-asset-${counter++}`,
      category: 'Other Assets',
      description: 'Other Assets',
      value: data.otherAssets,
    })
  }

  return assets
}

/**
 * Convert wizard data to PersonalLiability[] for the API
 * Only includes liabilities with amount > 0
 */
export function wizardToPersonalLiabilities(data: PFSWizardData): PersonalLiability[] {
  const liabilities: PersonalLiability[] = []
  let counter = 0

  if (data.ownsHome && data.mortgageBalance > 0) {
    liabilities.push({
      id: `wizard-liability-${counter++}`,
      category: 'Mortgage',
      description: 'Home Mortgage',
      amount: data.mortgageBalance,
    })
  }

  if (data.hasOtherRealEstate && data.otherRealEstateDebt > 0) {
    liabilities.push({
      id: `wizard-liability-${counter++}`,
      category: 'Mortgage',
      description: 'Other Real Estate Mortgage',
      amount: data.otherRealEstateDebt,
    })
  }

  if (data.hasOtherDebts) {
    for (const debt of data.debts) {
      if (debt.amount > 0) {
        liabilities.push({
          id: `wizard-liability-${counter++}`,
          category: debt.category,
          description: debt.category,
          amount: debt.amount,
        })
      }
    }
  }

  return liabilities
}

/**
 * Convert wizard retirement accounts to the retirementAccounts JSON with tax treatment
 */
export function wizardToRetirementAccounts(data: PFSWizardData): RetirementAccountPayload[] {
  if (!data.hasRetirementAccounts) return []

  return data.retirementAccounts
    .filter(a => a.value > 0)
    .map(a => ({
      name: a.name || 'Retirement Account',
      value: a.value,
      taxTreatment: detectTaxTreatment(a.name, 'Retirement Accounts'),
    }))
}

/**
 * Build the notes JSON string with wizard metadata
 */
export function wizardToNotes(data: PFSWizardData, stepsSkipped: number[]): string {
  const notes: WizardNotes = {
    wizardCompleted: true,
    wizardCompletedAt: new Date().toISOString(),
    wizardVersion: 1,
    maritalStatus: data.maritalStatus,
    completionQuality: stepsSkipped.length === 0 ? 'full' : 'partial',
    stepsSkipped,
  }
  return JSON.stringify(notes)
}

/**
 * Build the complete API payload from wizard data
 */
export function wizardToApiPayload(data: PFSWizardData, stepsSkipped: number[]) {
  const personalAssets = wizardToPersonalAssets(data)
  const personalLiabilities = wizardToPersonalLiabilities(data)
  const retirementAccounts = wizardToRetirementAccounts(data)

  const totalAssets = personalAssets.reduce((sum, a) => sum + a.value, 0)
  const totalLiabilities = personalLiabilities.reduce((sum, l) => sum + l.amount, 0)
  const totalRetirement = personalAssets
    .filter(a => a.category === 'Retirement Accounts')
    .reduce((sum, a) => sum + a.value, 0)

  return {
    personalAssets,
    personalLiabilities,
    retirementAccounts,
    netWorth: totalAssets - totalLiabilities,
    totalRetirement,
    currentAge: data.currentAge,
    retirementAge: null, // Not collected in wizard — set on full PFS page
    exitGoalAmount: null,
    businessOwnership: null, // Default — set on full PFS page
    notes: wizardToNotes(data, stepsSkipped),
  }
}

/**
 * Calculate totals from wizard data for the Reveal step
 */
export function calculateWizardTotals(data: PFSWizardData, businessInfo: BusinessInfo | null) {
  const personalAssets = wizardToPersonalAssets(data)
  const personalLiabilities = wizardToPersonalLiabilities(data)

  const totalPersonalAssets = personalAssets.reduce((sum, a) => sum + a.value, 0)
  const totalLiabilities = personalLiabilities.reduce((sum, l) => sum + l.amount, 0)

  const businessValue = businessInfo
    ? businessInfo.currentValue * (businessInfo.ownershipPercent / 100)
    : 0

  const totalAssets = totalPersonalAssets + businessValue
  const netWorth = totalAssets - totalLiabilities

  const businessConcentration = netWorth > 0
    ? (businessValue / netWorth) * 100
    : 0

  // After-tax preview: 25% estimated tax haircut for MVP
  const afterTaxBusinessValue = businessValue * 0.75

  const totalRetirement = personalAssets
    .filter(a => a.category === 'Retirement Accounts')
    .reduce((sum, a) => sum + a.value, 0)

  return {
    totalPersonalAssets,
    totalLiabilities,
    businessValue,
    totalAssets,
    netWorth,
    businessConcentration,
    afterTaxBusinessValue,
    totalRetirement,
  }
}

/**
 * Format a number as USD currency (no cents)
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue)
  return value < 0 ? `-${formatted}` : formatted
}

/**
 * Format a number for display in an input (commas, no dollar sign)
 */
export function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Parse a formatted string back to a number
 */
export function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}
