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

export interface DocumentUploadData {
  documentId: string
  documentName: string
  evidenceCategory: string
  expectedDocumentId: string | null
  source: 'direct' | 'task' | 'integration'
  linkedTaskId: string | null
  mimeType: string | null
  fileSize: number | null
}

export interface AdvisorSignalData {
  advisorUserId: string
  observationType: 'advisor_observation' | 'advisor_confirmation' | 'advisor_denial'
  originalSignalId?: string
  previousConfidence?: string
  newConfidence?: string
  reason?: string
}
