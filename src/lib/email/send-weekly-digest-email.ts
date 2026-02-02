import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface WeeklyDigestEmailParams {
  email: string
  name?: string
  companyName: string
  currentValue: number
  valueChange: number // positive = improved, negative = declined
  briScore: number
  briChange: number
  tasksCompleted: number
  tasksPending: number
  topTask: {
    title: string
    estimatedValue: number
  } | null
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

/**
 * Sends the weekly "Exit Pulse" digest email.
 * Shows progress, celebrates wins, and gives one clear next action.
 */
export async function sendWeeklyDigestEmail(params: WeeklyDigestEmailParams): Promise<{ success: boolean; error?: string }> {
  const { email, name, companyName, currentValue, valueChange, briScore, briChange, tasksCompleted, tasksPending, topTask } = params

  if (!resend) {
    console.warn('[Email] Resend not configured, skipping weekly digest email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)

  // Determine progress messaging
  const hasProgress = tasksCompleted > 0 || valueChange > 0 || briChange > 0
  const valueChangeColor = valueChange >= 0 ? '#10B981' : '#EF4444'
  const valueChangeIcon = valueChange >= 0 ? '&#9650;' : '&#9660;'
  const briChangeColor = briChange >= 0 ? '#10B981' : '#EF4444'
  const briChangeIcon = briChange >= 0 ? '&#9650;' : '&#9660;'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: hasProgress
        ? `Your Weekly Exit Pulse: ${tasksCompleted > 0 ? `${tasksCompleted} task${tasksCompleted > 1 ? 's' : ''} completed!` : `${companyName} Update`}`
        : `Your Weekly Exit Pulse: ${companyName}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Exit Pulse - Exit OSx</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 28px; font-weight: 700; color: #3D3D3D; letter-spacing: -0.5px;">Exit OS<span style="color: #B87333;">x</span></span>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #888888;">
                Weekly Exit Pulse
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 16px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #3D3D3D;">
                ${hasProgress ? `Great progress, ${firstName}!` : `Here's your week, ${firstName}`}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #666666;">
                Your exit readiness summary for ${companyName}
              </p>
            </td>
          </tr>

          <!-- Stats Row -->
          <tr>
            <td style="padding: 16px 40px 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Current Value -->
                  <td style="width: 50%; padding: 16px; background-color: #F9FAFB; border-radius: 12px 0 0 12px; border-right: 1px solid #E5E7EB;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      Estimated Value
                    </p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #3D3D3D;">
                      ${formatCurrency(currentValue)}
                    </p>
                    ${valueChange !== 0 ? `
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: ${valueChangeColor};">
                      <span style="font-family: Arial, sans-serif;">${valueChangeIcon}</span> ${formatCurrency(Math.abs(valueChange))} this week
                    </p>
                    ` : ''}
                  </td>
                  <!-- BRI Score -->
                  <td style="width: 50%; padding: 16px; background-color: #F9FAFB; border-radius: 0 12px 12px 0;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      Buyer Readiness
                    </p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #3D3D3D;">
                      ${roundedBRI}/100
                    </p>
                    ${briChange !== 0 ? `
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: ${briChangeColor};">
                      <span style="font-family: Arial, sans-serif;">${briChangeIcon}</span> ${Math.abs(Math.round(briChange * 100))} points this week
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Task Progress -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${tasksCompleted > 0 ? '#F0FDF4' : '#FEF3C7'}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 48px; vertical-align: top;">
                          <span style="font-size: 32px;">${tasksCompleted > 0 ? '&#127881;' : '&#128161;'}</span>
                        </td>
                        <td>
                          ${tasksCompleted > 0 ? `
                          <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #166534;">
                            ${tasksCompleted} task${tasksCompleted > 1 ? 's' : ''} completed this week!
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #22C55E;">
                            ${tasksPending} more to go. Keep the momentum!
                          </p>
                          ` : `
                          <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #92400E;">
                            ${tasksPending} tasks waiting for you
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #D97706;">
                            Small steps close big gaps. Start with just one.
                          </p>
                          `}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- This Week's Priority -->
          ${topTask ? `
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                This Week's Priority
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f0 0%, #ffffff 100%); border: 2px solid #B8733330; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #3D3D3D;">
                      ${topTask.title}
                    </p>
                    ${topTask.estimatedValue > 0 ? `
                    <p style="margin: 0; font-size: 14px; color: #10B981;">
                      Could add <strong>${formatCurrency(topTask.estimatedValue)}</strong> to your valuation
                    </p>
                    ` : ''}
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
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Market Insight -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F0FDF4; border-top: 1px solid #BBF7D0;">
              <p style="margin: 0; font-size: 14px; color: #166534; text-align: center;">
                <strong>Market insight:</strong> Buyers are paying premiums for prepared businesses. Every task you complete moves you closer to that premium.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #999999;">
                A Pasadena Private Financial Group Company
              </p>
              <p style="margin: 0; font-size: 11px; color: #BBBBBB;">
                <a href="${baseUrl}/unsubscribe" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from weekly updates
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

    console.log(`[Email] Sent weekly digest email to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send weekly digest email:', error)
    return { success: false, error: String(error) }
  }
}
