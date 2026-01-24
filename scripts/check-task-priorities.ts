import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
  const { prisma } = await import('../src/lib/prisma')

  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      impactLevel: true,
      difficultyLevel: true,
      priorityRank: true,
      inActionPlan: true,
    }
  })

  console.log('Total tasks:', tasks.length)
  console.log('')

  // Count by impact level
  const byImpact: Record<string, number> = {}
  const byDifficulty: Record<string, number> = {}
  const byRank: Record<number, number> = {}

  for (const t of tasks) {
    byImpact[t.impactLevel || 'NULL'] = (byImpact[t.impactLevel || 'NULL'] || 0) + 1
    byDifficulty[t.difficultyLevel || 'NULL'] = (byDifficulty[t.difficultyLevel || 'NULL'] || 0) + 1
    byRank[t.priorityRank] = (byRank[t.priorityRank] || 0) + 1
  }

  console.log('By Impact Level:', byImpact)
  console.log('By Difficulty Level:', byDifficulty)
  console.log('By Priority Rank:', byRank)
  console.log('')

  // Show sample of tasks
  console.log('Sample tasks:')
  tasks.slice(0, 5).forEach(t => {
    console.log(`  - ${t.title.substring(0, 40)}... | Impact: ${t.impactLevel} | Difficulty: ${t.difficultyLevel} | Rank: ${t.priorityRank}`)
  })

  await prisma.$disconnect()
}

check()
