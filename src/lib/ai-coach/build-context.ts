import { prisma } from '@/lib/prisma'

export async function buildCoachContext(companyId: string): Promise<string> {
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
