import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface DriftReportEmailParams {
  email: string
  name?: string
  companyName: string
  monthYear: string
  briScoreStart: number
  briScoreEnd: number
  valuationStart: number
  valuationEnd: number
  tasksCompleted: number
  signalsCount: number
  topSignals: { title: string; severity: string }[]
  summary: string
}

export async function sendDriftReportEmail(params: DriftReportEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping drift report email')
    return { success: false, error: 'Email service not configured' }
  }

  const {
    email,
    name,
    companyName,
    monthYear,
    briScoreStart,
    briScoreEnd,
    valuationStart,
    valuationEnd,
    tasksCompleted,
    signalsCount,
    topSignals,
    summary,
  } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const greeting = name ? `Hi ${name}` : 'Hi there'

  const briChange = briScoreEnd - briScoreStart
  const briDirection = briChange >= 0 ? 'up' : 'down'
  const briColor = briChange >= 0 ? '#16a34a' : '#dc2626'
  const briArrow = briChange >= 0 ? '&#9650;' : '&#9660;'

  const valuationChange = valuationEnd - valuationStart
  const valDirection = valuationChange >= 0 ? 'up' : 'down'
  const valColor = valuationChange >= 0 ? '#16a34a' : '#dc2626'
  const valArrow = valuationChange >= 0 ? '&#9650;' : '&#9660;'

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const signalRows = topSignals.slice(0, 3).map(s => {
    const color = s.severity === 'CRITICAL' ? '#dc2626' : s.severity === 'HIGH' ? '#ea580c' : '#ca8a04'
    return `<tr><td style="padding:4px 8px;font-size:14px;">${s.title}</td><td style="padding:4px 8px;font-size:12px;color:${color};font-weight:600;">${s.severity}</td></tr>`
  }).join('')

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: `Your ${companyName} Exit Pulse — ${monthYear} Drift Report`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:24px;margin-bottom:24px;">

  <div style="background:#1a1a2e;padding:32px 24px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;margin:0;">Monthly Drift Report</h1>
    <p style="color:#a1a1aa;font-size:14px;margin:8px 0 0;">${companyName} — ${monthYear}</p>
  </div>

  <div style="padding:24px;">
    <p style="font-size:15px;color:#374151;line-height:1.6;">${greeting},</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">${summary}</p>

    <div style="display:flex;gap:16px;margin:24px 0;">
      <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;margin:0;">BRI Score</p>
        <p style="font-size:28px;font-weight:700;margin:4px 0;color:#111827;">${Math.round(briScoreEnd * 100)}</p>
        <p style="font-size:13px;color:${briColor};margin:0;font-weight:600;">
          ${briArrow} ${Math.abs(Math.round(briChange * 100))} pts ${briDirection}
        </p>
      </div>
      <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;margin:0;">Valuation</p>
        <p style="font-size:28px;font-weight:700;margin:4px 0;color:#111827;">${formatCurrency(valuationEnd)}</p>
        <p style="font-size:13px;color:${valColor};margin:0;font-weight:600;">
          ${valArrow} ${formatCurrency(Math.abs(valuationChange))} ${valDirection}
        </p>
      </div>
    </div>

    <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
      <div style="display:flex;justify-content:space-around;text-align:center;">
        <div>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:0;">${tasksCompleted}</p>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Tasks Completed</p>
        </div>
        <div>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:0;">${signalsCount}</p>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Signals Detected</p>
        </div>
      </div>
    </div>

    ${topSignals.length > 0 ? `
    <div style="margin:24px 0;">
      <h3 style="font-size:14px;color:#374151;margin:0 0 8px;">Top Signals</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${signalRows}
      </table>
    </div>` : ''}

    <div style="text-align:center;margin:32px 0 16px;">
      <a href="${baseUrl}/dashboard/drift-report" style="display:inline-block;background:#B87333;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
        View Full Report
      </a>
    </div>
  </div>

  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      Exit OSx — Building exit-ready businesses
    </p>
  </div>
</div>
</body>
</html>`,
    })

    console.log(`[Email] Sent drift report email to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send drift report email:', error)
    return { success: false, error: String(error) }
  }
}
