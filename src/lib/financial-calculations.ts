// Shared Financial Calculations
// Single source of truth for EBITDA, working capital, FCF, and related metrics.
// All API routes and components should use these functions instead of inline calculations.
//
// PROD-010: Created to resolve inconsistencies across:
// - Income statement API route
// - QuickBooks sync
// - Financial profile (lending page)
// - Frontend FinancialSummaryPanel / PLFormGrid
// - Cash flow statement API route

// ---------------------------------------------------------------------------
// EBITDA Calculation
// ---------------------------------------------------------------------------

export interface EbitdaInputs {
  /** Revenue minus cost of goods sold */
  grossProfit: number
  /**
   * Total operating expenses (SG&A, overhead, etc.)
   * IMPORTANT: In this app, operatingExpenses is "Total Expenses" which INCLUDES
   * depreciation, amortization, interest, and taxes as sub-line-items.
   * EBITDA adds them back to reverse the double-count.
   */
  operatingExpenses: number
  /** Depreciation expense (subset of operatingExpenses) */
  depreciation: number
  /** Amortization expense (subset of operatingExpenses) */
  amortization: number
  /** Interest expense (subset of operatingExpenses) */
  interestExpense: number
  /** Tax expense (subset of operatingExpenses) */
  taxExpense: number
}

/**
 * Calculate EBITDA from gross profit and operating expenses.
 *
 * Formula: EBITDA = Gross Profit - Operating Expenses + D + A + I + T
 *
 * Rationale: In this application, "Operating Expenses" (called "Total Expenses"
 * in the UI) includes D, A, I, and T as sub-line-items. The standard P&L flow is:
 *   Revenue - COGS = Gross Profit
 *   Gross Profit - Total Expenses = Net Income (roughly)
 * To get EBITDA, we add back D, A, I, and T to operating income.
 *
 * This is equivalent to: Operating Income + D + A (the textbook definition)
 * because Operating Income = Gross Profit - OpEx + I + T (since I and T are in OpEx here).
 *
 * @param inputs - The line items needed for EBITDA calculation
 * @returns EBITDA value (can be negative for unprofitable companies)
 */
export function calculateEbitda(inputs: EbitdaInputs): number {
  const {
    grossProfit,
    operatingExpenses,
    depreciation,
    amortization,
    interestExpense,
    taxExpense,
  } = inputs

  return grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
}

/**
 * Calculate EBITDA margin as a decimal (not percentage).
 * Returns 0 if revenue is zero to avoid division by zero.
 */
export function calculateEbitdaMargin(ebitda: number, grossRevenue: number): number {
  return grossRevenue > 0 ? ebitda / grossRevenue : 0
}

// ---------------------------------------------------------------------------
// Working Capital Calculation
// ---------------------------------------------------------------------------

export interface WorkingCapitalInputs {
  accountsReceivable: number
  inventory: number
  accountsPayable: number
}

/**
 * Calculate Operating Working Capital.
 *
 * Formula: Operating Working Capital = Accounts Receivable + Inventory - Accounts Payable
 *
 * This is the M&A-relevant definition (not total current assets - total current liabilities).
 * Operating working capital excludes cash, prepaid expenses, accrued liabilities, and
 * current portion of long-term debt because those are handled separately in the
 * enterprise-to-equity value bridge.
 *
 * @param inputs - AR, inventory, and AP values
 * @returns Operating working capital (can be negative)
 */
export function calculateWorkingCapital(inputs: WorkingCapitalInputs): number {
  return inputs.accountsReceivable + inputs.inventory - inputs.accountsPayable
}

// ---------------------------------------------------------------------------
// Free Cash Flow Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate Free Cash Flow from Cash from Operations and Capital Expenditures.
 *
 * Formula: FCF = Cash from Operations + Capital Expenditures
 *
 * IMPORTANT: capitalExpenditures should be SIGNED (negative for purchases, positive for sales).
 * This is the standard accounting convention where capex is an outflow (negative).
 *
 * Example:
 *   cashFromOperations = 500,000
 *   capitalExpenditures = -100,000 (purchased equipment)
 *   FCF = 500,000 + (-100,000) = 400,000
 *
 * @param cashFromOperations - Net cash from operating activities
 * @param capitalExpenditures - Capital expenditures (SIGNED: negative for purchases)
 * @returns Free Cash Flow
 */
export function calculateFreeCashFlow(
  cashFromOperations: number,
  capitalExpenditures: number
): number {
  // capitalExpenditures is already signed (negative = outflow)
  // FCF = CFO + CapEx (where CapEx is negative)
  // This is equivalent to: FCF = CFO - |CapEx| when CapEx < 0
  return cashFromOperations + capitalExpenditures
}

// ---------------------------------------------------------------------------
// Net Income (from EBITDA)
// ---------------------------------------------------------------------------

export interface NetIncomeFromEbitdaInputs {
  ebitda: number
  depreciation: number
  amortization: number
  interestExpense: number
  taxExpense: number
}

/**
 * Calculate Net Income from EBITDA by subtracting D, A, I, and T.
 *
 * Formula: Net Income = EBITDA - Depreciation - Amortization - Interest - Taxes
 */
export function calculateNetIncomeFromEbitda(inputs: NetIncomeFromEbitdaInputs): number {
  return inputs.ebitda - inputs.depreciation - inputs.amortization - inputs.interestExpense - inputs.taxExpense
}

// ---------------------------------------------------------------------------
// Gross Profit and Margin
// ---------------------------------------------------------------------------

/**
 * Calculate Gross Profit.
 * Formula: Gross Profit = Revenue - COGS
 */
export function calculateGrossProfit(grossRevenue: number, cogs: number): number {
  return grossRevenue - cogs
}

/**
 * Calculate Gross Margin as a decimal (not percentage).
 * Returns 0 if revenue is zero.
 */
export function calculateGrossMargin(grossProfit: number, grossRevenue: number): number {
  return grossRevenue > 0 ? grossProfit / grossRevenue : 0
}
