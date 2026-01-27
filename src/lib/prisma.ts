import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

// Create a pool with SSL enabled for Supabase
function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Single connection per serverless instance
    idleTimeoutMillis: 10000, // Close idle connections quickly
    connectionTimeoutMillis: 10000, // Fail fast on connection issues
    ssl: {
      rejectUnauthorized: false, // Required for Supabase pooler
    },
  })
}

// In development, cache the client to avoid too many connections
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: pg.Pool | undefined
}

function createPrismaClient() {
  // In production (serverless), create fresh pool each time
  // In development, reuse the pool
  let pool: pg.Pool
  if (process.env.NODE_ENV === 'production') {
    pool = createPool()
  } else {
    if (!globalForPrisma.pool) {
      globalForPrisma.pool = createPool()
    }
    pool = globalForPrisma.pool
  }

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
