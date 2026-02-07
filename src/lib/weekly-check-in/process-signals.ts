import { createSignal } from '@/lib/signals/create-signal'

interface CheckInAnswers {
  companyId: string
  taskStatus: string | null
  teamChanges: boolean | null
  teamChangesNote: string | null
  customerChanges: boolean | null
  customerChangesNote: string | null
  confidenceRating: number | null
  additionalNotes: string | null
}

export async function processCheckInSignals(answers: CheckInAnswers) {
  const signals: Array<{ eventType: string }> = []

  // Q1: Task blocked
  if (answers.taskStatus === 'blocked') {
    await createSignal({
      companyId: answers.companyId,
      channel: 'PROMPTED_DISCLOSURE',
      category: null,
      eventType: 'weekly_task_blocked',
      severity: 'MEDIUM',
      confidence: 'CONFIDENT',
      title: 'Weekly check-in: Tasks are blocked',
      description: 'Founder reported tasks are blocked during weekly check-in.',
    })
    signals.push({ eventType: 'weekly_task_blocked' })
  }

  // Q2: Team changes
  if (answers.teamChanges === true) {
    await createSignal({
      companyId: answers.companyId,
      channel: 'PROMPTED_DISCLOSURE',
      category: 'TRANSFERABILITY',
      eventType: 'weekly_team_change',
      severity: 'MEDIUM',
      confidence: 'CONFIDENT',
      title: 'Weekly check-in: Team changes reported',
      description: answers.teamChangesNote
        ? `Founder reported team changes: ${answers.teamChangesNote}`
        : 'Founder reported team changes during weekly check-in.',
    })
    signals.push({ eventType: 'weekly_team_change' })
  }

  // Q3: Customer changes
  if (answers.customerChanges === true) {
    await createSignal({
      companyId: answers.companyId,
      channel: 'PROMPTED_DISCLOSURE',
      category: 'FINANCIAL',
      eventType: 'weekly_customer_change',
      severity: 'MEDIUM',
      confidence: 'CONFIDENT',
      title: 'Weekly check-in: Customer changes reported',
      description: answers.customerChangesNote
        ? `Founder reported customer changes: ${answers.customerChangesNote}`
        : 'Founder reported customer changes during weekly check-in.',
    })
    signals.push({ eventType: 'weekly_customer_change' })
  }

  // Q4: Low confidence (1 or 2)
  if (answers.confidenceRating !== null && answers.confidenceRating <= 2) {
    await createSignal({
      companyId: answers.companyId,
      channel: 'PROMPTED_DISCLOSURE',
      category: 'PERSONAL',
      eventType: 'weekly_low_exit_confidence',
      severity: 'HIGH',
      confidence: 'CONFIDENT',
      title: 'Weekly check-in: Low exit confidence',
      description: `Founder rated exit confidence ${answers.confidenceRating}/5 during weekly check-in.`,
    })
    signals.push({ eventType: 'weekly_low_exit_confidence' })
  }

  // Q5: Additional notes
  if (answers.additionalNotes && answers.additionalNotes.trim().length > 0) {
    await createSignal({
      companyId: answers.companyId,
      channel: 'PROMPTED_DISCLOSURE',
      category: null,
      eventType: 'weekly_buyer_note',
      severity: 'LOW',
      confidence: 'CONFIDENT',
      title: 'Weekly check-in: Buyer-relevant note',
      description: answers.additionalNotes.trim(),
    })
    signals.push({ eventType: 'weekly_buyer_note' })
  }

  return signals
}
