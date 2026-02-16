/**
 * Chat Webhook Alert Utility — Lightweight webhook-based alerting
 *
 * Works with both Slack and Google Chat incoming webhooks.
 * Both platforms accept { "text": "message" } payloads and *bold* markdown.
 *
 * Configuration: Set CHAT_WEBHOOK_URL in environment variables.
 *   - Slack:       https://hooks.slack.com/services/...
 *   - Google Chat: https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=...
 */

const CHAT_WEBHOOK_URL = process.env.CHAT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL

type AlertSeverity = 'critical' | 'warning' | 'info'

// Unicode emojis work in both Slack and Google Chat
const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: '\u{1F6A8}', // red light
  warning: '\u{26A0}\u{FE0F}', // warning sign
  info: '\u{2139}\u{FE0F}', // info
}

interface ChatAlert {
  severity: AlertSeverity
  title: string
  message: string
  context?: Record<string, string | number | boolean | null>
}

/**
 * Send an alert to the configured webhook (Slack or Google Chat).
 * Non-blocking — failures are logged but never thrown.
 */
export async function sendAlert(alert: ChatAlert): Promise<void> {
  if (!CHAT_WEBHOOK_URL) return // Silently skip if not configured

  const emoji = SEVERITY_EMOJI[alert.severity]
  const contextLines = alert.context
    ? Object.entries(alert.context)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `• *${k}:* ${v}`)
        .join('\n')
    : ''

  const text = [
    `${emoji} *${alert.title}*`,
    alert.message,
    contextLines ? `\n${contextLines}` : '',
    `_${new Date().toISOString()}_`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await fetch(CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      console.error('[Alerts] Webhook delivery failed:', response.status)
    }
  } catch (err) {
    console.error('[Alerts] Webhook delivery error:', err instanceof Error ? err.message : String(err))
  }
}

// Keep backward-compatible alias
export const sendSlackAlert = sendAlert

/**
 * Alert on API route failures. Call from catch blocks in critical API routes.
 */
export function alertApiFailure(route: string, error: unknown, context?: Record<string, string | number | boolean | null>): void {
  const message = error instanceof Error ? error.message : String(error)
  sendAlert({
    severity: 'critical',
    title: `API Failure: ${route}`,
    message,
    context: { route, ...context },
  }).catch(() => {}) // Fire and forget
}

/**
 * Alert on integration failures (QuickBooks, etc.)
 */
export function alertIntegrationFailure(provider: string, error: unknown, context?: Record<string, string | number | boolean | null>): void {
  const message = error instanceof Error ? error.message : String(error)
  sendAlert({
    severity: 'warning',
    title: `Integration Failure: ${provider}`,
    message,
    context: { provider, ...context },
  }).catch(() => {}) // Fire and forget
}
