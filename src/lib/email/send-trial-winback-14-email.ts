import { sendEmail, getUnsubscribeLink } from './service'

interface TrialWinback14EmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  briScore: number
  valueGap: number
  tasksPending: number
}

export async function sendTrialWinback14Email(params: TrialWinback14EmailParams) {
  const { userId, email, name, companyName, briScore, valueGap, tasksPending } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const formattedGap = valueGap >= 1000000
    ? `$${(valueGap / 1000000).toFixed(1)}M`
    : `$${Math.round(valueGap / 1000).toLocaleString()}K`
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = 'Your exit readiness may have drifted'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Win-Back - Exit OSx</title>
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
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #1D1D1F; text-align: center; letter-spacing: -0.5px;">
                It's been 2 weeks, ${firstName}
              </h1>

              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Since your trial ended, ${companyName}'s exit readiness has been unmonitored. Risks don't pause when you stop looking.
              </p>

              <!-- Drift Risk -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #92400E;">
                      What drifts without monitoring:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #92400E;">&#9888;&#65039; Financial statements go stale</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #92400E;">&#9888;&#65039; Customer concentration shifts unnoticed</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #92400E;">&#9888;&#65039; Documents expire or fall out of date</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #92400E;">&#9888;&#65039; Key person risks compound</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Stats reminder -->
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #666666; text-align: center;">
                When you left, your BRI was <strong>${roundedBRI}</strong>, value gap was <strong>${formattedGap}</strong>, and <strong>${tasksPending} tasks</strong> were pending. It's likely worse now.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0071E3;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      See Where You Stand
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Proof -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F0FDF4; border-top: 1px solid #BBF7D0;">
              <p style="margin: 0; font-size: 14px; color: #166534; text-align: center;">
                <strong>Businesses that track readiness monthly</strong> sell for 15-30% more than those that don't.
                <span style="display: block; margin-top: 4px; font-size: 12px; color: #22C55E;">&mdash; Exit Planning Institute</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #BBBBBB;">
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from these emails
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail({
    userId,
    emailType: 'TRIAL_WINBACK_14',
    to: email,
    subject,
    html,
  })
}
