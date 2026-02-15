import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { analyzeEbitdaBridge } from '@/lib/ai/ebitda-bridge'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const analysis = await analyzeEbitdaBridge(companyId)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Error generating EBITDA bridge analysis:', error)
    return NextResponse.json(
      { error: 'Failed to generate EBITDA bridge analysis' },
      { status: 500 }
    )
  }
}
