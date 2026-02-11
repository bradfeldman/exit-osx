// Account Type Detector for Retirement Calculator
// PROD-046: Automatically classifies retirement and investment accounts
// by their tax treatment based on account name/description.
//
// Tax Treatment Categories:
//   tax_free        - Roth IRA, Roth 401(k), HSA (qualified) — already taxed on contribution
//   tax_deferred    - Traditional IRA, Traditional 401(k), 403(b), SEP IRA, SIMPLE IRA, 457(b)
//   capital_gains   - Brokerage, taxable investment accounts, stocks, real estate
//   already_taxed   - Cash, savings, CDs, money market (basis already taxed)
//
// The detector uses keyword matching with priority ordering:
//   1. Roth keywords match first (highest priority — overrides "IRA" or "401k")
//   2. Tax-deferred retirement account keywords
//   3. Taxable investment keywords
//   4. Already-taxed keywords (cash/savings)
//   5. Fallback based on PFS category

import type { TaxTreatment } from './retirement-calculator'

/**
 * Keyword patterns for each tax treatment, ordered by match priority.
 * Each pattern is matched case-insensitively against the account name/description.
 *
 * IMPORTANT: Roth patterns MUST be checked before general IRA/401k patterns
 * because "Roth IRA" contains "IRA" and "Roth 401k" contains "401k".
 */
const TAX_FREE_PATTERNS: RegExp[] = [
  /\broth\b/i,           // Matches: "Roth IRA", "Roth 401k", "Roth 401(k)"
  /\bhsa\b/i,            // Health Savings Account (qualified withdrawals are tax-free)
  /\bhealth\s*savings/i, // "Health Savings Account"
]

const TAX_DEFERRED_PATTERNS: RegExp[] = [
  /\btraditional\b/i,       // "Traditional IRA", "Traditional 401k"
  /\b401\s*\(?k\)?\b/i,     // "401k", "401(k)" (not Roth — checked above)
  /\b403\s*\(?b\)?\b/i,     // "403b", "403(b)"
  /\b457\s*\(?b\)?\b/i,     // "457b", "457(b)"
  /\bsep\s*ira\b/i,         // "SEP IRA"
  /\bsimple\s*ira\b/i,      // "SIMPLE IRA"
  /\brollover\s*ira\b/i,    // "Rollover IRA" (typically from traditional 401k)
  /\bira\b/i,               // Generic "IRA" — defaults to traditional
  /\bpension\b/i,           // Pension distributions taxed as ordinary income
  /\bannuit/i,              // "Annuity" — typically tax-deferred
  /\bdeferred\s*comp/i,     // "Deferred Compensation"
  /\b401a\b/i,              // "401(a)" plan
  /\btsp\b/i,               // "TSP" — Thrift Savings Plan (federal employees)
  /\bthrift\s*savings/i,    // "Thrift Savings Plan"
]

const CAPITAL_GAINS_PATTERNS: RegExp[] = [
  /\bbrokerage\b/i,         // "Brokerage Account"
  /\btaxable\b/i,           // "Taxable Account", "Taxable Investment"
  /\binvestment\s*account/i,// "Investment Account"
  /\bstock/i,               // "Stock Portfolio", "Individual Stocks"
  /\bmutual\s*fund/i,       // "Mutual Fund Account"
  /\betf\b/i,               // "ETF Portfolio"
  /\bbond\s*fund/i,         // "Bond Fund"
  /\breal\s*estate/i,       // "Real Estate", "Rental Property"
  /\brental/i,              // "Rental Income Property"
  /\binvestment\s*propert/i,// "Investment Property"
  /\bcrypto/i,              // "Cryptocurrency"
  /\bbusiness\s*interest/i, // "Business Interest" / "Business Sale"
  /\btrust\b/i,             // "Trust Account" — typically capital gains treatment
]

const ALREADY_TAXED_PATTERNS: RegExp[] = [
  /\bcash\b/i,              // "Cash"
  /\bsaving/i,              // "Savings Account"
  /\bchecking/i,            // "Checking Account"
  /\bmoney\s*market/i,      // "Money Market"
  /\bcd\b/i,                // "CD" — Certificate of Deposit
  /\bcertificate/i,         // "Certificate of Deposit"
  /\btreasury\s*bill/i,     // "Treasury Bill" (if held directly, interest taxed annually)
]

