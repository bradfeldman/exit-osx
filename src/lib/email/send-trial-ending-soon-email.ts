import { sendEmail, getUnsubscribeLink } from './service'

interface TrialEndingSoonEmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  briScore: number
  valueGap: number
  tasksPending: number
  trialEndsAt: Date
}

export async function sendTrialEndingSoonEmail(params: TrialEndingSoonEmailParams) {
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

  const subject = 'Your trial ends in 2 days'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Ending Soon - Exit OSx</title>
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
              <!-- Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #FEF3C7; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 32px;">&#9203;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                2 days left, ${firstName}
              </h1>

              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Your Deal Room trial for ${companyName} ends on <strong>${endsFormatted}</strong>. Here's what you'll lose access to:
              </p>

              <!-- What You'll Lose -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #991B1B;">
                      Features you'll lose:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #DC2626;">&#10060; Risk diagnostic with category breakdowns</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #DC2626;">&#10060; Personalized action plan &amp; task tracking</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #DC2626;">&#10060; Data room for due diligence prep</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #DC2626;">&#10060; QuickBooks financial sync</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #DC2626;">&#10060; Retirement readiness model</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #DC2626;">&#10060; Signal detection &amp; drift monitoring</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What Stays -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #166534;">
                      What stays on Foundation:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #166534;">&#9989; Your BRI score (read-only)</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #166534;">&#9989; Basic valuation estimate</td></tr>
                      <tr><td style="padding: 6px 0; font-size: 14px; color: #166534;">&#9989; Company profile</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Stats reminder -->
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666; text-align: center;">
                Your current BRI is <strong>${roundedBRI}</strong> with a <strong>${formattedGap} value gap</strong> and <strong>${tasksPending} tasks</strong> pending.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 14px; color: #888888; text-align: center;">
                Keep full access for <strong>$99/month</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${upgradeUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Upgrade Now
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
    emailType: 'TRIAL_ENDING_SOON',
    to: email,
    subject,
    html,
  })
}
