import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log DATABASE_URL info for debugging (masked)
const dbUrl = process.env.DATABASE_URL || ''
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@')
console.log('[Prisma] DATABASE_URL configured:', maskedUrl ? maskedUrl : 'NOT SET')
console.log('[Prisma] URL length:', dbUrl.length)
console.log('[Prisma] Starts with postgresql://', dbUrl.startsWith('postgresql://'))
console.log('[Prisma] Contains port 5432:', dbUrl.includes(':5432'))
console.log('[Prisma] Contains port 6543:', dbUrl.includes(':6543'))
console.log('[Prisma] Contains pgbouncer:', dbUrl.includes('pgbouncer'))

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'info', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
