import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Find Wednesday One company
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Wednesday', mode: 'insensitive' } }
  })

  if (!company) {
    console.log('Company not found')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  console.log('Found company:', company.name, company.id)

  // Get the latest snapshot for the value gap
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' }
  })

  if (!snapshot) {
    console.log('No snapshot found')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  const valueGap = Number(snapshot.valueGap)
  console.log('Value Gap from snapshot:', valueGap.toFixed(2))

  // Get all active tasks
  const tasks = await prisma.task.findMany({
    where: {
      companyId: company.id,
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    }
  })

  console.log('Active tasks:', tasks.length)

  if (tasks.length === 0) {
    console.log('No active tasks to renormalize')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  // Calculate current total
  const currentTotal = tasks.reduce((sum, t) => sum + Number(t.rawImpact), 0)
  console.log('Current total rawImpact:', currentTotal.toFixed(2))

  // Get completed tasks value
  const completedTasks = await prisma.task.findMany({
    where: {
      companyId: company.id,
      status: 'COMPLETED'
    }
  })
  const completedValue = completedTasks.reduce((sum, t) => sum + Number(t.rawImpact), 0)
  console.log('Completed value:', completedValue.toFixed(2))

  // Remaining gap to distribute
  const remainingGap = Math.max(0, valueGap - completedValue)
  console.log('Remaining gap to distribute:', remainingGap.toFixed(2))

  // Renormalize each task
  const effortMultipliers: Record<string, number> = {
    MINIMAL: 0.5,
    LOW: 1,
    MODERATE: 2,
    HIGH: 4,
    MAJOR: 8,
  }

  let updated = 0
  for (const task of tasks) {
    const proportion = currentTotal > 0 ? Number(task.rawImpact) / currentTotal : 1 / tasks.length
    const newRawImpact = proportion * remainingGap
    const effortMult = effortMultipliers[task.effortLevel] || 2
    const newNormalizedValue = newRawImpact / effortMult

    await prisma.task.update({
      where: { id: task.id },
      data: {
        rawImpact: newRawImpact,
        normalizedValue: newNormalizedValue
      }
    })
    updated++
    console.log(`  Updated task ${task.id.substring(0, 10)}...: ${Number(task.rawImpact).toFixed(2)} -> ${newRawImpact.toFixed(2)}`)
  }

  console.log('\n=== Summary ===')
  console.log('Tasks renormalized:', updated)
  console.log('New total rawImpact:', remainingGap.toFixed(2))
  console.log('Value gap:', valueGap.toFixed(2))
  console.log('Match:', Math.abs(remainingGap - (valueGap - completedValue)) < 1 ? 'YES' : 'NO')

  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
