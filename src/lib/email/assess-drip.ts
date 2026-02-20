import { Resend } from 'resend'
import crypto from 'crypto'
import { constantTimeCompare } from '@/lib/security/timing-safe'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 days

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssessmentLeadData {
  id: string
  email: string
  briScore: number | null
  currentValue: number | null
  potentialValue: number | null
  topRisk: string | null
}

// ---------------------------------------------------------------------------
// Token generation (HMAC-signed, 7-day expiry)
// ---------------------------------------------------------------------------

function getSecret(): string {
  const secret = process.env.REPORT_SHARE_SECRET
  if (!secret) throw new Error('REPORT_SHARE_SECRET not configured')
  return secret
}

export function generateResultsToken(leadId: string): string {
  const secret = getSecret()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payload = Buffer.from(leadId).toString('base64url')

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`assess:${leadId}:${timestamp}`)
    .digest('base64url')

  return `${payload}.${timestamp}.${signature}`
}

export function verifyResultsToken(token: string): string | null {
  try {
    const secret = getSecret()
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [payload, timestampStr, signature] = parts
    const leadId = Buffer.from(payload, 'base64url').toString('utf-8')
    const timestamp = parseInt(timestampStr, 10)

    if (isNaN(timestamp) || timestamp <= 0) return null
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (nowSeconds - timestamp > TOKEN_EXPIRY_SECONDS) return null
    if (timestamp > nowSeconds + 60) return null

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`assess:${leadId}:${timestampStr}`)
      .digest('base64url')

    if (!constantTimeCompare(signature, expectedSignature)) return null
    return leadId
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString()}K`
  return `$${value.toLocaleString()}`
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>'
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Strong'
  if (score >= 70) return 'Solid Foundation'
  if (score >= 55) return 'Typical'
  return 'Early Stage'
}

function getScoreColor(score: number): string {
  if (score >= 85) return '#10B981'
  if (score >= 70) return '#3B82F6'
  if (score >= 55) return '#F59E0B'
  return '#EF4444'
}

const RISK_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const RISK_TIPS: Record<string, string[]> = {
  FINANCIAL: [
    'Ensure 3 years of clean, accurate financials (P&L, balance sheet, cash flow)',
    'Identify and document add-backs — owner perks, one-time expenses, family payroll',
    'Build recurring revenue streams to reduce volatility and increase predictability',
  ],
  TRANSFERABILITY: [
    'Document all key processes so the business runs without you for 2+ weeks',
    'Develop a management layer — buyers pay premiums for businesses with strong teams',
    'Reduce any single-person dependencies in client relationships and operations',
  ],
  OPERATIONAL: [
    'Modernize and document your technology stack and standard operating procedures',
    'Diversify your supplier base — concentration here is a red flag for buyers',
    'Implement KPIs and dashboards that a new owner can monitor from day one',
  ],
  MARKET: [
    'Reduce customer concentration — no single client should exceed 15-20% of revenue',
    'Document your competitive moat — what makes you hard to replicate?',
    'Show a clear growth trajectory with pipeline visibility for the next 12-24 months',
  ],
  LEGAL_TAX: [
    'Ensure all contracts (client, vendor, employee) are current and transferable',
    'Protect intellectual property — register trademarks, patents, and trade secrets',
    'Work with a tax advisor on entity structure optimization before listing',
  ],
  PERSONAL: [
    'Define your post-exit vision — buyers want to know you have a plan beyond the sale',
    'Build a personal financial model to understand your minimum acceptable price',
    'Start transitioning key relationships to other team members now',
  ],
}

// ---------------------------------------------------------------------------
// Email wrapper (shared layout)
// ---------------------------------------------------------------------------

function emailWrapper(content: string): string {
  const baseUrl = getBaseUrl()
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exit OSx</title>
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

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                &copy; ${year} Exit OSx. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                <a href="${baseUrl}/privacy" style="color: #999999;">Privacy Policy</a> &middot;
                <a href="${baseUrl}/terms" style="color: #999999;">Terms of Service</a>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #bbbbbb;">
                You received this because you completed an exit readiness assessment on Exit OSx.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, text: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
    <tr>
      <td style="border-radius: 8px; background-color: #B87333;">
        <a href="${href}" target="_blank" style="display: inline-block; padding: 16px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`
}

