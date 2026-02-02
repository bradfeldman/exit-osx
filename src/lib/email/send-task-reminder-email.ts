import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface TaskReminderEmailParams {
  email: string
  name?: string
  companyName: string
  valueGap: number
  daysSinceOnboarding: number
  topTask: {
    title: string
    category: string
    estimatedValue: number
  }
  pendingTaskCount: number
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
 * Sends the "Your Gap is Growing" reminder email.
 * Triggered on Day 3 if no tasks have been completed.
 */
export async function sendTaskReminderEmail(params: TaskReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { email, name, companyName, valueGap, daysSinceOnboarding, topTask, pendingTaskCount } = params

  if (!resend) {
    console.warn('[Email] Resend not configured, skipping task reminder email')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to: email,
      subject: `${firstName}, your ${formatCurrency(valueGap)} gap is still waiting`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Gap is Growing - Exit OSx</title>
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
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Urgency Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #FEF3C7; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px;">&#9203;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Hey ${firstName}, it's been ${daysSinceOnboarding} days...
              </h1>

              <!-- The hook - loss framing -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Your <strong style="color: #B87333;">${formatCurrency(valueGap)} value gap</strong> at ${companyName} is still sitting there, waiting.
              </p>

              <!-- Stat callout -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 36px; font-weight: 700; color: #DC2626;">
                      80%
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #991B1B;">
                      of businesses that go to market <strong>fail to sell</strong>
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #B91C1C;">
                      because owners discovered gaps too late.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- The one thing to do -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
                Your #1 Priority
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background: linear-gradient(135deg, #f8f4f0 0%, #ffffff 100%); border: 2px solid #B8733330; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #3D3D3D;">
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

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Close This Gap Now
                    </a>
                  </td>
                </tr>
              </table>

              ${pendingTaskCount > 1 ? `
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                Plus ${pendingTaskCount - 1} more actions waiting for you
              </p>
              ` : ''}
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
                <a href="${baseUrl}/unsubscribe" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from reminder emails
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

    console.log(`[Email] Sent task reminder email to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('[Email] Failed to send task reminder email:', error)
    return { success: false, error: String(error) }
  }
}
