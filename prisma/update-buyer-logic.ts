/**
 * Updates buyerLogic for all 22 onboarding questions.
 * Run: npx tsx prisma/update-buyer-logic.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
})

const BUYER_LOGIC_MAP: Record<string, string> = {
  // FINANCIAL (5)
  'consistent has your revenue': "Buyers discount unpredictable revenue — volatile swings signal risk.",
  'revenue comes from recurri': "Buyers pay premiums for recurring revenue — it de-risks their investment.",
  'diversified is your customer': "Buyers see concentration risk when revenue depends on too few customers.",
  'financial records': "Buyers pay less when financial records lack depth or consistency.",
  'gross profit margin': "Lower margins signal pricing weakness and reduce what buyers will pay.",

  // TRANSFERABILITY (4)
  'dependent is the business on you': "Buyers won't pay full price for a business that can't run without the owner.",
  'management team': "Buyers need confidence the business will thrive after the founder leaves.",
  'documented are your business': "Undocumented processes mean hidden knowledge that walks out the door.",
  'customer relationships': "Personal customer relationships create flight risk that buyers price in.",

  // OPERATIONAL (4)
  'scalable is your': "Buyers pay more for businesses that can grow revenue without proportional cost increases.",
  'technology': "Aging technology creates hidden costs that buyers will deduct from their offer.",
  'employee retention': "High turnover signals operational problems and increases post-acquisition risk.",
  'vendor': "Informal vendor relationships create supply chain risk that buyers factor into pricing.",
  'supplier': "Informal vendor relationships create supply chain risk that buyers factor into pricing.",

  // MARKET (3)
  'growth trajectory': "Buyers pay premiums for businesses in growing markets with tailwinds.",
  'competitive position': "Buyers value defensible positions — commoditized businesses get lower multiples.",
  'proprietary': "Proprietary assets create barriers to entry that directly increase valuation.",

  // LEGAL_TAX (3)
  'corporate structure': "Complex structures slow deals down and create risk buyers will discount.",
  'contracts': "Non-transferable or expired agreements can block or delay a sale.",
  'licenses': "Non-transferable or expired agreements can block or delay a sale.",
  'litigation': "Pending legal issues scare buyers — many will walk away entirely.",
  'disputes': "Pending legal issues scare buyers — many will walk away entirely.",

  // PERSONAL (3)
  'exit timeline': "Unclear timelines create urgency mismatches that weaken your negotiating position.",
  'separated personal': "Commingled finances complicate due diligence and slow the transaction.",
  'key employees aware': "Uninformed key employees create flight risk that buyers will price into the deal.",
}

function findBuyerLogic(questionText: string): string | null {
  const lower = questionText.toLowerCase()
  for (const [keyword, logic] of Object.entries(BUYER_LOGIC_MAP)) {
    if (lower.includes(keyword)) {
      return logic
    }
  }
  return null
}

async function main() {
  console.log('Fetching all active questions...')
  const questions = await prisma.question.findMany({
    where: { isActive: true },
    orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }],
  })

  console.log(`Found ${questions.length} active questions\n`)

  let updated = 0
  let skipped = 0

  for (const q of questions) {
    const buyerLogic = findBuyerLogic(q.questionText)

    if (buyerLogic) {
      await prisma.question.update({
        where: { id: q.id },
        data: { buyerLogic },
      })
      console.log(`  ✓ [${q.briCategory}] "${q.questionText.substring(0, 50)}..." → "${buyerLogic.substring(0, 60)}..."`)
      updated++
    } else {
      console.log(`  ✗ [${q.briCategory}] "${q.questionText.substring(0, 50)}..." — no match found`)
      skipped++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
