import 'dotenv/config'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function fmt(n: number): string {
  return '$' + n.toLocaleString()
}

async function main() {
  // Find all financial periods with income statements
  const allPeriods = await prisma.financialPeriod.findMany({
    where: {
      incomeStatement: { isNot: null }
    },
    include: {
      company: { select: { id: true, name: true } },
      incomeStatement: true,
      balanceSheet: true,
      cashFlowStatement: true
    },
    orderBy: [
      { company: { name: 'asc' } },
      { fiscalYear: 'asc' }
    ]
  })

  console.log('All financial periods with income statements:')
  for (const p of allPeriods) {
    console.log('  ' + p.company.name + ' - FY' + p.fiscalYear +
      ' (BS: ' + (p.balanceSheet ? 'Yes' : 'No') +
      ', CF: ' + (p.cashFlowStatement ? 'Yes' : 'No') + ')')
  }

  if (allPeriods.length === 0) {
    console.log('No financial periods with income statements found')
    return
  }

  // Group by company and find one with multiple years
  const byCompany: Record<string, typeof allPeriods> = {}
  for (const p of allPeriods) {
    const key = p.company.id
    if (!byCompany[key]) byCompany[key] = []
    byCompany[key].push(p)
  }

  // Find a company with at least 2 consecutive years
  let targetCompanyId = null
  let targetYears: number[] = []
  for (const [companyId, periods] of Object.entries(byCompany)) {
    if (periods.length >= 2) {
      const years = periods.map(p => p.fiscalYear).sort((a, b) => a - b)
      for (let i = 1; i < years.length; i++) {
        if (years[i] === years[i-1] + 1) {
          targetCompanyId = companyId
          targetYears = [years[i-1], years[i]]
          break
        }
      }
    }
    if (targetCompanyId) break
  }

  if (!targetCompanyId) {
    console.log('\nNo company with consecutive fiscal years found')
    return
  }

  const companyPeriods = byCompany[targetCompanyId]
  const companyName = companyPeriods[0].company.name
  console.log('\n\nAnalyzing: ' + companyName + ' (FY' + targetYears[0] + ' and FY' + targetYears[1] + ')')

  const priorYear = companyPeriods.find(p => p.fiscalYear === targetYears[0])
  const currentYear = companyPeriods.find(p => p.fiscalYear === targetYears[1])

  console.log('\n\n========== FINANCIAL DATA ==========')

  for (const p of [priorYear, currentYear].filter(Boolean)) {
    if (!p) continue
    console.log('\n======= FY' + p.fiscalYear + ' =======')
    if (p.incomeStatement) {
      const is = p.incomeStatement
      console.log('\nIncome Statement:')
      console.log('  Gross Revenue:      ' + fmt(Number(is.grossRevenue)))
      console.log('  COGS:               ' + fmt(Number(is.cogs)))
      console.log('  Total Expenses:     ' + fmt(Number(is.operatingExpenses)))
      console.log('  EBITDA:             ' + fmt(Number(is.ebitda)))
      console.log('  Depreciation:       ' + fmt(Number(is.depreciation || 0)))
      console.log('  Amortization:       ' + fmt(Number(is.amortization || 0)))
      console.log('  Interest:           ' + fmt(Number(is.interestExpense || 0)))
      console.log('  Taxes:              ' + fmt(Number(is.taxExpense || 0)))
    }
    if (p.balanceSheet) {
      const bs = p.balanceSheet
      console.log('\nBalance Sheet:')
      console.log('  Cash:               ' + fmt(Number(bs.cash)))
      console.log('  A/R:                ' + fmt(Number(bs.accountsReceivable)))
      console.log('  Inventory:          ' + fmt(Number(bs.inventory)))
      console.log('  Prepaid:            ' + fmt(Number(bs.prepaidExpenses)))
      console.log('  Other Current:      ' + fmt(Number(bs.otherCurrentAssets)))
      console.log('  PP&E Gross:         ' + fmt(Number(bs.ppeGross)))
      console.log('  Accum Deprec:       ' + fmt(Number(bs.accumulatedDepreciation)))
      console.log('  Intangibles:        ' + fmt(Number(bs.intangibleAssets)))
      console.log('  Other LT Assets:    ' + fmt(Number(bs.otherLongTermAssets)))
      console.log('  ---')
      console.log('  A/P:                ' + fmt(Number(bs.accountsPayable)))
      console.log('  Accrued:            ' + fmt(Number(bs.accruedExpenses)))
      console.log('  Current LTD:        ' + fmt(Number(bs.currentPortionLtd)))
      console.log('  Other Current Liab: ' + fmt(Number(bs.otherCurrentLiabilities)))
      console.log('  Long Term Debt:     ' + fmt(Number(bs.longTermDebt)))
      console.log('  Deferred Tax:       ' + fmt(Number(bs.deferredTaxLiabilities)))
      console.log('  Other LT Liab:      ' + fmt(Number(bs.otherLongTermLiabilities)))
      console.log('  Owners Equity:      ' + fmt(Number(bs.ownersEquity)))
    }
  }

  // Calculate cash flow
  if (currentYear?.incomeStatement && currentYear?.balanceSheet && priorYear?.balanceSheet) {
    const is = currentYear.incomeStatement
    const bs = currentYear.balanceSheet
    const pbs = priorYear.balanceSheet

    console.log('\n\n========== CASH FLOW CALCULATION FOR FY' + currentYear.fiscalYear + ' ==========\n')

    // Net Income
    const depreciation = Number(is.depreciation || 0)
    const amortization = Number(is.amortization || 0)
    const interest = Number(is.interestExpense || 0)
    const taxes = Number(is.taxExpense || 0)
    const ebitda = Number(is.ebitda)
    const netIncome = ebitda - depreciation - amortization - interest - taxes

    console.log('OPERATING ACTIVITIES:')
    console.log('  EBITDA:                    ' + fmt(ebitda))
    console.log('  - Depreciation:            ' + fmt(depreciation))
    console.log('  - Amortization:            ' + fmt(amortization))
    console.log('  - Interest:                ' + fmt(interest))
    console.log('  - Taxes:                   ' + fmt(taxes))
    console.log('  = Net Income:              ' + fmt(netIncome))
    console.log('')
    console.log('  + Depreciation add-back:   ' + fmt(depreciation))
    console.log('  + Amortization add-back:   ' + fmt(amortization))

    // Working capital changes
    const arChange = Number(pbs.accountsReceivable) - Number(bs.accountsReceivable)
    const invChange = Number(pbs.inventory) - Number(bs.inventory)
    const prepaidChange = Number(pbs.prepaidExpenses) - Number(bs.prepaidExpenses)
    const otherCAChange = Number(pbs.otherCurrentAssets) - Number(bs.otherCurrentAssets)
    const apChange = Number(bs.accountsPayable) - Number(pbs.accountsPayable)
    const accruedChange = Number(bs.accruedExpenses) - Number(pbs.accruedExpenses)
    const otherCLChange = Number(bs.otherCurrentLiabilities) - Number(pbs.otherCurrentLiabilities)
    const deferredTaxChange = Number(bs.deferredTaxLiabilities) - Number(pbs.deferredTaxLiabilities)

    console.log('')
    console.log('  Working Capital Changes:')
    console.log('    A/R (' + fmt(Number(pbs.accountsReceivable)) + ' -> ' + fmt(Number(bs.accountsReceivable)) + '): ' + fmt(arChange))
    console.log('    Inventory (' + fmt(Number(pbs.inventory)) + ' -> ' + fmt(Number(bs.inventory)) + '): ' + fmt(invChange))
    console.log('    Prepaid: ' + fmt(prepaidChange))
    console.log('    Other CA: ' + fmt(otherCAChange))
    console.log('    A/P (' + fmt(Number(pbs.accountsPayable)) + ' -> ' + fmt(Number(bs.accountsPayable)) + '): ' + fmt(apChange))
    console.log('    Accrued: ' + fmt(accruedChange))
    console.log('    Other CL: ' + fmt(otherCLChange))
    console.log('    Deferred Tax: ' + fmt(deferredTaxChange))

    const cashFromOps = netIncome + depreciation + amortization +
      arChange + invChange + prepaidChange + otherCAChange +
      apChange + accruedChange + otherCLChange + deferredTaxChange

    console.log('')
    console.log('  CASH FROM OPERATIONS:      ' + fmt(cashFromOps))

    // Investing
    const capex = -(Number(bs.ppeGross) - Number(pbs.ppeGross))
    const intangChange = -(Number(bs.intangibleAssets) - Number(pbs.intangibleAssets))
    const otherLTAChange = -(Number(bs.otherLongTermAssets) - Number(pbs.otherLongTermAssets))
    const cashFromInvesting = capex + intangChange + otherLTAChange

    console.log('')
    console.log('INVESTING ACTIVITIES:')
    console.log('  CapEx (PP&E ' + fmt(Number(pbs.ppeGross)) + ' -> ' + fmt(Number(bs.ppeGross)) + '): ' + fmt(capex))
    console.log('  Intangibles change:        ' + fmt(intangChange))
    console.log('  Other LT Assets change:    ' + fmt(otherLTAChange))
    console.log('  CASH FROM INVESTING:       ' + fmt(cashFromInvesting))

    // Financing
    const currentLTDChange = Number(bs.currentPortionLtd) - Number(pbs.currentPortionLtd)
    const ltDebtChange = Number(bs.longTermDebt) - Number(pbs.longTermDebt)
    const otherLTLChange = Number(bs.otherLongTermLiabilities) - Number(pbs.otherLongTermLiabilities)
    const equityChange = Number(bs.ownersEquity) - Number(pbs.ownersEquity)
    const cashFromFinancing = currentLTDChange + ltDebtChange + otherLTLChange + equityChange

    console.log('')
    console.log('FINANCING ACTIVITIES:')
    console.log('  Current LTD change:        ' + fmt(currentLTDChange))
    console.log('  Long-term Debt change:     ' + fmt(ltDebtChange))
    console.log('  Other LT Liab change:      ' + fmt(otherLTLChange))
    console.log('  Owner Equity change (' + fmt(Number(pbs.ownersEquity)) + ' -> ' + fmt(Number(bs.ownersEquity)) + '): ' + fmt(equityChange))
    console.log('  CASH FROM FINANCING:       ' + fmt(cashFromFinancing))

    // Summary
    const netCashChange = cashFromOps + cashFromInvesting + cashFromFinancing
    const freeCashFlow = cashFromOps - Math.abs(capex)

    console.log('')
    console.log('========== SUMMARY ==========')
    console.log('  Cash from Operations:      ' + fmt(cashFromOps))
    console.log('  Cash from Investing:       ' + fmt(cashFromInvesting))
    console.log('  Cash from Financing:       ' + fmt(cashFromFinancing))
    console.log('  NET CHANGE IN CASH:        ' + fmt(netCashChange))
    console.log('')
    console.log('  FREE CASH FLOW:            ' + fmt(freeCashFlow))
    console.log('    = Cash from Ops ' + fmt(cashFromOps) + ' - |CapEx| ' + fmt(Math.abs(capex)))
  } else {
    console.log('\nMissing data for cash flow calculation:')
    if (!currentYear?.incomeStatement) console.log('  - Current Year Income Statement')
    if (!currentYear?.balanceSheet) console.log('  - Current Year Balance Sheet')
    if (!priorYear?.balanceSheet) console.log('  - Prior Year Balance Sheet')
  }
}

main().catch(console.error).finally(() => {
  prisma.$disconnect()
  pool.end()
})
