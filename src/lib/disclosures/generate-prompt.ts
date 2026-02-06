import { prisma } from '@/lib/prisma'
import { DISCLOSURE_QUESTIONS, type DisclosureQuestion } from './question-bank'

const QUESTIONS_PER_SET = 5
const EXCLUDE_DAYS = 60
const EXPIRY_DAYS = 30

export async function generateDisclosurePromptSet(companyId: string) {
  // Get recently asked question keys (last 60 days)
  const recentCutoff = new Date()
  recentCutoff.setDate(recentCutoff.getDate() - EXCLUDE_DAYS)

  const recentResponses = await prisma.disclosureResponse.findMany({
    where: {
      companyId,
      respondedAt: { gte: recentCutoff },
    },
    select: { questionKey: true },
  })

  const recentKeys = new Set(recentResponses.map((r) => r.questionKey))

  // Get the latest snapshot to find weakest BRI categories
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      briFinancial: true,
      briTransferability: true,
      briOperational: true,
      briMarket: true,
      briLegalTax: true,
      briPersonal: true,
    },
  })

  // Rank categories from weakest to strongest
  const categoryScores: Array<{ category: string; score: number }> = snapshot
    ? [
        { category: 'FINANCIAL', score: Number(snapshot.briFinancial) },
        { category: 'TRANSFERABILITY', score: Number(snapshot.briTransferability) },
        { category: 'OPERATIONAL', score: Number(snapshot.briOperational) },
        { category: 'MARKET', score: Number(snapshot.briMarket) },
        { category: 'LEGAL_TAX', score: Number(snapshot.briLegalTax) },
        { category: 'PERSONAL', score: Number(snapshot.briPersonal) },
      ].sort((a, b) => a.score - b.score)
    : []

  const weakCategories = new Set(categoryScores.slice(0, 3).map((c) => c.category))

  // Filter eligible questions
  const eligible = DISCLOSURE_QUESTIONS.filter((q) => !recentKeys.has(q.key))

  // Prioritize: weakest categories first, 60% negative / 40% positive mix
  const negative = eligible.filter((q) => q.signalType === 'negative')
  const positive = eligible.filter((q) => q.signalType === 'positive')

  const sortByWeakness = (a: DisclosureQuestion, b: DisclosureQuestion) => {
    const aWeak = weakCategories.has(a.briCategory) ? 0 : 1
    const bWeak = weakCategories.has(b.briCategory) ? 0 : 1
    return aWeak - bWeak
  }

  negative.sort(sortByWeakness)
  positive.sort(sortByWeakness)

  const negativeCount = Math.ceil(QUESTIONS_PER_SET * 0.6)
  const positiveCount = QUESTIONS_PER_SET - negativeCount

  const selected = [
    ...negative.slice(0, negativeCount),
    ...positive.slice(0, positiveCount),
  ].slice(0, QUESTIONS_PER_SET)

  if (selected.length === 0) return null

  const now = new Date()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS)

  const promptSet = await prisma.disclosurePromptSet.create({
    data: {
      companyId,
      scheduledFor: now,
      expiresAt,
      questions: selected.map((q) => ({
        key: q.key,
        text: q.text,
        briCategory: q.briCategory,
        followUpText: q.followUpText,
        signalType: q.signalType,
      })),
    },
  })

  return promptSet
}
