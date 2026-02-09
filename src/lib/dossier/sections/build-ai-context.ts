import { prisma } from '@/lib/prisma'
import type { AIContextSection } from '../types'

export async function buildAIContextSection(companyId: string): Promise<AIContextSection> {
  // Get previously generated AI question IDs for this company
  const aiQuestions = await prisma.question.findMany({
    where: { companyId, isActive: false },
    select: { id: true },
    orderBy: { displayOrder: 'asc' },
  })

  // Get existing task titles to avoid regenerating similar tasks
  const existingTasks = await prisma.task.findMany({
    where: { companyId },
    select: { title: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Identify risks from open signals and low BRI categories
  const identifiedRisks: string[] = []

  const openSignals = await prisma.signal.findMany({
    where: {
      companyId,
      resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED'] },
      severity: { in: ['HIGH', 'CRITICAL'] },
    },
    select: { title: true },
    take: 10,
  })
  for (const signal of openSignals) {
    identifiedRisks.push(signal.title)
  }

  // Determine focus areas from weakest BRI categories
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  const focusAreas: string[] = []
  if (latestSnapshot) {
    const categoryScores: Array<[string, number]> = [
      ['FINANCIAL', Number(latestSnapshot.briFinancial)],
      ['TRANSFERABILITY', Number(latestSnapshot.briTransferability)],
      ['OPERATIONAL', Number(latestSnapshot.briOperational)],
      ['MARKET', Number(latestSnapshot.briMarket)],
      ['LEGAL_TAX', Number(latestSnapshot.briLegalTax)],
      ['PERSONAL', Number(latestSnapshot.briPersonal)],
    ]

    // Focus on bottom 3 categories
    categoryScores
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .forEach(([cat]) => focusAreas.push(cat))
  }

  return {
    previousQuestionIds: aiQuestions.map(q => q.id),
    previousTaskTitles: existingTasks.map(t => t.title),
    identifiedRisks,
    focusAreas,
  }
}