// ---------------------------------------------------------------------------
// Day 0: Results Summary (sent immediately after email capture)
// ---------------------------------------------------------------------------

function buildDay0Html(lead: AssessmentLeadData, resultsUrl: string): string {
  const score = lead.briScore ?? 0
  const scoreLabel = getScoreLabel(score)
  const scoreColor = getScoreColor(score)
  const riskLabel = lead.topRisk ? (RISK_LABELS[lead.topRisk] || lead.topRisk) : null

  const valuationRow = (lead.currentValue && lead.potentialValue) ? `
              <!-- Valuation -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #1e293b; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 20px; text-align: center;">
                          <p style="margin: 0 0 2px 0; font-size: 12px; color: rgba(255,255,255,0.5);">Current Value</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${formatCurrency(lead.currentValue)}</p>
                        </td>
                        <td style="width: 1px; background-color: rgba(255,255,255,0.15); padding: 0;"></td>
                        <td style="padding: 0 20px; text-align: center;">
                          <p style="margin: 0 0 2px 0; font-size: 12px; color: rgba(255,255,255,0.5);">Potential Value</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #10B981;">${formatCurrency(lead.potentialValue)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
  ` : ''

  const riskRow = riskLabel ? `
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #666666; text-align: center;">
                Your #1 risk area: <strong style="color: #3D3D3D;">${riskLabel}</strong>.<br>
                We&rsquo;ll send you actionable tips to improve this in a couple days.
              </p>
  ` : ''

  return emailWrapper(`
              <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Your Exit Readiness Results
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 15px; color: #666666; text-align: center;">
                Here&rsquo;s a summary of your assessment.
              </p>

              <!-- BRI Score -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">Buyer Readiness Index</p>
                    <p style="margin: 0; font-size: 56px; font-weight: 900; color: ${scoreColor}; font-variant-numeric: tabular-nums;">${score}</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: ${scoreColor}; font-weight: 600;">${scoreLabel}</p>
                  </td>
                </tr>
              </table>

              ${valuationRow}
              ${riskRow}

              ${ctaButton(resultsUrl, 'View Full Results')}

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #999999; text-align: center;">
                Create a free account to see your full breakdown, action plan, and risk diagnostic.
              </p>
  `)
}

// ---------------------------------------------------------------------------
// Day 2: Top Risk Educational
// ---------------------------------------------------------------------------

function buildDay2Html(lead: AssessmentLeadData, signupUrl: string): string {
  const riskKey = lead.topRisk || 'FINANCIAL'
  const riskLabel = RISK_LABELS[riskKey] || riskKey
  const tips = RISK_TIPS[riskKey] || RISK_TIPS.FINANCIAL

  const tipsHtml = tips
    .map(
      (tip) =>
        `<tr><td style="padding: 8px 0; font-size: 14px; line-height: 1.6; color: #666666;"><span style="color: #B87333; margin-right: 8px; font-weight: 700;">&#8594;</span> ${tip}</td></tr>`
    )
    .join('\n')

  return emailWrapper(`
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Improve Your #1 Risk Area
              </h1>

              <p style="margin: 0 0 4px 0; font-size: 15px; color: #666666; text-align: center;">
                Your assessment flagged <strong style="color: #3D3D3D;">${riskLabel}</strong> as the area most likely to concern buyers.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; color: #999999; text-align: center;">
                Here are 3 things you can start working on today:
              </p>

              <!-- Tips -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; padding: 20px; background-color: #FAFAFA; border-radius: 10px; border: 1px solid #f0f0f0;">
                ${tipsHtml}
              </table>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #666666; text-align: center;">
                Your full Exit OSx account includes a personalized action plan with prioritized tasks across all ${Object.keys(RISK_LABELS).length} risk categories.
              </p>

              ${ctaButton(signupUrl, 'Get Your Action Plan')}

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #999999; text-align: center;">
                Free to start. No credit card required.
              </p>
  `)
}

