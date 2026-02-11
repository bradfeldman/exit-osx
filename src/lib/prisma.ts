import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// SECURITY FIX (PROD-091 #4): Only enable query-level logging in development.
// In production, query logs can contain sensitive financial data (P&L, balance sheets),
// PII, and legal document metadata. Only errors and warnings are logged in production.
const prismaLogConfig =
  process.env.NODE_ENV === 'production'
    ? [
        { level: 'error' as const, emit: 'stdout' as const },
        { level: 'warn' as const, emit: 'stdout' as const },
      ]
    : [
        { level: 'query' as const, emit: 'event' as const },
        { level: 'error' as const, emit: 'stdout' as const },
        { level: 'info' as const, emit: 'stdout' as const },
        { level: 'warn' as const, emit: 'stdout' as const },
      ]

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