/**
 * Detect the tax treatment for an account based on its name and/or category.
 *
 * Priority order:
 * 1. Check account name against keyword patterns (most specific)
 * 2. Fall back to PFS category if name doesn't match
 * 3. Default to 'already_taxed' if nothing matches
 *
 * @param accountName - The account name or description (e.g., "Roth IRA", "Fidelity 401k")
 * @param category - The PFS category (e.g., "Retirement Accounts", "Investment Accounts")
 * @returns The detected tax treatment
 */
export function detectTaxTreatment(
  accountName: string,
  category?: string
): TaxTreatment {
  const name = accountName || ''

  // Step 1: Check tax-free patterns FIRST (Roth, HSA)
  // This must come before tax-deferred because "Roth IRA" contains "IRA"
  for (const pattern of TAX_FREE_PATTERNS) {
    if (pattern.test(name)) {
      return 'tax_free'
    }
  }

  // Step 2: Check tax-deferred patterns (Traditional, 401k, IRA, etc.)
  for (const pattern of TAX_DEFERRED_PATTERNS) {
    if (pattern.test(name)) {
      return 'tax_deferred'
    }
  }

  // Step 3: Check capital gains patterns (Brokerage, stocks, real estate)
  for (const pattern of CAPITAL_GAINS_PATTERNS) {
    if (pattern.test(name)) {
      return 'capital_gains'
    }
  }

  // Step 4: Check already-taxed patterns (Cash, savings)
  for (const pattern of ALREADY_TAXED_PATTERNS) {
    if (pattern.test(name)) {
      return 'already_taxed'
    }
  }

  // Step 5: Fall back to category-based detection
  if (category) {
    return detectTaxTreatmentFromCategory(category)
  }

  // Step 6: Default
  return 'already_taxed'
}

/**
 * Detect tax treatment based on PFS category alone.
 * Used as a fallback when the account name doesn't match any patterns.
 *
 * PROD-046 FIX: Previously, all "Retirement Accounts" were treated as tax_deferred.
 * Now the name-based detection runs first, so Roth accounts are correctly identified
 * as tax_free before this category fallback is reached.
 */
export function detectTaxTreatmentFromCategory(category: string): TaxTreatment {
  const cat = category.toLowerCase()

  if (cat.includes('retirement')) {
    // Default retirement accounts to tax_deferred (Traditional)
    // Roth accounts should have been caught by name-based detection above
    return 'tax_deferred'
  }

  if (cat.includes('investment') || cat.includes('real estate') || cat.includes('business')) {
    return 'capital_gains'
  }

  if (cat.includes('cash') || cat.includes('savings') || cat.includes('bank')) {
    return 'already_taxed'
  }

  return 'already_taxed'
}

/**
 * Determine a user-friendly label explaining why this tax treatment was assigned.
 * Useful for tooltips or audit trail in the UI.
 */
export function getTaxTreatmentReason(
  accountName: string,
  category?: string
): string {
  const name = accountName || ''

  // Check name-based matches
  for (const pattern of TAX_FREE_PATTERNS) {
    if (pattern.test(name)) {
      if (/\broth\b/i.test(name)) {
        return 'Roth accounts are funded with after-tax dollars, so withdrawals are tax-free.'
      }
      if (/\bhsa\b/i.test(name) || /\bhealth\s*savings/i.test(name)) {
        return 'HSA withdrawals for qualified medical expenses are tax-free.'
      }
      return 'This account type has tax-free withdrawals.'
    }
  }

  for (const pattern of TAX_DEFERRED_PATTERNS) {
    if (pattern.test(name)) {
      return 'This is a tax-deferred retirement account. Withdrawals are taxed as ordinary income.'
    }
  }

  for (const pattern of CAPITAL_GAINS_PATTERNS) {
    if (pattern.test(name)) {
      return 'Gains on this account are subject to capital gains tax when sold.'
    }
  }

  for (const pattern of ALREADY_TAXED_PATTERNS) {
    if (pattern.test(name)) {
      return 'This account holds already-taxed funds. No additional tax on withdrawal.'
    }
  }

  // Category-based reasons
  if (category) {
    const cat = category.toLowerCase()
    if (cat.includes('retirement')) {
      return 'Retirement account — assumed tax-deferred (Traditional). Change to Tax-Free if this is a Roth account.'
    }
    if (cat.includes('investment') || cat.includes('real estate')) {
      return 'Investment account — subject to capital gains tax on appreciation.'
    }
  }

  return 'Default treatment — assumed already taxed. Adjust if needed.'
}
