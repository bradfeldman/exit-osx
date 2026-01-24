import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { SAMPLE_CUSTOMER_CONCENTRATION_DESCRIPTION } from '../src/lib/playbook/rich-task-description'

async function updateTask() {
  const result = await prisma.task.updateMany({
    where: {
      title: 'Document customer concentration risk mitigation'
    },
    data: {
      richDescription: SAMPLE_CUSTOMER_CONCENTRATION_DESCRIPTION as object
    }
  })
  console.log('Updated', result.count, 'task(s)')
  await prisma.$disconnect()
}

updateTask().catch(console.error)
