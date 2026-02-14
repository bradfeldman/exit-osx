import crypto from 'crypto'

const SECRET = process.env.TASK_SHARE_SECRET || process.env.NEXTAUTH_SECRET || 'exit-osx-task-share-default'

/**
 * Generate a signed share token for a task.
 * Token format: base64url(taskId).base64url(hmac)
 * No DB migration needed — token is computed from taskId + server secret.
 */
export function generateTaskShareToken(taskId: string): string {
  const payload = Buffer.from(taskId).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(taskId)
    .digest('base64url')
  return `${payload}.${signature}`
}

/**
 * Verify and decode a task share token.
 * Returns the taskId if valid, null if tampered.
 */
export function verifyTaskShareToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts

  try {
    const taskId = Buffer.from(payload, 'base64url').toString('utf-8')
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(taskId)
      .digest('base64url')

    if (signature !== expectedSignature) return null
    return taskId
  } catch {
    return null
  }
}
