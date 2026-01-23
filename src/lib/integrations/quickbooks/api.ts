import { getApiBaseUrl, refreshAccessToken } from './client'
import { prisma } from '@/lib/prisma'

interface QuickBooksReportRow {
  ColData: Array<{
    value: string
    id?: string
  }>
  Rows?: {
    Row: QuickBooksReportRow[]
  }
  Summary?: {
    ColData: Array<{ value: string }>
  }
  Header?: {
    ColData: Array<{ value: string }>
  }
  type?: string
}

interface QuickBooksReport {
  Header: {
    ReportName: string
    StartPeriod: string
    EndPeriod: string
  }
  Columns: {
    Column: Array<{
      ColTitle: string
      ColType: string
    }>
  }
  Rows: {
    Row: QuickBooksReportRow[]
  }
}

interface QuickBooksCompanyInfo {
  CompanyInfo: {
    CompanyName: string
    FiscalYearStartMonth: string
  }
}

// Make authenticated request to QuickBooks API
async function makeQuickBooksRequest<T>(
  integrationId: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object
): Promise<T> {
  // Get integration with current tokens
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  })

  if (!integration) {
    throw new Error('Integration not found')
  }

  let accessToken = integration.accessToken
  const realmId = integration.realmId

  // Check if token needs refresh (refresh 5 minutes before expiry)
  if (new Date(integration.tokenExpiresAt) < new Date(Date.now() + 5 * 60 * 1000)) {
    try {
      const newTokens = await refreshAccessToken(integration.refreshToken)
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          tokenExpiresAt: newTokens.tokenExpiresAt,
        },
      })
      accessToken = newTokens.accessToken
    } catch (_error) {
      throw new Error('Failed to refresh QuickBooks token. Please reconnect.')
    }
  }

  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/v3/company/${realmId}${endpoint}`

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

// Get company info from QuickBooks
export async function getCompanyInfo(integrationId: string): Promise<{
  companyName: string
  fiscalYearStartMonth: number
}> {
  const data = await makeQuickBooksRequest<QuickBooksCompanyInfo>(
    integrationId,
    '/companyinfo/' + (await getRealmId(integrationId))
  )

  return {
    companyName: data.CompanyInfo.CompanyName,
    fiscalYearStartMonth: parseInt(data.CompanyInfo.FiscalYearStartMonth) || 1,
  }
}

async function getRealmId(integrationId: string): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { realmId: true },
  })
  return integration?.realmId || ''
}

// Get Profit and Loss report
export async function getProfitAndLossReport(
  integrationId: string,
  startDate: string,
  endDate: string
): Promise<QuickBooksReport> {
  return makeQuickBooksRequest<QuickBooksReport>(
    integrationId,
    `/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&minorversion=65`
  )
}

// Get Balance Sheet report
export async function getBalanceSheetReport(
  integrationId: string,
  asOfDate: string
): Promise<QuickBooksReport> {
  return makeQuickBooksRequest<QuickBooksReport>(
    integrationId,
    `/reports/BalanceSheet?start_date=${asOfDate}&end_date=${asOfDate}&minorversion=65`
  )
}

// Parse P&L report into structured data
export function parseProfitAndLossReport(report: QuickBooksReport): {
  grossRevenue: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
  netIncome: number
  depreciation: number
  interestExpense: number
  taxExpense: number
} {
  const result = {
    grossRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netIncome: 0,
    depreciation: 0,
    interestExpense: 0,
    taxExpense: 0,
  }

  function parseValue(value: string): number {
    const num = parseFloat(value.replace(/[,$]/g, ''))
    return isNaN(num) ? 0 : num
  }

  function findRowValue(rows: QuickBooksReportRow[], groupName: string): number {
    for (const row of rows) {
      const header = row.Header?.ColData?.[0]?.value || ''
      const summary = row.Summary?.ColData?.[1]?.value

      if (header.toLowerCase().includes(groupName.toLowerCase()) && summary) {
        return parseValue(summary)
      }

      // Check nested rows
      if (row.Rows?.Row) {
        const nested = findRowValue(row.Rows.Row, groupName)
        if (nested !== 0) return nested
      }
    }
    return 0
  }

  function findSpecificAccount(rows: QuickBooksReportRow[], accountName: string): number {
    for (const row of rows) {
      if (row.ColData) {
        const name = row.ColData[0]?.value || ''
        if (name.toLowerCase().includes(accountName.toLowerCase())) {
          return parseValue(row.ColData[1]?.value || '0')
        }
      }
      if (row.Rows?.Row) {
        const nested = findSpecificAccount(row.Rows.Row, accountName)
        if (nested !== 0) return nested
      }
    }
    return 0
  }

  const rows = report.Rows?.Row || []

  // Find major sections
  // QuickBooks uses various formats: "Total Income", "Total for Income", "Total Revenue"
  result.grossRevenue = findRowValue(rows, 'Total Income') ||
    findRowValue(rows, 'Total for Income') ||
    findRowValue(rows, 'Total Revenue') ||
    findRowValue(rows, 'Total for Revenue')
  result.cogs = findRowValue(rows, 'Cost of Goods Sold') ||
    findRowValue(rows, 'Total for Cost of Goods Sold') ||
    findRowValue(rows, 'Cost of Sales') ||
    findRowValue(rows, 'Total for Cost of Sales')
  result.grossProfit = findRowValue(rows, 'Gross Profit') || findRowValue(rows, 'Total for Gross Profit')
  result.operatingExpenses = findRowValue(rows, 'Total Expenses') ||
    findRowValue(rows, 'Total for Expenses') ||
    findRowValue(rows, 'Operating Expenses')
  result.netIncome = findRowValue(rows, 'Net Income') ||
    findRowValue(rows, 'Net Operating Income') ||
    findRowValue(rows, 'Net Ordinary Income')

  // Look for specific accounts
  result.depreciation = findSpecificAccount(rows, 'Depreciation') + findSpecificAccount(rows, 'Amortization')
  result.interestExpense = findSpecificAccount(rows, 'Interest')
  result.taxExpense = findSpecificAccount(rows, 'Tax') || findSpecificAccount(rows, 'Income Tax')

  // Calculate if not found
  if (result.grossProfit === 0) {
    result.grossProfit = result.grossRevenue - result.cogs
  }

  return result
}

// Parse Balance Sheet report into structured data
export function parseBalanceSheetReport(report: QuickBooksReport): {
  // Current Assets
  cash: number
  accountsReceivable: number
  inventory: number
  prepaidExpenses: number
  otherCurrentAssets: number
  totalCurrentAssets: number
  // Long-term Assets
  ppeGross: number
  accumulatedDepreciation: number
  intangibleAssets: number
  otherLongTermAssets: number
  totalLongTermAssets: number
  totalAssets: number
  // Current Liabilities
  accountsPayable: number
  accruedExpenses: number
  currentPortionLtd: number
  otherCurrentLiabilities: number
  totalCurrentLiabilities: number
  // Long-term Liabilities
  longTermDebt: number
  deferredTaxLiabilities: number
  otherLongTermLiabilities: number
  totalLongTermLiabilities: number
  totalLiabilities: number
  // Equity
  retainedEarnings: number
  ownersEquity: number
  totalEquity: number
} {
  const result = {
    cash: 0,
    accountsReceivable: 0,
    inventory: 0,
    prepaidExpenses: 0,
    otherCurrentAssets: 0,
    totalCurrentAssets: 0,
    ppeGross: 0,
    accumulatedDepreciation: 0,
    intangibleAssets: 0,
    otherLongTermAssets: 0,
    totalLongTermAssets: 0,
    totalAssets: 0,
    accountsPayable: 0,
    accruedExpenses: 0,
    currentPortionLtd: 0,
    otherCurrentLiabilities: 0,
    totalCurrentLiabilities: 0,
    longTermDebt: 0,
    deferredTaxLiabilities: 0,
    otherLongTermLiabilities: 0,
    totalLongTermLiabilities: 0,
    totalLiabilities: 0,
    retainedEarnings: 0,
    ownersEquity: 0,
    totalEquity: 0,
  }

  function parseValue(value: string): number {
    const num = parseFloat(value.replace(/[,$]/g, ''))
    return isNaN(num) ? 0 : num
  }

  function findAccount(rows: QuickBooksReportRow[], ...names: string[]): number {
    for (const row of rows) {
      if (row.ColData) {
        const accountName = (row.ColData[0]?.value || '').toLowerCase()
        for (const name of names) {
          if (accountName.includes(name.toLowerCase())) {
            return parseValue(row.ColData[1]?.value || '0')
          }
        }
      }
      if (row.Rows?.Row) {
        const nested = findAccount(row.Rows.Row, ...names)
        if (nested !== 0) return nested
      }
    }
    return 0
  }

  function findSectionTotal(rows: QuickBooksReportRow[], sectionName: string): number {
    for (const row of rows) {
      const header = row.Header?.ColData?.[0]?.value || ''
      if (header.toLowerCase().includes(sectionName.toLowerCase())) {
        const summary = row.Summary?.ColData?.[1]?.value
        if (summary) return parseValue(summary)
      }
      if (row.Rows?.Row) {
        const nested = findSectionTotal(row.Rows.Row, sectionName)
        if (nested !== 0) return nested
      }
    }
    return 0
  }

  const rows = report.Rows?.Row || []

  // Current Assets
  result.cash = findAccount(rows, 'checking', 'savings', 'cash', 'bank')
  result.accountsReceivable = findAccount(rows, 'accounts receivable', 'a/r')
  result.inventory = findAccount(rows, 'inventory')
  result.prepaidExpenses = findAccount(rows, 'prepaid')
  result.totalCurrentAssets = findSectionTotal(rows, 'Total Current Assets') ||
    findSectionTotal(rows, 'Current Assets')

  // Fixed Assets
  result.ppeGross = findAccount(rows, 'property', 'equipment', 'furniture', 'vehicle', 'machinery')
  result.accumulatedDepreciation = Math.abs(findAccount(rows, 'accumulated depreciation'))
  result.intangibleAssets = findAccount(rows, 'intangible', 'goodwill')
  result.totalLongTermAssets = findSectionTotal(rows, 'Total Fixed Assets') ||
    findSectionTotal(rows, 'Fixed Assets')

  result.totalAssets = findSectionTotal(rows, 'Total Assets') || findSectionTotal(rows, 'TOTAL ASSETS')

  // Liabilities
  result.accountsPayable = findAccount(rows, 'accounts payable', 'a/p')
  result.accruedExpenses = findAccount(rows, 'accrued')
  result.currentPortionLtd = findAccount(rows, 'current portion', 'line of credit')
  result.totalCurrentLiabilities = findSectionTotal(rows, 'Total Current Liabilities') ||
    findSectionTotal(rows, 'Current Liabilities')

  result.longTermDebt = findAccount(rows, 'long-term', 'long term', 'loan', 'note payable')
  result.totalLongTermLiabilities = findSectionTotal(rows, 'Total Long-Term Liabilities') ||
    findSectionTotal(rows, 'Long-Term Liabilities')

  result.totalLiabilities = findSectionTotal(rows, 'Total Liabilities') || findSectionTotal(rows, 'TOTAL LIABILITIES')

  // Equity
  result.retainedEarnings = findAccount(rows, 'retained earnings')
  result.ownersEquity = findAccount(rows, 'owner', 'capital', 'common stock', 'opening balance')
  result.totalEquity = findSectionTotal(rows, 'Total Equity') || findSectionTotal(rows, 'TOTAL EQUITY')

  // Calculate derived values
  result.otherCurrentAssets = Math.max(0, result.totalCurrentAssets -
    (result.cash + result.accountsReceivable + result.inventory + result.prepaidExpenses))

  result.otherLongTermAssets = Math.max(0, result.totalLongTermAssets -
    (result.ppeGross - result.accumulatedDepreciation + result.intangibleAssets))

  result.otherCurrentLiabilities = Math.max(0, result.totalCurrentLiabilities -
    (result.accountsPayable + result.accruedExpenses + result.currentPortionLtd))

  result.otherLongTermLiabilities = Math.max(0, result.totalLongTermLiabilities - result.longTermDebt)

  return result
}
