import { sendEmail } from './service'

interface VerificationCongratsEmailParams {
  userId: string
  email: string
  companyName: string
  companyId: string
  currentValue: number
  potentialValue: number
  valueGap: number
  briScore: number
  topRisk: {
    category: string
    label: string
    score: number
  }
  topTask: {
    title: string
    category: string
    estimatedImpact: number
  } | null
  reportToken: string
}

function getRiskLabel(score: number): string {
  if (score >= 75) return 'Low Risk'
  if (score >= 50) return 'Some Risk'
  if (score > 0) return 'High Risk'
  return 'At Risk'
}

function getRiskColor(score: number): string {
  if (score >= 75) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
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
 * Sends the "You're Verified" congrats email after email verification.
 * Includes the full onboarding report (same design as the old Day 0 email)
 * since this is now the user's first time seeing their results in email.
 */
export async function sendVerificationCongratsEmail(params: VerificationCongratsEmailParams): Promise<{ success: boolean; error?: string }> {
  const { userId, email, companyName, companyId, currentValue, potentialValue, valueGap, briScore, topRisk, topTask, reportToken } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const roundedBRI = Math.round(briScore)
  const briColor = roundedBRI >= 70 ? '#10B981' : roundedBRI >= 50 ? '#F59E0B' : '#EF4444'
  const briStatus = roundedBRI >= 70 ? 'Strong' : roundedBRI >= 50 ? 'Moderate' : 'Needs Work'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified - Exit OSx</title>
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

          <!-- Verified Badge -->
          <tr>
            <td style="padding: 32px 40px 16px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="width: 56px; height: 56px; background-color: #F0FDF4; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px; color: #10B981;">&#10003;</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #3D3D3D; letter-spacing: -0.5px;">
                Email Verified
              </h1>
              <p style="margin: 0; font-size: 16px; color: #666666;">
                You now have full access to Exit OSx.
              </p>
            </td>
          </tr>

          <!-- What's Unlocked -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #166534;">Now unlocked:</p>
                    <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.8;">
                      Detailed reports &bull; Team invites &bull; Task delegation &bull; Weekly digests &bull; Signal alerts
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section - Valuation -->
          <tr>
            <td style="padding: 24px 40px 40px 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">
                Your Exit Readiness Report
              </p>
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                ${companyName}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: rgba(255,255,255,0.6);">
                Based on your risk assessment
              </p>

              <p style="margin: 0 0 4px 0; font-size: 14px; color: rgba(255,255,255,0.7);">
                Current Estimated Value
              </p>
              <p style="margin: 0 0 20px 0; font-size: 48px; font-weight: 700; color: #ffffff; letter-spacing: -1px;">
                ${formatCurrency(currentValue)}
              </p>

              ${valueGap > 0 ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 24px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #FFFFFF;">
                      You could be worth <strong style="color: #FFFFFF;">${formatCurrency(potentialValue)}</strong>
                    </p>
                    <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.85);">
                      That's <strong>${formatCurrency(valueGap)}</strong> you're leaving on the table.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- BRI Score -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 70%;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      Buyer Readiness Index
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #666666;">
                      How attractive you are to buyers
                    </p>
                  </td>
                  <td style="text-align: right;">
                    <span style="display: inline-block; padding: 8px 16px; background-color: ${briColor}20; border-radius: 8px;">
                      <span style="font-size: 28px; font-weight: 700; color: ${briColor};">${roundedBRI}</span>
                      <span style="font-size: 14px; color: ${briColor};">/100</span>
                    </span>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: ${briColor}; font-weight: 600;">
                      ${briStatus}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Risk -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                Your Biggest Gap
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${getRiskColor(topRisk.score)}10; border: 1px solid ${getRiskColor(topRisk.score)}30; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #3D3D3D;">
                            ${topRisk.label}
                          </p>
                        </td>
                        <td style="text-align: right;">
                          <span style="display: inline-block; padding: 4px 12px; background-color: ${getRiskColor(topRisk.score)}20; border-radius: 20px; font-size: 13px; font-weight: 600; color: ${getRiskColor(topRisk.score)};">
                            ${getRiskLabel(topRisk.score)}
                          </span>
                        </td>
                      </tr>
                    </table>
                    <div style="background-color: ${getRiskColor(topRisk.score)}20; border-radius: 4px; height: 8px; margin-bottom: 12px;">
                      <div style="background-color: ${getRiskColor(topRisk.score)}; border-radius: 4px; height: 8px; width: ${Math.max(topRisk.score, 8)}%;"></div>
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #666666;">
                      This is the area where focused improvement will have the biggest impact on your valuation.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- #1 Priority Task -->
          ${topTask ? `
          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f4f0 0%, #ffffff 100%); border: 2px solid #B8733330; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: #B87333; padding: 6px 12px; border-radius: 20px;">
                          <span style="font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                            Your #1 Priority
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #3D3D3D;">
                      ${topTask.title}
                    </p>

                    ${topTask.estimatedImpact > 0 ? `
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #10B981;">
                      Could add <strong>${formatCurrency(topTask.estimatedImpact)}</strong> to your valuation
                    </p>
                    ` : ''}

                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius: 8px; background-color: #B87333;">
                          <a href="${baseUrl}/dashboard/actions" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                            Start This Task
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${baseUrl}/dashboard/actions" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Start Your First Task
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `}

          <!-- View Full Report CTA -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">
                Want to share this with your advisor or partner?
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; border: 2px solid #B87333;">
                    <a href="${baseUrl}/report/${reportToken}" target="_blank" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #B87333; text-decoration: none; border-radius: 8px;">
                      View &amp; Share Full Report
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
    companyId,
    emailType: 'VERIFICATION_CONGRATS',
    to: email,
    subject: "You're Verified — Here's Your Exit Readiness Report",
    html,
    skipPreferenceCheck: true,
  })
}
