import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrismaClient() {
  // Reuse pool across invocations in serverless environment
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Conservative limit for serverless
      idleTimeoutMillis: 30000,
    })
  }
  const adapter = new PrismaPg(globalForPrisma.pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Always cache in globalThis for serverless environments
globalForPrisma.prisma = prisma
