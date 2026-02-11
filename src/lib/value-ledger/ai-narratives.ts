// PROD-059: AI-Powered Ledger Narrative Summaries
// Generates richer, personalized narratives for value ledger entries.
//
// Architecture:
//   Rules layer: existing template-based narratives (narrative-templates.ts)
//   AI layer: contextual, buyer-framed narratives using company dossier
//   Integration: AI when dossier available + event warrants it; template fallback
//
// Design decisions:
//   - Only TASK_COMPLETED and ASSESSMENT_COMPLETED events use AI narratives
//     (high-value events worth the latency/cost; others are fine as templates)
//   - Uses haiku for speed and cost (narratives are short)
//   - Always falls back to template if AI fails — ledger entries must never fail
//   - Logged to AIGenerationLog for monitoring

import { generateText } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'
import { generateNarrative, type NarrativeParams } from './narrative-templates'
import type { LedgerEventType, BriCategory } from '@prisma/client'

// ─── Types ──────────────────────────────────────────────────────────────

export interface AILedgerNarrativeInput {
  companyId: string
  eventType: LedgerEventType
  category?: BriCategory | null
  title?: string
  description?: string
  deltaValueRecovered?: number
  deltaValueAtRisk?: number
  briScoreBefore?: number | null
  briScoreAfter?: number | null
  daysSinceUpdate?: number
  taskId?: string | null
}

interface CompanyNarrativeContext {
  companyName: string
  industry: string
  briScore: number | null
  valueGap: number | null
  currentValue: number | null
}

// ─── Configuration ──────────────────────────────────────────────────────

// Only these event types warrant AI narrative generation.
// Others are fine with templates (drift, signals, benchmarks are formulaic).
const AI_ELIGIBLE_EVENTS: Set<LedgerEventType> = new Set([
  'TASK_COMPLETED',
  'ASSESSMENT_COMPLETED',
])

const BRI_CATEGORY_DISPLAY: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toFixed(0)}`
}

// ─── System Prompt ──────────────────────────────────────────────────────

const NARRATIVE_SYSTEM_PROMPT = `You are a concise M&A advisor writing value ledger narrative entries for a business exit platform.

Write a single sentence (max 200 characters) that captures the business impact of this event. The tone should be:
- Professional and encouraging (not salesy)
- Buyer-framed when relevant: connect actions to how buyers will perceive the business
- Specific: reference actual numbers, categories, or task names
- Grounded in data: only state what the data supports

Examples of good narratives:
- "Completing cash flow documentation recovered ~$45K in buyer-perceived value by demonstrating financial predictability."
- "BRI improved from 62.3 to 67.8 after addressing operational transferability gaps buyers flag in diligence."
- "Revenue diversification task moved Financial readiness up — buyers now see less concentration risk."

