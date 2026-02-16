/**
 * Slack Alert Utility — Lightweight webhook-based alerting
 *
 * Sends structured alerts to a Slack channel via incoming webhook.
 * Used for broken API calls, integration failures, and critical errors.
 *
 * Configuration: Set SLACK_WEBHOOK_URL in environment variables.
 * To get a webhook URL: Slack → Apps → Incoming Webhooks → Add to Channel
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

type AlertSeverity = 'critical' | 'warning' | 'info'

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  critical: ':rotating_light:',
  warning: ':warning:',
  info: ':information_source:',
}

interface SlackAlert {
  severity: AlertSeverity
  title: string
  message: string
  context?: Record<string, string | number | boolean | null>
}

/**
 * Send an alert to the configured Slack channel.
 * Non-blocking — failures are logged but never thrown.
 */
export async function sendSlackAlert(alert: SlackAlert): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return // Silently skip if not configured

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
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      console.error('[Slack] Alert delivery failed:', response.status)
    }
  } catch (err) {
    console.error('[Slack] Alert delivery error:', err instanceof Error ? err.message : String(err))
  }
}

/**
 * Alert on API route failures. Call from catch blocks in critical API routes.
 */
export function alertApiFailure(route: string, error: unknown, context?: Record<string, string | number | boolean | null>): void {
  const message = error instanceof Error ? error.message : String(error)
  sendSlackAlert({
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
  sendSlackAlert({
    severity: 'warning',
    title: `Integration Failure: ${provider}`,
    message,
    context: { provider, ...context },
  }).catch(() => {}) // Fire and forget
}
