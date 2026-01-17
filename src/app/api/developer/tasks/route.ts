import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Canonical task template storage
// In a full implementation, this would be a separate database table
// For now, we'll create tasks in a "template" company or log them

interface CanonicalTaskTemplate {
  id: string
  taskTitle: string
  taskDescription: string
  actionType: string
  primaryCategory: string
  secondaryCategories: string[]
  effortLevel: string
  timeEstimate: string
  sprintCategory: string
  buyerConfidenceElasticity: number
  acceptanceCriteria: string
  evidenceType: string
  createdAt: Date
  createdBy: string
}

// In-memory store for canonical tasks (in production, use database)
// This is a placeholder - would be replaced with actual database table
const canonicalTasks: CanonicalTaskTemplate[] = []

// Map action type strings to enum values
const ACTION_TYPE_MAP: Record<string, string> = {
  'TYPE_I_EVIDENCE': 'TYPE_I_EVIDENCE',
  'TYPE_II_DOCUMENTATION': 'TYPE_II_DOCUMENTATION',
  'TYPE_III_OPERATIONAL_CHANGE': 'TYPE_III_OPERATIONAL_CHANGE',
  'TYPE_IV_INSTITUTIONALIZATION': 'TYPE_IV_INSTITUTIONALIZATION',
  'TYPE_V_RISK_REDUCTION': 'TYPE_V_RISK_REDUCTION',
  'TYPE_VI_ALIGNMENT': 'TYPE_VI_ALIGNMENT',
  'TYPE_VII_READINESS': 'TYPE_VII_READINESS',
  'TYPE_VIII_SIGNALING': 'TYPE_VIII_SIGNALING',
  'TYPE_IX_OPTION_CREATION': 'TYPE_IX_OPTION_CREATION',
  'TYPE_X_DEFER': 'TYPE_X_DEFER',
}

// Map effort level strings to enum values
const EFFORT_LEVEL_MAP: Record<string, string> = {
  'EASY': 'MINIMAL',
  'LOW': 'LOW',
  'MEDIUM': 'MODERATE',
  'HIGH': 'HIGH',
  'SIGNIFICANT': 'MAJOR',
}

// Forbidden patterns for task titles
const FORBIDDEN_PATTERNS = ['improve', 'optimize', 'enhance', 'support', 'assist']

function validateTaskTitle(title: string): { valid: boolean; error?: string } {
  const lowerTitle = title.toLowerCase()
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (lowerTitle.includes(pattern)) {
      return {
        valid: false,
        error: `Task title contains forbidden word: "${pattern}". Use specific, actionable language.`,
      }
    }
  }
  return { valid: true }
}

// POST - Create a new canonical task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      taskTitle,
      taskDescription,
      actionType,
      primaryCategory,
      secondaryCategories = [],
      effortLevel,
      timeEstimate,
      sprintCategory,
      buyerConfidenceElasticity,
      acceptanceCriteria,
      evidenceType,
    } = body

    // Validate required fields
    if (!taskTitle || !taskDescription || !actionType || !primaryCategory || !acceptanceCriteria) {
      return NextResponse.json(
        { message: 'Missing required fields: taskTitle, taskDescription, actionType, primaryCategory, and acceptanceCriteria are required' },
        { status: 400 }
      )
    }

    // Validate task title against forbidden patterns
    const titleValidation = validateTaskTitle(taskTitle)
    if (!titleValidation.valid) {
      return NextResponse.json(
        { message: titleValidation.error },
        { status: 400 }
      )
    }

    // Validate acceptance criteria length
    if (acceptanceCriteria.length < 20) {
      return NextResponse.json(
        { message: 'Acceptance criteria must be at least 20 characters' },
        { status: 400 }
      )
    }

    // Create canonical task template
    const taskId = `TASK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const canonicalTask: CanonicalTaskTemplate = {
      id: taskId,
      taskTitle,
      taskDescription,
      actionType: ACTION_TYPE_MAP[actionType] || actionType,
      primaryCategory,
      secondaryCategories,
      effortLevel: EFFORT_LEVEL_MAP[effortLevel] || 'MODERATE',
      timeEstimate,
      sprintCategory,
      buyerConfidenceElasticity: parseFloat(buyerConfidenceElasticity),
      acceptanceCriteria,
      evidenceType,
      createdAt: new Date(),
      createdBy: user.id,
    }

    // Store in memory (in production, save to database)
    canonicalTasks.push(canonicalTask)

    // Log the creation for audit
    console.log(`[TASK_ENGINE] Canonical task created by ${user.id}:`, {
      taskId,
      taskTitle,
      actionType,
      primaryCategory,
      effortLevel,
      sprintCategory,
      buyerConfidenceElasticity,
    })

    // Also log to a file or database for persistence
    // In production, this would be a proper database insert

    return NextResponse.json({
      success: true,
      task: {
        id: taskId,
        taskTitle,
        actionType: canonicalTask.actionType,
        primaryCategory,
        effortLevel: canonicalTask.effortLevel,
        sprintCategory,
      },
      message: 'Canonical task created successfully. Note: Full database integration pending.',
    })
  } catch (error) {
    console.error('[TASK_ENGINE] Error creating canonical task:', error)
    return NextResponse.json(
      { message: 'Failed to create canonical task' },
      { status: 500 }
    )
  }
}

// GET - List canonical task templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const actionType = searchParams.get('actionType')

    // Filter canonical tasks
    let filteredTasks = [...canonicalTasks]

    if (category) {
      filteredTasks = filteredTasks.filter(t => t.primaryCategory === category)
    }

    if (actionType) {
      filteredTasks = filteredTasks.filter(t => t.actionType === actionType)
    }

    // Also fetch any tasks from the database that might be templates
    // (This is a placeholder for when we have a proper canonical task table)

    return NextResponse.json({
      canonicalTasks: filteredTasks,
      totalCount: filteredTasks.length,
      note: 'Canonical task storage is currently in-memory. Full database integration pending.',
    })
  } catch (error) {
    console.error('[TASK_ENGINE] Error listing canonical tasks:', error)
    return NextResponse.json(
      { message: 'Failed to list canonical tasks' },
      { status: 500 }
    )
  }
}
