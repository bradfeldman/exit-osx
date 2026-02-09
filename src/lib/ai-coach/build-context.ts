import { prisma } from '@/lib/prisma'
import { getCurrentDossier } from '@/lib/dossier/build-dossier'
import type { CompanyDossierContent } from '@/lib/dossier/types'

/**
 * Build AI Coach context from the company dossier (preferred) or ad-hoc queries (fallback).
 * Using the dossier provides richer, pre-computed context at lower query cost.
 */
export async function buildCoachContext(companyId: string): Promise<string> {
  // Try dossier-first approach
  const dossier = await getCurrentDossier(companyId)

  if (dossier) {
    return buildContextFromDossier(companyId, dossier.content as unknown as CompanyDossierContent)
  }

  // Fallback to ad-hoc queries for companies without a dossier
  return buildContextFromQueries(companyId)
}

function buildContextFromDossier(companyId: string, d: CompanyDossierContent): string {
  const { identity, financials, valuation, tasks, signals, evidence, engagement, assessment } = d

  const briScoreText = valuation.briScore !== null
    ? `- Overall BRI Score: ${Math.round(valuation.briScore * 100)}/100`
    : ''

  const categoryScoresText = assessment.hasCompletedAssessment
    ? Object.entries(assessment.categoryScores)
        .map(([cat, score]) => `  - ${cat}: ${Math.round(score * 100)}/100`)
        .join('\n')
    : ''

  const topPendingTasks = tasks.topPendingTasks
    .slice(0, 5)
    .map(t => `- ${t.title} (${t.briCategory}, $${t.normalizedValue.toLocaleString()} value)`)
    .join('\n')

  const openSignalsText = signals.topOpenSignals
    .slice(0, 10)
    .map(s => `- [${s.severity}] ${s.title}${s.category ? ` (${s.category})` : ''}`)
    .join('\n')

  return `You are an AI Exit Coach for Exit OSx, a platform that helps business owners prepare for a company exit or sale.

You are advising the owner of "${identity.name}".

COMPANY CONTEXT:
- Industry: ${identity.industry} > ${identity.subSector}
${identity.businessDescription ? `- Description: ${identity.businessDescription}` : ''}
- Annual Revenue: $${financials.annualRevenue.toLocaleString()}
- Annual EBITDA: $${financials.annualEbitda.toLocaleString()}
${financials.revenueGrowthYoY !== null ? `- Revenue Growth YoY: ${(financials.revenueGrowthYoY * 100).toFixed(1)}%` : ''}
${financials.ebitdaMarginPct !== null ? `- EBITDA Margin: ${(financials.ebitdaMarginPct * 100).toFixed(1)}%` : ''}
${identity.coreFactors ? `- Revenue Model: ${identity.coreFactors.revenueModel}
- Owner Involvement: ${identity.coreFactors.ownerInvolvement}
- Labor Intensity: ${identity.coreFactors.laborIntensity}` : ''}

${valuation.currentValue !== null ? `VALUATION & BRI SCORES:
- Current Valuation: $${valuation.currentValue.toLocaleString()}
- Potential Valuation: $${valuation.potentialValue!.toLocaleString()}
- Value Gap: $${valuation.valueGap!.toLocaleString()}
- Final Multiple: ${valuation.finalMultiple!.toFixed(2)}x
${briScoreText}
${categoryScoresText}` : 'No assessment completed yet.'}

TASK STATUS:
- ${tasks.completedCount}/${tasks.totalTasks} tasks completed, ${tasks.pendingCount} pending, ${tasks.inProgressCount} in progress
- Weekly velocity: ${tasks.weeklyVelocity} tasks/week
- Total pending value: $${tasks.totalPendingValue.toLocaleString()}
${topPendingTasks ? `Top pending tasks:\n${topPendingTasks}` : 'No pending tasks.'}

${signals.openSignalsCount > 0 ? `OPEN SIGNALS (${signals.openSignalsCount}):\n${openSignalsText}` : 'No open signals.'}

EVIDENCE:
- ${evidence.totalDocuments} documents total
${evidence.categoryGaps.length > 0 ? `- Evidence gaps in: ${evidence.categoryGaps.join(', ')}` : '- No evidence gaps'}
${evidence.urgentDocuments.length > 0 ? `- ${evidence.urgentDocuments.length} documents need attention` : ''}

ENGAGEMENT:
- Days since last activity: ${engagement.daysSinceLastActivity}
- Check-in streak: ${engagement.checkInStreak}
${engagement.latestDriftReportSummary ? `- Latest drift report: ${engagement.latestDriftReportSummary}` : ''}

INSTRUCTIONS:
- Always reference specific numbers from the context above (BRI scores, valuation, task counts).
- Give quantified, actionable advice. Example: "Your transferability score is 42/100 — focus on reducing owner involvement from HIGH to MODERATE, which could add ~$200K to your valuation."
- Be direct and professional. Avoid generic platitudes.
- When asked about risks, reference the open signals and lowest BRI category scores.
- Keep responses concise (2-4 paragraphs max).
- If the user asks about something not in the data, say so honestly rather than guessing.`
}

