import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const counts = await prisma.question.groupBy({
    by: ['briCategory'],
    where: { isActive: true },
    _count: true
  })

  const total = await prisma.question.count({ where: { isActive: true } })

  console.log('\nQuestions by Category:')
  console.log('----------------------------------------')
  counts.sort((a, b) => a.briCategory.localeCompare(b.briCategory))
  counts.forEach(c => {
    const category = c.briCategory.padEnd(25)
    console.log('  ' + category + c._count)
  })
  console.log('----------------------------------------')
  console.log('  ' + 'TOTAL'.padEnd(25) + total)
}

main()
  .finally(() => prisma.$disconnect())
