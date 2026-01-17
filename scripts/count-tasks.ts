import { prisma } from '../src/lib/prisma'

async function main() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, _count: { select: { tasks: true } } }
  })
  
  console.log('Task counts by company:')
  for (const c of companies) {
    console.log(`  ${c.name}: ${c._count.tasks} tasks`)
  }
  
  const totalTasks = await prisma.task.count()
  console.log(`\nTotal tasks in system: ${totalTasks}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
