import { generateJSON } from './anthropic'
import type {
  BusinessProfile,
  DiagnosticQuestionsResult,
  TaskGenerationResult,
  IdentifiedDriver,
  Subcategory,
  SUBCATEGORY_DRIVERS,
} from './types'

const DIAGNOSTIC_QUESTIONS_SYSTEM = `You are creating diagnostic questions for a specific business to understand WHY they have operational weaknesses.

Your questions should:
1. Feel written specifically for THIS business (use their terminology)
2. Diagnose the root cause of their issues
3. Map to specific weakness drivers
4. Have 5 clear answer options from worst to best
5. Include brief context explaining why this matters

Each question must map answers to one or more drivers from the provided list.
Drivers help us understand the root cause and generate targeted improvement tasks.`

const TASK_GENERATION_SYSTEM = `You are creating an action plan for a specific business based on their diagnosed weaknesses.

Your tasks should:
1. Be specific to THIS business (use their context, team size, constraints)
2. Address the identified root cause drivers
3. Be completable in 1-3 hours each
4. Have clear, measurable "done" definitions
5. Respect their constraints (team size, technology, etc.)
6. Follow a logical order: Measure → Fix → Validate

Tasks should feel like they were written by someone who knows this specific business.`

const SUBCATEGORY_CONTEXT = {
  SCALABILITY: {
    name: 'Scalability',
    description: 'How well the business can grow revenue without proportionally increasing costs',
    drivers: [
      { id: 'throughput_kitchen', desc: 'Kitchen/production bottleneck' },
      { id: 'throughput_foh', desc: 'Front-of-house/service bottleneck' },
      { id: 'throughput_capacity', desc: 'Physical space/capacity limits' },
      { id: 'throughput_turnover', desc: 'Slow customer turnover' },
      { id: 'labor_linear', desc: 'Revenue requires proportional hiring' },
      { id: 'labor_step', desc: 'Growth requires periodic hiring' },
      { id: 'no_sops', desc: 'No documented processes' },
      { id: 'partial_sops', desc: 'Some processes documented, gaps exist' },
      { id: 'sops_not_enforced', desc: 'Processes exist but not followed' },
      { id: 'menu_complex', desc: 'Menu/service too complex' },
      { id: 'growth_hours', desc: 'Growth depends on more hours' },
      { id: 'growth_headcount', desc: 'Growth depends on more staff' },
      { id: 'no_measurement', desc: 'No visibility into metrics' },
    ],
  },
  TECHNOLOGY: {
    name: 'Technology Infrastructure',
    description: 'Quality and integration of business systems',
    drivers: [
      { id: 'pos_manual', desc: 'Manual/cash register system' },
      { id: 'pos_legacy', desc: 'Outdated POS system' },
      { id: 'pos_limited', desc: 'POS has limited capabilities' },
      { id: 'inventory_none', desc: 'No inventory tracking' },
      { id: 'inventory_manual', desc: 'Manual inventory process' },
      { id: 'online_tablet_chaos', desc: 'Multiple delivery tablets' },
      { id: 'online_manual_entry', desc: 'Manual order re-entry' },
      { id: 'reporting_none', desc: 'No business reports' },
      { id: 'reporting_manual', desc: 'Manual report compilation' },
      { id: 'integration_none', desc: 'Systems not connected' },
      { id: 'no_measurement', desc: 'Unknown tech state' },
    ],
  },
  VENDOR: {
    name: 'Vendor Agreements',
    description: 'Formality and protection of supplier relationships',
    drivers: [
      { id: 'food_no_contract', desc: 'No food supplier contracts' },
      { id: 'food_verbal', desc: 'Verbal food agreements only' },
      { id: 'beverage_informal', desc: 'Informal beverage arrangements' },
      { id: 'equipment_reactive', desc: 'Reactive equipment maintenance' },
      { id: 'equipment_informal', desc: 'Informal maintenance relationships' },
      { id: 'lease_short', desc: 'Lease under 2 years' },
      { id: 'lease_no_transfer', desc: 'Lease transfer uncertain' },
      { id: 'pricing_exposed', desc: 'No price protection' },
      { id: 'no_measurement', desc: 'Unknown contract status' },
    ],
  },
  RETENTION: {
    name: 'Employee Retention',
    description: 'Staff stability and turnover risk',
    drivers: [
      { id: 'pay_not_competitive', desc: 'Losing staff to competitors' },
      { id: 'pay_below_market', desc: 'Below market compensation' },
      { id: 'schedule_issues', desc: 'Scheduling/work-life problems' },
      { id: 'culture_issues', desc: 'Culture or management issues' },
      { id: 'no_advancement', desc: 'No career growth path' },
      { id: 'training_none', desc: 'No training program' },
      { id: 'training_shadow_only', desc: 'Shadow-only training' },
      { id: 'key_person_critical', desc: "Can't operate without one person" },
      { id: 'key_person_high', desc: 'High key person risk' },
      { id: 'feedback_none', desc: 'No employee feedback channel' },
      { id: 'no_measurement', desc: 'No exit data collected' },
    ],
  },
}

