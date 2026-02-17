import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'
import { applyUserRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { syncTransactions } from '@/lib/integrations/quickbooks/transactions'
import { runRulesEngine } from '@/lib/transaction-analysis/rules-engine'
import { classifyTransactionFlags } from '@/lib/transaction-analysis/classify'
import { TransactionFlagType } from '@prisma/client'

export const maxDuration = 120

// ─── POST: Trigger full analysis pipeline ───────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 5 per minute (it's expensive)
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } })
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const rateLimit = await applyUserRateLimit(request, dbUser.id, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    // Verify user access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: { where: { user: { authId: user.id } } },
          },
        },
        integrations: {
          where: { provider: 'QUICKBOOKS_ONLINE', disconnectedAt: null },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const integration = company.integrations[0]
    if (!integration) {
      return NextResponse.json(
        { error: 'No QuickBooks connection found. Please connect QuickBooks first.' },
        { status: 400 }
      )
    }

    // Determine date range: latest fiscal year
    const now = new Date()
    const fyEndMonth = company.fiscalYearEndMonth
    const fyEndDay = company.fiscalYearEndDay

    let endYear = now.getFullYear()
    const fyEnd = new Date(endYear, fyEndMonth - 1, fyEndDay)
    if (fyEnd > now) endYear -= 1

    const endDate = new Date(endYear, fyEndMonth - 1, fyEndDay)
    const startDate = new Date(endYear - 1, fyEndMonth - 1, fyEndDay + 1)

    // Prior year for YoY comparison
    const priorYearEnd = new Date(startDate)
    priorYearEnd.setDate(priorYearEnd.getDate() - 1)
    const priorYearStart = new Date(priorYearEnd)
    priorYearStart.setFullYear(priorYearStart.getFullYear() - 1)
    priorYearStart.setDate(priorYearStart.getDate() + 1)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    const priorStartStr = priorYearStart.toISOString().split('T')[0]
    const priorEndStr = priorYearEnd.toISOString().split('T')[0]

    // Step 1: Sync transactions (current + prior year)
    const [currentSync, priorSync] = await Promise.all([
      syncTransactions(integration.id, companyId, startDateStr, endDateStr),
      syncTransactions(integration.id, companyId, priorStartStr, priorEndStr),
    ])

    // Step 2: Run rules engine
    const analysisResult = await runRulesEngine(
      companyId,
      startDate,
      endDate,
      priorYearStart,
      priorYearEnd,
    )

    // Step 3: AI classification
    const profile = company.businessProfile as Record<string, unknown> | null
    const companyContext = {
      companyName: company.name,
      industry: `${company.icbSector} / ${company.icbSubSector}`,
      annualRevenue: Number(company.annualRevenue),
      state: (profile?.state as string) || null,
    }

    const aiResult = await classifyTransactionFlags(
      companyId,
      analysisResult.flags,
      analysisResult.vendorProfiles,
      companyContext,
    )

    // Step 4: Merge rule flags with AI classifications
    // Start with AI-confirmed/modified flags
    const finalFlags = new Map<string, {
      flagType: TransactionFlagType
      category: string
      description: string
      suggestedAmount: number
      personalPct: number | null
      confidence: number
      aiGenerated: boolean
      sourceRule: string | null
      vendorName: string | null
      vendorTxnCount: number | null
      vendorTotalSpend: number | null
      transactionId: string | null
    }>()

    // Add AI classifications
    for (const c of aiResult.classifications) {
      if (!c.flagType) continue
      finalFlags.set(c.vendorName.toLowerCase(), {
        flagType: c.flagType,
        category: c.category,
        description: c.description,
        suggestedAmount: c.suggestedAmount,
        personalPct: c.personalPct,
        confidence: c.confidence,
        aiGenerated: true,
        sourceRule: c.isNewFind ? 'ai_discovery' : null,
        vendorName: c.vendorName,
        vendorTxnCount: null,
        vendorTotalSpend: null,
        transactionId: null,
      })
    }

    // Backfill vendor stats from rules engine for AI-confirmed flags
    for (const ruleFlag of analysisResult.flags) {
      const key = (ruleFlag.vendorName || '').toLowerCase()
      const existing = finalFlags.get(key)
      if (existing) {
        existing.sourceRule = existing.sourceRule || ruleFlag.sourceRule
        existing.vendorTxnCount = ruleFlag.vendorTxnCount
        existing.vendorTotalSpend = ruleFlag.vendorTotalSpend
        existing.transactionId = ruleFlag.transactionId
      }
    }

    // Add rule flags that AI didn't explicitly address (with lower confidence)
    for (const ruleFlag of analysisResult.flags) {
      const key = (ruleFlag.vendorName || ruleFlag.transactionId || ruleFlag.description).toLowerCase()
      if (!finalFlags.has(key)) {
        finalFlags.set(key, {
          flagType: ruleFlag.flagType,
          category: ruleFlag.category,
          description: ruleFlag.description,
          suggestedAmount: ruleFlag.suggestedAmount,
          personalPct: ruleFlag.personalPct,
          confidence: ruleFlag.confidence * 0.8, // Reduce confidence if AI didn't confirm
          aiGenerated: false,
          sourceRule: ruleFlag.sourceRule,
          vendorName: ruleFlag.vendorName,
          vendorTxnCount: ruleFlag.vendorTxnCount,
          vendorTotalSpend: ruleFlag.vendorTotalSpend,
          transactionId: ruleFlag.transactionId,
        })
      }
    }

    // Step 5: Persist flags (clear old PENDING flags first, keep ACCEPTED/DISMISSED)
    await prisma.transactionFlag.deleteMany({
      where: { companyId, status: 'PENDING' },
    })

    // Get existing dismissed flags to avoid re-creating
    const dismissedFlags = await prisma.transactionFlag.findMany({
      where: { companyId, status: 'DISMISSED' },
      select: { vendorName: true, sourceRule: true },
    })
    const dismissedKeys = new Set(
      dismissedFlags.map((f) => `${(f.vendorName || '').toLowerCase()}:${f.sourceRule || ''}`)
    )

    const flagsToCreate = Array.from(finalFlags.values()).filter((f) => {
      const key = `${(f.vendorName || '').toLowerCase()}:${f.sourceRule || ''}`
      return !dismissedKeys.has(key)
    })

    if (flagsToCreate.length > 0) {
      await prisma.transactionFlag.createMany({
        data: flagsToCreate.map((f) => ({
          companyId,
          flagType: f.flagType,
          category: f.category,
          description: f.description,
          suggestedAmount: f.suggestedAmount,
          personalPct: f.personalPct,
          confidence: f.confidence,
          aiGenerated: f.aiGenerated,
          status: 'PENDING' as const,
          sourceRule: f.sourceRule,
          vendorName: f.vendorName,
          vendorTxnCount: f.vendorTxnCount,
          vendorTotalSpend: f.vendorTotalSpend,
          transactionId: f.transactionId,
        })),
      })
    }

    // Return results
    const pendingFlags = await prisma.transactionFlag.findMany({
      where: { companyId, status: 'PENDING' },
      orderBy: { suggestedAmount: 'desc' },
    })

    return NextResponse.json({
      flags: pendingFlags,
      summary: {
        transactionsSynced: currentSync.transactionCount + priorSync.transactionCount,
        totalExpenseAmount: analysisResult.totalExpenseAmount,
        flagsFound: pendingFlags.length,
        totalAddBackAmount: pendingFlags.reduce(
          (sum, f) => sum + Number(f.suggestedAmount || 0),
          0
        ),
        buyerNarrative: aiResult.buyerNarrative,
      },
    })
  } catch (error) {
    console.error('Transaction analysis error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Transaction analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}

// ─── GET: Return existing flags ─────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: { where: { user: { authId: user.id } } },
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const flags = await prisma.transactionFlag.findMany({
      where: { companyId, status: 'PENDING' },
      orderBy: { suggestedAmount: 'desc' },
    })

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('Error fetching flags:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 })
  }
}

// ─── PATCH: Accept or dismiss a flag ────────────────────────────────

const patchSchema = z.object({
  flagId: z.string(),
  action: z.enum(['accept', 'dismiss']),
  amount: z.number().positive().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, patchSchema)
  if (!validation.success) return validation.error

  const { flagId, action, amount } = validation.data

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: { where: { user: { authId: user.id } } },
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const flag = await prisma.transactionFlag.findUnique({
      where: { id: flagId },
    })

    if (!flag || flag.companyId !== companyId) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }

    if (action === 'dismiss') {
      await prisma.transactionFlag.update({
        where: { id: flagId },
        data: { status: 'DISMISSED' },
      })
      return NextResponse.json({ success: true })
    }

    // Accept: create EbitdaAdjustment and link it
    const adjustmentAmount = amount || Number(flag.suggestedAmount) || 0
    if (adjustmentAmount <= 0) {
      return NextResponse.json({ error: 'Amount is required for acceptance' }, { status: 400 })
    }

    const adjustment = await prisma.ebitdaAdjustment.create({
      data: {
        companyId,
        description: flag.description,
        amount: adjustmentAmount,
        type: 'ADD_BACK',
        category: flag.category,
        aiSuggested: flag.aiGenerated,
        source: 'TRANSACTION',
      },
    })

    await prisma.transactionFlag.update({
      where: { id: flagId },
      data: {
        status: 'ACCEPTED',
        adjustmentId: adjustment.id,
      },
    })

    return NextResponse.json({ success: true, adjustment })
  } catch (error) {
    console.error('Error updating flag:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 })
  }
}
