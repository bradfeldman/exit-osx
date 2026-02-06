export interface TimeDecayData {
  entityType: 'document' | 'financial_period'
  entityId: string
  entityName: string
  lastUpdated: string
  daysSinceUpdate: number
  thresholdDays: number
}

export interface TaskGeneratedData {
  taskId: string
  taskTitle: string
  previousStatus: string
  newStatus: string
  completedValue: number | null
}

export interface PromptedDisclosureData {
  promptSetId: string
  questionKey: string
  questionText: string
  followUpAnswer?: string
}

export interface ExternalSignalData {
  integrationProvider: string
  changeType: string
  previousValue?: string | number
  newValue?: string | number
}
