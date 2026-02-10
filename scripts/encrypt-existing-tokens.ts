/**
 * One-time migration script: encrypt existing plaintext OAuth tokens.
 *
 * Run after deploying the encryption changes:
 *   npx tsx scripts/encrypt-existing-tokens.ts
 *
 * Requires TOKEN_ENCRYPTION_KEY env var to be set.
 */

import { PrismaClient } from '@prisma/client'
import { encryptToken, isEncrypted } from '../src/lib/security/token-encryption'

async function main() {
  const prisma = new PrismaClient()

  try {
    const integrations = await prisma.integration.findMany({
      select: {
        id: true,
        provider: true,
        accessToken: true,
        refreshToken: true,
      },
    })

    console.log(`Found ${integrations.length} integration(s) to check.`)

    let encrypted = 0
    let skipped = 0

    for (const integration of integrations) {
      const needsAccessEncrypt = integration.accessToken && !isEncrypted(integration.accessToken)
      const needsRefreshEncrypt = integration.refreshToken && !isEncrypted(integration.refreshToken)

      if (!needsAccessEncrypt && !needsRefreshEncrypt) {
        skipped++
        console.log(`  [SKIP] ${integration.id} (${integration.provider}) — already encrypted`)
        continue
      }

      const data: { accessToken?: string; refreshToken?: string } = {}
      if (needsAccessEncrypt && integration.accessToken) {
        data.accessToken = encryptToken(integration.accessToken)
      }
      if (needsRefreshEncrypt && integration.refreshToken) {
        data.refreshToken = encryptToken(integration.refreshToken)
      }

      await prisma.integration.update({
        where: { id: integration.id },
        data,
      })

      encrypted++
      console.log(`  [DONE] ${integration.id} (${integration.provider}) — tokens encrypted`)
    }

    console.log(`\nFinished. Encrypted: ${encrypted}, Skipped: ${skipped}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