export async function generateDiagnosticQuestions(
  profile: BusinessProfile,
  subcategory: Subcategory,
  initialAnswer: string,
  initialScore: number
): Promise<{ data: DiagnosticQuestionsResult; usage: { inputTokens: number; outputTokens: number } }> {
  const context = SUBCATEGORY_CONTEXT[subcategory]
  const driversFormatted = context.drivers.map((d) => `- ${d.id}: ${d.desc}`).join('\n')

  const prompt = `Business profile:
${JSON.stringify(profile, null, 2)}

Sub-category: ${context.name}
Description: ${context.description}

Initial assessment answer: "${initialAnswer}" (score: ${initialScore}/100)

Available drivers to diagnose:
${driversFormatted}

Generate exactly 5 multiple choice questions that:
1. Feel written specifically for this ${profile.businessType} business
2. Use their language (e.g., if they said "ramen shop", say "ramen" not "food items")
3. Diagnose WHY they scored low in ${context.name}
4. Each question maps answers to drivers from the list above
5. Have 5 answer options (A-E) ranging from worst to best situation

Return JSON in this exact format:
{
  "subcategory": "${subcategory}",
  "questions": [
    {
      "id": "dq1",
      "questionText": "<question written for their specific business>",
      "contextText": "<brief explanation of why this matters>",
      "options": [
        {
          "id": "a",
          "text": "<worst situation option>",
          "drivers": ["<driver_id>"],
          "severity": "high",
          "scoreImpact": 0
        },
        {
          "id": "b",
          "text": "<bad situation option>",
          "drivers": ["<driver_id>"],
          "severity": "high",
          "scoreImpact": 20
        },
        {
          "id": "c",
          "text": "<moderate situation option>",
          "drivers": ["<driver_id>"],
          "severity": "medium",
          "scoreImpact": 40
        },
        {
          "id": "d",
          "text": "<good situation option>",
          "drivers": ["<driver_id>"],
          "severity": "low",
          "scoreImpact": 60
        },
        {
          "id": "e",
          "text": "<best situation option>",
          "drivers": [],
          "severity": "low",
          "scoreImpact": 80
        }
      ]
    }
  ]
}`

  return generateJSON<DiagnosticQuestionsResult>(prompt, DIAGNOSTIC_QUESTIONS_SYSTEM, {
    model: 'claude-sonnet',
    temperature: 0.7,
  })
}

export async function generateTasks(
  profile: BusinessProfile,
  subcategory: Subcategory,
  identifiedDrivers: IdentifiedDriver[],
  valueAtStake: number
): Promise<{ data: TaskGenerationResult; usage: { inputTokens: number; outputTokens: number } }> {
  const context = SUBCATEGORY_CONTEXT[subcategory]

  // Format drivers with their info
  const driversFormatted = identifiedDrivers
    .slice(0, 5) // Top 5 drivers
    .map((d, i) => {
      const driverInfo = context.drivers.find((cd) => cd.id === d.id)
      return `${i + 1}. ${d.id} - ${driverInfo?.desc || 'Unknown'} (${d.severity.toUpperCase()} severity, appeared ${d.count}x)`
    })
    .join('\n')

  const prompt = `Business profile:
${JSON.stringify(profile, null, 2)}

Sub-category: ${context.name}
Value at stake: $${valueAtStake.toLocaleString()}

Drivers identified (in priority order):
${driversFormatted}

Constraints to respect:
${profile.constraints.map((c) => `- ${c}`).join('\n')}

Generate exactly 3 tasks that:
1. Are specific to this ${profile.businessType} (${profile.team.total} staff${profile.team.ownerWorking ? ', owner-operated' : ''})
2. Address the top drivers identified above
3. Are completable in 1-3 hours each
4. Have clear, measurable "done" definitions
5. Respect their constraints
6. Use their specific context and terminology

Return JSON in this exact format:
{
  "tasks": [
    {
      "id": "t1",
      "title": "<action verb + specific task for their business>",
      "description": "<1-2 sentences using their context>",
      "doneDefinition": "<objective, verifiable completion criteria>",
      "benchmarkTarget": "<industry benchmark appropriate for their business type>",
      "delegateTo": "<who should do this: 'You' for owner, or specific role>",
      "estimatedEffort": "<time range like '1-2 hours'>",
      "improvesDrivers": ["<driver_id1>", "<driver_id2>"],
      "whyThisMatters": "<one sentence connecting this to business value>"
    }
  ]
}`

  return generateJSON<TaskGenerationResult>(prompt, TASK_GENERATION_SYSTEM, {
    model: 'claude-sonnet',
    temperature: 0.7,
  })
}

/**
 * Aggregate drivers from diagnostic responses
 */
export function aggregateDrivers(
  responses: Array<{ drivers: string[]; severity: 'high' | 'medium' | 'low' }>
): IdentifiedDriver[] {
  const driverMap = new Map<string, { count: number; severities: Array<'high' | 'medium' | 'low'> }>()

  for (const response of responses) {
    for (const driver of response.drivers) {
      const existing = driverMap.get(driver) || { count: 0, severities: [] }
      existing.count++
      existing.severities.push(response.severity)
      driverMap.set(driver, existing)
    }
  }

  // Convert to array and determine overall severity
  const drivers: IdentifiedDriver[] = []
  for (const [id, data] of driverMap) {
    // Severity is the highest seen
    const severity = data.severities.includes('high')
      ? 'high'
      : data.severities.includes('medium')
        ? 'medium'
        : 'low'

    drivers.push({ id, severity, count: data.count })
  }

  // Sort by: severity (high first), then count (higher first)
  const severityOrder = { high: 0, medium: 1, low: 2 }
  drivers.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return b.count - a.count
  })

  return drivers
}
