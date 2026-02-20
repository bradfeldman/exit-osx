import { sendEmail, getUnsubscribeLink } from './service'

interface TrialMidpointEmailParams {
  userId: string
  email: string
  name?: string
  companyName: string
  briScore: number
  valueGap: number
  tasksPending: number
  trialEndsAt: Date
}

export async function sendTrialMidpointEmail(params: TrialMidpointEmailParams) {
  const { userId, email, name, companyName, briScore, valueGap, tasksPending, trialEndsAt } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const dashboardUrl = `${baseUrl}/dashboard`
  const firstName = name?.split(' ')[0] || 'there'
  const roundedBRI = Math.round(briScore * 100)
  const formattedGap = valueGap >= 1000000
    ? `$${(valueGap / 1000000).toFixed(1)}M`
    : `$${Math.round(valueGap / 1000).toLocaleString()}K`
  const endsFormatted = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const unsubscribeLink = await getUnsubscribeLink(userId)

  const subject = `${firstName}, have you explored your risk breakdown?`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Midpoint - Exit OSx</title>
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
              <!-- Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #DBEAFE; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 32px;">&#128269;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #1D1D1F; text-align: center; letter-spacing: -0.5px;">
                Your exit readiness snapshot
              </h1>

              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666666; text-align: center;">
                Here's where ${companyName} stands at the midpoint of your trial.
              </p>

              <!-- Stats -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #F9FAFB; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 33%; text-align: center; border-right: 1px solid #E5E7EB;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Buyer Readiness</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1D1D1F;">${roundedBRI}</p>
                        </td>
                        <td style="width: 33%; text-align: center; border-right: 1px solid #E5E7EB;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Value Gap</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #DC2626;">${formattedGap}</p>
                        </td>
                        <td style="width: 33%; text-align: center;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Tasks</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1D1D1F;">${tasksPending}</p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; color: #888888;">pending</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Value Insight -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 15px; color: #991B1B; line-height: 1.6;">
                      <strong>Your value gap is ${formattedGap}.</strong> That's the difference between what your business is worth today and what it could be worth with full readiness. Every task you complete helps close it.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0071E3;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View Your Risk Breakdown
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #0071E3; text-align: center; font-weight: 600;">
                4 days left in your trial &mdash; ends ${endsFormatted}
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
    emailType: 'TRIAL_MIDPOINT',
    to: email,
    subject,
    html,
  })
}
