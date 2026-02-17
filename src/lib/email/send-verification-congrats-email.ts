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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`
  }
  return `$${value.toLocaleString()}`
}

function getBriVerdict(score: number): string {
  if (score >= 80) return 'Most buyers would engage.'
  if (score >= 65) return 'Some buyers would engage. Many would hesitate.'
  if (score >= 50) return 'Most buyers would hesitate or pass.'
  return 'Most buyers would pass.'
}

/**
 * Sends the post-verification email — the first real impression of Exit OSx.
 * Designed to create an emotional gut-punch: show the founder what they're
 * leaving on the table and give them one clear next step.
 */
export async function sendVerificationCongratsEmail(params: VerificationCongratsEmailParams): Promise<{ success: boolean; error?: string }> {
  const { userId, email, companyName, companyId, currentValue, potentialValue, valueGap, briScore, topRisk, topTask, reportToken } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const roundedBRI = Math.round(briScore)
  const briColor = roundedBRI >= 70 ? '#10B981' : roundedBRI >= 50 ? '#F59E0B' : '#EF4444'

  // Calculate total action plan impact (use valueGap as proxy)
  const totalImpact = valueGap > 0 ? formatCurrency(valueGap) : null

  // Subject line that creates urgency
  const subject = valueGap > 0
    ? `${companyName} is leaving ${formatCurrency(valueGap)} on the table`
    : `Your Exit Readiness Report for ${companyName}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Exit Readiness Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">

          <!-- Dark Hero — The Gut Punch -->
          <tr>
            <td style="padding: 48px 40px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: center;">
              <span style="font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: -0.5px;">Exit OS<span style="color: #B87333;">x</span></span>

              <p style="margin: 32px 0 8px 0; font-size: 13px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1.5px;">
                ${companyName}
              </p>

              ${valueGap > 0 ? `
              <h1 style="margin: 0 0 8px 0; font-size: 52px; font-weight: 800; color: #F59E0B; letter-spacing: -2px; line-height: 1;">
                ${formatCurrency(valueGap)}
              </h1>
              <p style="margin: 0 0 32px 0; font-size: 18px; color: rgba(255,255,255,0.85); font-weight: 500;">
                left on the table.
              </p>
              ` : `
              <h1 style="margin: 0 0 32px 0; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1.1;">
                Your Exit Readiness Report
              </h1>
              `}

              <!-- Value comparison -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 auto; max-width: 400px;">
                <tr>
                  <td style="text-align: center; padding: 0 8px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1px;">
                      Current Value
                    </p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: -1px;">
                      ${formatCurrency(currentValue)}
                    </p>
                  </td>
                  ${potentialValue > currentValue ? `
                  <td style="width: 40px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 24px; color: rgba(255,255,255,0.3);">&rarr;</span>
                  </td>
                  <td style="text-align: center; padding: 0 8px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1px;">
                      Potential Value
                    </p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10B981; letter-spacing: -1px;">
                      ${formatCurrency(potentialValue)}
                    </p>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- BRI Score — Buyer Language -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                      Buyer Readiness Index
                    </p>
                  </td>
                  <td style="text-align: right;">
                    <span style="font-size: 36px; font-weight: 800; color: ${briColor}; letter-spacing: -1px;">${roundedBRI}</span>
                    <span style="font-size: 16px; color: ${briColor}; font-weight: 500;">/100</span>
                  </td>
                </tr>
              </table>
              <!-- Progress bar -->
              <div style="background-color: #f0f0f0; border-radius: 4px; height: 8px; margin: 12px 0;">
                <div style="background-color: ${briColor}; border-radius: 4px; height: 8px; width: ${Math.max(roundedBRI, 5)}%;"></div>
              </div>
              <p style="margin: 0; font-size: 15px; color: #444444; line-height: 1.5;">
                ${getBriVerdict(roundedBRI)}
              </p>
            </td>
          </tr>

          <!-- Biggest Vulnerability -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #f0f0f0;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                #1 Risk a Buyer Would Flag
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 12px; background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 0 8px 8px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #3D3D3D;">
                      ${topRisk.label}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.5;">
                      This is the first thing a buyer's diligence team would probe. Fixing it has the biggest impact on what you'd get paid.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Single CTA -->
          ${topTask ? `
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">
                Start here
              </p>
              <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #3D3D3D;">
                ${topTask.title}
              </p>
              ${topTask.estimatedImpact > 0 ? `
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666;">
                Estimated impact: <strong style="color: #10B981;">${formatCurrency(topTask.estimatedImpact)}</strong>
              </p>
              ` : '<div style="height: 24px;"></div>'}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #B87333;">
                    <a href="${baseUrl}/dashboard/actions" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      See Your Full Report
                    </a>
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
                    <a href="${baseUrl}/dashboard" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      See Your Full Report
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #bbbbbb;">
                &copy; ${new Date().getFullYear()} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cccccc;">
                <a href="${baseUrl}/report/${reportToken}" style="color: #999999; text-decoration: none;">View shareable report</a>
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
    subject,
    html,
    skipPreferenceCheck: true,
  })
}