/**
 * Legacy fallback: build context from direct DB queries when no dossier exists
 */
async function buildContextFromQueries(companyId: string): Promise<string> {
  const [company, snapshot, tasks, signals] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: { coreFactors: true },
    }),
    prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        status: true,
        briCategory: true,
        rawImpact: true,
        priorityRank: true,
      },
      orderBy: { priorityRank: 'asc' },
    }),
    prisma.signal.findMany({
      where: { companyId, resolutionStatus: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        title: true,
        severity: true,
        category: true,
        description: true,
      },
    }),
  ])

  if (!company) throw new Error('Company not found')

  const taskCounts = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  }

  const topPendingTasks = tasks
    .filter(t => t.status === 'PENDING')
    .slice(0, 5)
    .map(t => `- ${t.title} (${t.briCategory}, $${Number(t.rawImpact).toLocaleString()} impact)`)
    .join('\n')

  const openSignalsText = signals
    .map(s => `- [${s.severity}] ${s.title}${s.category ? ` (${s.category})` : ''}`)
    .join('\n')

  const briScores = snapshot ? {
    overall: Math.round(Number(snapshot.briScore) * 100),
    financial: Math.round(Number(snapshot.briFinancial) * 100),
    transferability: Math.round(Number(snapshot.briTransferability) * 100),
    operational: Math.round(Number(snapshot.briOperational) * 100),
    market: Math.round(Number(snapshot.briMarket) * 100),
    legalTax: Math.round(Number(snapshot.briLegalTax) * 100),
    personal: Math.round(Number(snapshot.briPersonal) * 100),
  } : null

  return `You are an AI Exit Coach for Exit OSx, a platform that helps business owners prepare for a company exit or sale.

You are advising the owner of "${company.name}".

COMPANY CONTEXT:
- Annual Revenue: $${Number(company.annualRevenue).toLocaleString()}
- Annual EBITDA: $${Number(company.annualEbitda).toLocaleString()}
${company.coreFactors ? `- Revenue Model: ${company.coreFactors.revenueModel}
- Owner Involvement: ${company.coreFactors.ownerInvolvement}
- Labor Intensity: ${company.coreFactors.laborIntensity}` : ''}

${snapshot ? `VALUATION & BRI SCORES:
- Current Valuation: $${Number(snapshot.currentValue).toLocaleString()}
- Potential Valuation: $${Number(snapshot.potentialValue).toLocaleString()}
- Value Gap: $${Number(snapshot.valueGap).toLocaleString()}
- Final Multiple: ${Number(snapshot.finalMultiple).toFixed(2)}x
- Overall BRI Score: ${briScores!.overall}/100
  - Financial: ${briScores!.financial}/100
  - Transferability: ${briScores!.transferability}/100
  - Operational: ${briScores!.operational}/100
  - Market: ${briScores!.market}/100
  - Legal/Tax: ${briScores!.legalTax}/100
  - Personal: ${briScores!.personal}/100` : 'No assessment completed yet.'}

TASK STATUS:
- ${taskCounts.completed}/${taskCounts.total} tasks completed, ${taskCounts.pending} pending, ${taskCounts.inProgress} in progress
${topPendingTasks ? `Top pending tasks:\n${topPendingTasks}` : 'No pending tasks.'}

${signals.length > 0 ? `OPEN SIGNALS (${signals.length}):\n${openSignalsText}` : 'No open signals.'}

INSTRUCTIONS:
- Always reference specific numbers from the context above (BRI scores, valuation, task counts).
- Give quantified, actionable advice. Example: "Your transferability score is 42/100 — focus on reducing owner involvement from HIGH to MODERATE, which could add ~$200K to your valuation."
- Be direct and professional. Avoid generic platitudes.
- When asked about risks, reference the open signals and lowest BRI category scores.
- Keep responses concise (2-4 paragraphs max).
- If the user asks about something not in the data, say so honestly rather than guessing.`
}
