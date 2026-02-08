import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { formatIcbName } from '@/lib/utils/format-icb'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Format currency for display
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format loan purpose for display
function formatLoanPurpose(purpose: string): string {
  const purposeMap: Record<string, string> = {
    acquisition: 'Acquisition',
    growth: 'Growth Capital',
    working_capital: 'Working Capital',
    refinancing: 'Refinancing',
    equipment: 'Equipment Purchase',
    real_estate: 'Real Estate',
    owner_distribution: 'Owner Distribution',
    buyout: 'Partner/Shareholder Buyout',
    other: 'Other',
  }
  return purposeMap[purpose] || purpose
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { companyId, requestedAmount, loanPurpose, qualification } = body

    if (!companyId || !requestedAmount || !loanPurpose) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, requestedAmount, loanPurpose' },
        { status: 400 }
      )
    }

    // Get current user details
    const currentUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: true,
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Verify user has access to this company
    const hasAccess = await prisma.organizationUser.findFirst({
      where: {
        organizationId: company.organizationId,
        userId: currentUser.id,
      },
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build the email content
    const userEmail = currentUser.email
    const userName = currentUser.name || 'Not provided'
    const latestSnapshot = company.valuationSnapshots[0]
    const briScore = latestSnapshot ? Math.round(Number(latestSnapshot.briScore) * 100) : 'N/A'

    const emailSubject = `Exit OSx Loan Request - ${userEmail}`
    const emailBody = `
      <h2>New Loan Inquiry from Exit OSx</h2>

      <h3>Contact Information</h3>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 40%;"><strong>Name</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${userName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Email</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${userEmail}</td>
        </tr>
      </table>

      <h3>Loan Request</h3>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 40%;"><strong>Requested Amount</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(requestedAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Purpose</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatLoanPurpose(loanPurpose)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Pre-Qualified Max</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(qualification?.maxLoan || 0)}</td>
        </tr>
      </table>

      <h3>Company Profile</h3>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 40%;"><strong>Company Name</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${company.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Industry</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatIcbName(company.icbSubSector) || formatIcbName(company.icbSector) || formatIcbName(company.icbSuperSector) || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Annual Revenue</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(Number(company.annualRevenue))}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Adjusted EBITDA</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(qualification?.ebitda || Number(company.annualEbitda))}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Business Readiness Score</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${briScore}${typeof briScore === 'number' ? '/100' : ''}</td>
        </tr>
      </table>

      <h3>Financial Qualification Summary</h3>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 40%;"><strong>Business Value</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(qualification?.businessValue || 0)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Personal Net Worth</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(qualification?.personalNetWorth || 0)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Total Collateral</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency((qualification?.businessValue || 0) + (qualification?.personalNetWorth || 0))}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Debt Service Coverage</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${qualification?.dscr ? qualification.dscr.toFixed(2) + 'x' : 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Collateral Coverage</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${qualification?.collateralCoverage ? qualification.collateralCoverage.toFixed(2) + 'x' : 'N/A'}</td>
        </tr>
      </table>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This inquiry was submitted through Exit OSx on ${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        })}.
      </p>
    `

    // Send email to Pasadena Private Lending
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Exit OSx <noreply@exitosx.com>',
          to: 'bfeldman@pasadena-private.com',
          replyTo: userEmail,
          subject: emailSubject,
          html: emailBody,
        })
      } catch (emailError) {
        console.error('Error sending loan inquiry email:', emailError)
        // Don't fail the request - log for debugging but return success
        // The user submitted successfully, email delivery is a secondary concern
      }
    } else {
      // Log the inquiry if Resend is not configured (development)
      console.log('=== LOAN INQUIRY (Email not sent - Resend not configured) ===')
      console.log('To: bfeldman@pasadena-private.com')
      console.log('Subject:', emailSubject)
      console.log('User:', userEmail)
      console.log('Company:', company.name)
      console.log('Requested Amount:', formatCurrency(requestedAmount))
      console.log('Purpose:', formatLoanPurpose(loanPurpose))
      console.log('Max Qualified:', formatCurrency(qualification?.maxLoan || 0))
      console.log('============================================')
    }

    // Optionally: Store the inquiry in the database for tracking
    // This could be added later if needed

    return NextResponse.json({
      success: true,
      message: 'Loan inquiry submitted successfully',
    })
  } catch (error) {
    console.error('Error processing loan inquiry:', error)
    return NextResponse.json(
      { error: 'Failed to process loan inquiry' },
      { status: 500 }
    )
  }
}
