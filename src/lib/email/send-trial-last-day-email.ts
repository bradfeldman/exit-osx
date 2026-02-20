import { sendEmail, getUnsubscribeLink } from './service'

interface TrialLastDayEmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  briScore: number
  valueGap: number
  tasksPending: number
  trialEndsAt: Date
}

export async function sendTrialLastDayEmail(params: TrialLastDayEmailParams) {
  const { userId, email, name, companyName, briScore, valueGap, tasksPending, trialEndsAt } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const upgradeUrl = `${baseUrl}/settings/billing`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const formattedGap = valueGap >= 1000000
    ? `$${(valueGap / 1000000).toFixed(1)}M`
    : `$${Math.round(valueGap / 1000).toLocaleString()}K`
  const endsFormatted = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = 'Final notice: Your trial ends tomorrow'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Last Day - Exit OSx</title>
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
              <!-- Red Warning Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #FEF2F2; border: 2px solid #EF4444; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <span style="font-size: 36px;">&#9888;&#65039;</span>
                    <h2 style="margin: 12px 0 8px 0; font-size: 22px; font-weight: 700; color: #991B1B;">
                      Your trial ends tomorrow
                    </h2>
                    <p style="margin: 0; font-size: 15px; color: #DC2626;">
                      ${companyName} will be downgraded to Foundation on ${endsFormatted}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Impact Stats -->
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1D1D1F; text-align: center; font-weight: 600;">
                Here's what's at stake, ${firstName}:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #F9FAFB; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 33%; text-align: center; border-right: 1px solid #E5E7EB;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Buyer Readiness</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1D1D1F;">${roundedBRI}</p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #DC2626;">will freeze</p>
                        </td>
                        <td style="width: 33%; text-align: center; border-right: 1px solid #E5E7EB;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Value Gap</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #DC2626;">${formattedGap}</p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #DC2626;">unmonitored</p>
                        </td>
                        <td style="width: 33%; text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Tasks</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1D1D1F;">${tasksPending}</p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #DC2626;">will lock</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Large CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 10px; background-color: #0071E3;">
                    <a href="${upgradeUrl}" target="_blank" style="display: inline-block; padding: 20px 56px; font-size: 18px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      Upgrade Before It's Too Late
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                $99/month &mdash; cancel anytime. Your data and progress are preserved.
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
                <a href="${unsubscribeLink}" style="color: #BBBBBB; text-decoration: underline;">Unsubscribe</a> from trial emails
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
    emailType: 'TRIAL_LAST_DAY',
    to: email,
    subject,
    html,
  })
}
