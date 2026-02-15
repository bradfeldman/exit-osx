import { sendEmail, getUnsubscribeLink } from './service'

interface TrialExpiredEmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  briScore: number
  valueGap: number
  tasksPending: number
}

export async function sendTrialExpiredEmail(params: TrialExpiredEmailParams) {
  const { userId, email, name, companyName, briScore, valueGap, tasksPending } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const upgradeUrl = `${baseUrl}/settings/billing`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const formattedGap = valueGap >= 1000000
    ? `$${(valueGap / 1000000).toFixed(1)}M`
    : `$${Math.round(valueGap / 1000).toLocaleString()}K`
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = 'Your trial has ended'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Expired - Exit OSx</title>
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
              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Your trial has ended, ${firstName}
              </h1>

              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                ${companyName} has been moved to the Foundation plan. Here's what changed:
              </p>

              <!-- Two Column: Keep vs Locked -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <!-- What You Keep -->
                  <td style="width: 48%; vertical-align: top;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #166534;">&#9989; You keep:</p>
                          <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.8;">
                            BRI score (read-only)<br>
                            Basic valuation<br>
                            Company profile<br>
                            All your data
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="width: 4%;"></td>
                  <!-- What's Locked -->
                  <td style="width: 48%; vertical-align: top;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #991B1B;">&#128274; Now locked:</p>
                          <p style="margin: 0; font-size: 13px; color: #DC2626; line-height: 1.8;">
                            Risk breakdowns<br>
                            Action plan &amp; tasks<br>
                            Data room<br>
                            Financial sync<br>
                            Retirement model<br>
                            Signal detection
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Last Stats -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #F9FAFB; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #666666; text-align: center;">
                      Your last BRI was <strong>${roundedBRI}</strong> with a <strong>${formattedGap} value gap</strong> and <strong>${tasksPending} tasks</strong> still pending.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${upgradeUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Reactivate Full Access
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #888888; text-align: center;">
                Your data is safe. Upgrading instantly restores everything &mdash; no setup needed.
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
    emailType: 'TRIAL_EXPIRED',
    to: email,
    subject,
    html,
  })
}
