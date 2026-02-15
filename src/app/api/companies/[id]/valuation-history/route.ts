import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: { companyId: string; createdAt?: { gte?: Date; lte?: Date } } = { companyId }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const snapshots = await prisma.valuationSnapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        currentValue: true,
        potentialValue: true,
        valueGap: true,
        briScore: true,
        briFinancial: true,
        briTransferability: true,
        briOperational: true,
        briMarket: true,
        briLegalTax: true,
        briPersonal: true,
        finalMultiple: true,
        baseMultiple: true,
        adjustedEbitda: true,
        snapshotReason: true,
        coreScore: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Reverse to chronological order for charts
    const chronological = [...snapshots].reverse()

    // Transform for chart consumption
    const chartData = chronological.map(s => ({
      id: s.id,
      date: s.createdAt.toISOString(),
      dateFormatted: s.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit'
      }),
      currentValue: Number(s.currentValue),
      potentialValue: Number(s.potentialValue),
      valueGap: Number(s.valueGap),
      briScore: Math.round(Number(s.briScore) * 100),
      coreScore: Math.round(Number(s.coreScore) * 100),
      briFinancial: Math.round(Number(s.briFinancial) * 100),
      briTransferability: Math.round(Number(s.briTransferability) * 100),
      briOperational: Math.round(Number(s.briOperational) * 100),
      briMarket: Math.round(Number(s.briMarket) * 100),
      briLegalTax: Math.round(Number(s.briLegalTax) * 100),
      briPersonal: Math.round(Number(s.briPersonal) * 100),
      multiple: Number(s.finalMultiple),
      baseMultiple: Number(s.baseMultiple),
      adjustedEbitda: Number(s.adjustedEbitda),
      reason: s.snapshotReason,
      createdBy: s.createdBy ? {
        name: s.createdBy.name || s.createdBy.email,
        email: s.createdBy.email,
      } : null,
    }))

    // Calculate summary statistics
    const summary = chartData.length >= 2 ? {
      valueChange: chartData[chartData.length - 1].currentValue - chartData[0].currentValue,
      valueChangePercent: ((chartData[chartData.length - 1].currentValue - chartData[0].currentValue) / chartData[0].currentValue) * 100,
      briChange: chartData[chartData.length - 1].briScore - chartData[0].briScore,
      gapClosed: chartData[0].valueGap - chartData[chartData.length - 1].valueGap,
    } : null

    return NextResponse.json({
      snapshots: chronological,
      chartData,
      summary,
      total: snapshots.length,
    })
  } catch (error) {
    console.error('Error fetching valuation history:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch valuation history' },
      { status: 500 }
    )
  }
}