Do NOT use bullet points, markdown, or multiple sentences. Return only the narrative text, nothing else.`

// ─── AI Narrative Generation ────────────────────────────────────────────

function buildNarrativePrompt(
  input: AILedgerNarrativeInput,
  context: CompanyNarrativeContext
): string {
  const parts: string[] = []

  parts.push(`Company: ${context.companyName} (${context.industry})`)

  if (context.currentValue != null) {
    parts.push(`Current Valuation: ${formatDollars(context.currentValue)}`)
  }
  if (context.valueGap != null) {
    parts.push(`Value Gap: ${formatDollars(context.valueGap)}`)
  }
  if (context.briScore != null) {
    parts.push(`BRI Score: ${(context.briScore * 100).toFixed(1)}/100`)
  }

  parts.push(`\nEvent: ${input.eventType}`)

  if (input.category) {
    parts.push(`Category: ${BRI_CATEGORY_DISPLAY[input.category] ?? input.category}`)
  }
  if (input.title) {
    parts.push(`Task/Event: "${input.title}"`)
  }
  if (input.deltaValueRecovered && input.deltaValueRecovered > 0) {
    parts.push(`Value Recovered: ${formatDollars(input.deltaValueRecovered)}`)
  }
  if (input.deltaValueAtRisk && input.deltaValueAtRisk > 0) {
    parts.push(`Value at Risk: ${formatDollars(input.deltaValueAtRisk)}`)
  }
  if (input.briScoreBefore != null && input.briScoreAfter != null) {
    parts.push(`BRI: ${(input.briScoreBefore * 100).toFixed(1)} -> ${(input.briScoreAfter * 100).toFixed(1)}`)
  }

  parts.push(`\nWrite a single narrative sentence (max 200 chars) capturing the business impact.`)

  return parts.join('\n')
}

/**
 * Generate a narrative for a value ledger entry.
 *
 * Strategy:
 * 1. If event type is AI-eligible, attempt AI generation with company context
 * 2. If AI fails or event is not eligible, fall back to template narrative
 * 3. Never throw — ledger entries must always get a narrative
 *
 * @returns The narrative string (AI or template-generated)
 */
export async function generateAINarrative(
  input: AILedgerNarrativeInput
): Promise<{ narrative: string; source: 'ai' | 'template' }> {
  // Build template fallback params (always available)
  const templateParams: NarrativeParams = {
    eventType: input.eventType,
    title: input.title,
    category: input.category,
    deltaValueRecovered: input.deltaValueRecovered,
    deltaValueAtRisk: input.deltaValueAtRisk,
    briScoreBefore: input.briScoreBefore,
    briScoreAfter: input.briScoreAfter,
    daysSinceUpdate: input.daysSinceUpdate,
    description: input.description,
  }

  // Check if this event type warrants AI generation
  if (!AI_ELIGIBLE_EVENTS.has(input.eventType)) {
    return {
      narrative: generateNarrative(templateParams),
      source: 'template',
    }
  }

  // Attempt AI generation
  try {
    const context = await getCompanyNarrativeContext(input.companyId)

    if (!context) {
      return {
        narrative: generateNarrative(templateParams),
        source: 'template',
      }
    }

    const prompt = buildNarrativePrompt(input, context)
    const startTime = Date.now()

    const { text, usage } = await generateText(
      prompt,
      NARRATIVE_SYSTEM_PROMPT,
      { model: 'claude-haiku', maxTokens: 256, temperature: 0.7 }
    )

    const latencyMs = Date.now() - startTime

    // Clean the AI response (remove quotes, trim, enforce length)
    const cleanedNarrative = text
      .replace(/^["']|["']$/g, '')
      .trim()
      .slice(0, 300)

    if (!cleanedNarrative || cleanedNarrative.length < 10) {
      // AI returned garbage — fall back to template
      return {
        narrative: generateNarrative(templateParams),
        source: 'template',
      }
    }

    // Log (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        companyId: input.companyId,
        generationType: 'ledger_narrative',
        inputData: {
          eventType: input.eventType,
          category: input.category,
          title: input.title,
        },
        outputData: { narrative: cleanedNarrative },
        modelUsed: 'claude-haiku',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs,
      },
    }).catch(err => {
      console.error('[LEDGER_NARRATIVE] Failed to log AI generation:', err)
    })

    return {
      narrative: cleanedNarrative,
      source: 'ai',
    }
  } catch (error) {
    console.error('[LEDGER_NARRATIVE] AI generation failed, using template:', error)
    return {
      narrative: generateNarrative(templateParams),
      source: 'template',
    }
  }
}

// ─── Context Fetching ───────────────────────────────────────────────────

async function getCompanyNarrativeContext(
  companyId: string
): Promise<CompanyNarrativeContext | null> {
  // Try dossier first
  const dossier = await prisma.companyDossier.findFirst({
    where: { companyId, isCurrent: true },
  })

  if (dossier) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = dossier.content as any
    if (content?.identity && content?.valuation) {
      return {
        companyName: content.identity.name,
        industry: `${content.identity.industry} > ${content.identity.subSector}`,
        briScore: content.valuation.briScore,
        valueGap: content.valuation.valueGap,
        currentValue: content.valuation.currentValue,
      }
    }
  }

  // Fallback: direct DB queries
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, icbIndustry: true, icbSubSector: true },
  })

  if (!company) return null

  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { briScore: true, valueGap: true, currentValue: true },
  })

  return {
    companyName: company.name,
    industry: `${company.icbIndustry ?? 'Unknown'} > ${company.icbSubSector ?? 'Unknown'}`,
    briScore: snapshot ? Number(snapshot.briScore) : null,
    valueGap: snapshot ? Number(snapshot.valueGap) : null,
    currentValue: snapshot ? Number(snapshot.currentValue) : null,
  }
}

// Re-export for convenience — callers can use this module as the single entry point
export { generateNarrative } from './narrative-templates'
export type { NarrativeParams } from './narrative-templates'
