import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SignalAlertEmailParams {
  email: string
  name?: string
  companyName: string
  signalTitle: string
  signalDescription: string
  severity: string
  estimatedValueImpact: number | null
  category: string | null
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`
  }
  return `$${value.toLocaleString()}`
}

function formatCategory(category: string | null): string {
  if (!category) return 'General'
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Sends an immediate alert email for CRITICAL severity signals.
 * Limited to max 1 per company per 24 hours (caller enforces).
 */
export async function sendSignalAlertEmail(params: SignalAlertEmailParams): Promise<{ success: boolean; error?: string }> {
  const { email, name, companyName, signalTitle, signalDescription, severity, estimatedValueImpact, category } = params

  if (!resend) {
    console.warn('[Email] Resend not configured, skipping signal alert email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'

  const severityColor = severity === 'CRITICAL' ? '#DC2626' : severity === 'HIGH' ? '#EA580C' : '#CA8A04'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: `${companyName}: ${signalTitle}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signal Alert - Exit OSx</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 28px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.5px;">Exit OS<span style="color: #0071E3;">x</span></span>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #888888;">
                Signal Alert
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED'}; border: 1px solid ${severity === 'CRITICAL' ? '#FECACA' : '#FED7AA'}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <span style="display: inline-block; padding: 4px 12px; background-color: ${severityColor}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px;">
                      ${severity}
                    </span>
                    ${category ? `
                    <span style="display: inline-block; padding: 4px 12px; background-color: #F3F4F6; color: #6B7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px; margin-left: 8px;">
                      ${formatCategory(category)}
                    </span>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1D1D1F;">
                ${firstName}, ${severity === 'CRITICAL' ? 'a critical signal was detected' : 'an important signal was detected'}
              </h1>
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1D1D1F;">
                ${signalTitle}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #666666;">
                ${signalDescription}
              </p>
            </td>
          </tr>

          <!-- Value Impact -->
          ${estimatedValueImpact ? `
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">
                      Estimated Value Impact
                    </p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #92400E;">
                      ${estimatedValueImpact < 0 ? '-' : ''}${formatCurrency(Math.abs(estimatedValueImpact))}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0071E3;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #BBBBBB;">
                <a href="${baseUrl}/unsubscribe" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from alert emails
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })

    console.log(`[Email] Sent signal alert email to ${email} for "${signalTitle}"`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send signal alert email:', error)
    return { success: false, error: String(error) }
  }
}