// ---------------------------------------------------------------------------
// Day 5: Urgency / Expiry
// ---------------------------------------------------------------------------

function buildDay5Html(lead: AssessmentLeadData, signupUrl: string): string {
  const score = lead.briScore ?? 0
  const scoreColor = getScoreColor(score)

  return emailWrapper(`
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                Your Results Expire in 48 Hours
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #666666; text-align: center;">
                We ran your exit readiness assessment 5 days ago. Your results &mdash; including your BRI score of <strong style="color: ${scoreColor};">${score}</strong> &mdash; will expire in 48 hours.
              </p>

              <!-- Score reminder -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; padding: 20px; background-color: #FAFAFA; border-radius: 10px; border: 1px solid #f0f0f0;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #3D3D3D;">What you&rsquo;ll lose access to:</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #666666;">
                    <span style="color: #EF4444; margin-right: 8px;">&#10005;</span> Your BRI score and category breakdown
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #666666;">
                    <span style="color: #EF4444; margin-right: 8px;">&#10005;</span> Your valuation estimate and value gap analysis
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #666666;">
                    <span style="color: #EF4444; margin-right: 8px;">&#10005;</span> Your prioritized action plan
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #666666;">
                    <span style="color: #EF4444; margin-right: 8px;">&#10005;</span> Risk diagnostic across 6 categories
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #666666; text-align: center;">
                Save your results by creating a free account. It takes 30 seconds.
              </p>

              ${ctaButton(signupUrl, 'Save My Results')}

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #999999; text-align: center;">
                After expiry, you&rsquo;ll need to retake the assessment.
              </p>
  `)
}

// ---------------------------------------------------------------------------
// Send functions
// ---------------------------------------------------------------------------

async function sendDripEmail(
  to: string,
  subject: string,
  html: string,
  label: string
): Promise<boolean> {
  if (!resend) {
    console.warn(`[Drip] Resend not configured, skipping ${label}`)
    return false
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
    })
    console.log(`[Drip] Sent ${label} to ${to}`)
    return true
  } catch (err) {
    console.error(
      `[Drip] Failed to send ${label} to ${to}:`,
      err instanceof Error ? err.message : String(err)
    )
    return false
  }
}

export async function sendDay0Email(lead: AssessmentLeadData): Promise<boolean> {
  const baseUrl = getBaseUrl()
  const token = generateResultsToken(lead.id)
  const resultsUrl = `${baseUrl}/assess/results?token=${token}`

  const score = lead.briScore ?? 0
  const subject = `Your Exit Readiness Results — BRI Score: ${score}`
  const html = buildDay0Html(lead, resultsUrl)

  return sendDripEmail(lead.email, subject, html, 'Day 0')
}

export async function sendDay2Email(lead: AssessmentLeadData): Promise<boolean> {
  const baseUrl = getBaseUrl()
  const encodedEmail = encodeURIComponent(lead.email)
  const signupUrl = `${baseUrl}/signup?email=${encodedEmail}&ref=drip2`

  const riskLabel = lead.topRisk
    ? RISK_LABELS[lead.topRisk] || lead.topRisk
    : 'Financial Health'
  const subject = `How to fix your #1 risk: ${riskLabel}`
  const html = buildDay2Html(lead, signupUrl)

  return sendDripEmail(lead.email, subject, html, 'Day 2')
}

export async function sendDay5Email(lead: AssessmentLeadData): Promise<boolean> {
  const baseUrl = getBaseUrl()
  const encodedEmail = encodeURIComponent(lead.email)
  const signupUrl = `${baseUrl}/signup?email=${encodedEmail}&ref=drip5`

  const subject = 'Your exit readiness results expire in 48 hours'
  const html = buildDay5Html(lead, signupUrl)

  return sendDripEmail(lead.email, subject, html, 'Day 5')
}
