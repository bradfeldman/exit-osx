/**
 * GET /api/companies/[id]/first-visit
 *
 * Determines if the user should see the first-visit dashboard.
 * Returns isFirstVisit=true if ALL of:
 *   - Company was created within the last 7 days
 *   - No tasks have been started (no task with startedAt set)
 *   - Dashboard visit count < 3
 *   - No completed assessments (deep dive)
 *   - Welcome banner not dismissed
 *
 * Also returns the recommended "first move" task and quick wins.
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { BriCategory } from '@prisma/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error
  const userId = result.auth.user.id

  try {
    // Fetch company creation date
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { createdAt: true, name: true },
    })

    if (!company) {
      return NextResponse.json({ isFirstVisit: false })
    }

    // Check if company is less than 7 days old
    const daysSinceCreation = (Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation > 7) {
      return NextResponse.json({ isFirstVisit: false })
    }

    // Check if any tasks have been started
    const startedTaskCount = await prisma.task.count({
      where: {
        companyId,
        startedAt: { not: null },
      },
    })
    if (startedTaskCount > 0) {
      return NextResponse.json({ isFirstVisit: false })
    }

    // Check visit count (use CompanyVisitLog)
    const visitCount = await prisma.companyVisitLog.count({
      where: { companyId, userId },
    })
    if (visitCount >= 3) {
      return NextResponse.json({ isFirstVisit: false })
    }

    // Check if welcome was previously dismissed (via localStorage on client,
    // but also check if any assessment has been completed as a server-side signal)
    const completedAssessment = await prisma.assessment.findFirst({
      where: {
        companyId,
        completedAt: { not: null },
      },
    })
    if (completedAssessment) {
      return NextResponse.json({ isFirstVisit: false })
    }

    // Record this visit
    await prisma.companyVisitLog.create({
      data: {
        companyId,
        userId,
      },
    }).catch(() => {}) // non-blocking

    // Fetch BRI score from latest snapshot
    const snapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        briScore: true,
        briFinancial: true,
        briTransferability: true,
        briOperational: true,
        briMarket: true,
        briLegalTax: true,
        briPersonal: true,
      },
    })

    // Find the lowest BRI category to determine the "first move"
    let lowestCategory: BriCategory = BriCategory.FINANCIAL
    if (snapshot) {
      const categories: { key: BriCategory; score: number }[] = [
        { key: BriCategory.FINANCIAL, score: Number(snapshot.briFinancial ?? 1) },
        { key: BriCategory.TRANSFERABILITY, score: Number(snapshot.briTransferability ?? 1) },
        { key: BriCategory.OPERATIONAL, score: Number(snapshot.briOperational ?? 1) },
        { key: BriCategory.MARKET, score: Number(snapshot.briMarket ?? 1) },
        { key: BriCategory.LEGAL_TAX, score: Number(snapshot.briLegalTax ?? 1) },
        { key: BriCategory.PERSONAL, score: Number(snapshot.briPersonal ?? 1) },
      ].sort((a, b) => a.score - b.score)
      lowestCategory = categories[0].key
    }

    // Get the highest-impact task in the lowest-scoring category as "first move"
    const firstTask = await prisma.task.findFirst({
      where: {
        companyId,
        briCategory: lowestCategory,
        status: 'PENDING',
      },
      orderBy: { rawImpact: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        briCategory: true,
        estimatedHours: true,
        rawImpact: true,
        buyerConsequence: true,
      },
    })

    // Fallback: if no task in that category, get highest-impact task overall
    const fallbackTask = firstTask ? null : await prisma.task.findFirst({
      where: {
        companyId,
        status: 'PENDING',
      },
      orderBy: { rawImpact: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        briCategory: true,
        estimatedHours: true,
        rawImpact: true,
        buyerConsequence: true,
      },
    })

    // Quick wins: next 2-3 highest-impact tasks (different from first task)
    const mainTaskId = (firstTask ?? fallbackTask)?.id
    const quickWins = await prisma.task.findMany({
      where: {
        companyId,
        status: 'PENDING',
        ...(mainTaskId ? { id: { not: mainTaskId } } : {}),
      },
      orderBy: { rawImpact: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        rawImpact: true,
        briCategory: true,
      },
    })

    const briScore = snapshot?.briScore ? Number(snapshot.briScore) * 100 : null

    return NextResponse.json({
      isFirstVisit: true,
      briScore,
      firstTask: firstTask ?? fallbackTask ?? null,
      quickWins,
    })
  } catch (error) {
    console.error('[First Visit] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ isFirstVisit: false })
  }
}
