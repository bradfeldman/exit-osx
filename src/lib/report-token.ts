import crypto from 'crypto'

const SECRET = process.env.REPORT_SHARE_SECRET || process.env.NEXTAUTH_SECRET || 'exit-osx-report-share-default'

/**
 * Generate a signed share token for a company's exit readiness report.
 * Token format: base64url(companyId).base64url(hmac)
 * No DB migration needed — token is computed from companyId + server secret.
 */
export function generateReportToken(companyId: string): string {
  const payload = Buffer.from(companyId).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(companyId)
    .digest('base64url')
  return `${payload}.${signature}`
}

/**
 * Verify and decode a report share token.
 * Returns the companyId if valid, null if tampered.
 */
export function verifyReportToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts

  try {
    const companyId = Buffer.from(payload, 'base64url').toString('utf-8')
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(companyId)
      .digest('base64url')

    if (signature !== expectedSignature) return null
    return companyId
  } catch {
    return null
  }
}
