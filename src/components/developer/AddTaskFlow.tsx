'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { taskTemplates } from '@/lib/playbook/task-templates'

interface AddTaskFlowProps {
  onBack: () => void
}

type TabView = 'add' | 'templates'

type Step = 'task' | 'criteria' | 'mapping' | 'suppression' | 'review'

interface TaskData {
  taskTitle: string
  taskDescription: string
  actionType: string
  primaryCategory: string
  secondaryCategories: string[]
  effortLevel: string
  timeEstimate: string
  sprintCategory: string
  buyerConfidenceElasticity: string
  acceptanceCriteria: string
  evidenceType: string
  // Task mappings
  triggerAnswers: string[]
  // Suppression
  suppressesTasks: string[]
}

const ACTION_TYPES = [
  { value: 'TYPE_I_EVIDENCE', label: 'I. Evidence & Proof', description: 'Upload proof of existing state' },
  { value: 'TYPE_II_DOCUMENTATION', label: 'II. Documentation & Formalization', description: 'Create formal documentation' },
  { value: 'TYPE_III_OPERATIONAL_CHANGE', label: 'III. Operational Change', description: 'Change business operations' },
  { value: 'TYPE_IV_INSTITUTIONALIZATION', label: 'IV. Institutionalization', description: 'Embed into company structure' },
  { value: 'TYPE_V_RISK_REDUCTION', label: 'V. Risk Reduction', description: 'Structural risk elimination' },
  { value: 'TYPE_VI_ALIGNMENT', label: 'VI. Alignment & Clarity', description: 'Stakeholder alignment' },
  { value: 'TYPE_VII_READINESS', label: 'VII. Readiness & Packaging', description: 'Prepare buyer-facing materials' },
  { value: 'TYPE_VIII_SIGNALING', label: 'VIII. Signaling & Perception', description: 'Signal quality to buyers' },
  { value: 'TYPE_IX_OPTION_CREATION', label: 'IX. Option Creation', description: 'Create alternatives/backups' },
  { value: 'TYPE_X_DEFER', label: 'X. Defer / Accept', description: 'Consciously accept risk' },
]

const BRI_CATEGORIES = [
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'TRANSFERABILITY', label: 'Transferability' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'MARKET', label: 'Market' },
  { value: 'LEGAL_TAX', label: 'Legal & Tax' },
  { value: 'PERSONAL', label: 'Personal Readiness' },
]

const EFFORT_LEVELS = [
  { value: 'EASY', label: 'Easy', multiplier: '0.5x' },
  { value: 'LOW', label: 'Low', multiplier: '1.0x' },
  { value: 'MEDIUM', label: 'Medium', multiplier: '2.0x' },
  { value: 'HIGH', label: 'High', multiplier: '4.0x' },
  { value: 'SIGNIFICANT', label: 'Significant', multiplier: '8.0x' },
]

const TIME_ESTIMATES = [
  { value: 'ONE_DAY', label: '1 Day' },
  { value: 'ONE_WEEK', label: '1 Week' },
  { value: 'ONE_MONTH', label: '1 Month' },
  { value: 'THREE_MONTHS', label: '3 Months' },
  { value: 'ONE_YEAR', label: '1 Year' },
]

const SPRINT_CATEGORIES = [
  { value: 'BIG_ROCK', label: 'Big Rock', description: 'Deal-critical, must complete before exit' },
  { value: 'SAND', label: 'Sand', description: 'Material but non-blocking' },
  { value: 'WATER', label: 'Water', description: 'Quick wins with outsized impact' },
]

const FORBIDDEN_PATTERNS = ['improve', 'optimize', 'enhance', 'support', 'assist']

export function AddTaskFlow({ onBack }: AddTaskFlowProps) {
  const [activeTab, setActiveTab] = useState<TabView>('add')
  const [step, setStep] = useState<Step>('task')
  const [taskData, setTaskData] = useState<TaskData>({
    taskTitle: '',
    taskDescription: '',
    actionType: '',
    primaryCategory: '',
    secondaryCategories: [],
    effortLevel: 'MEDIUM',
    timeEstimate: 'ONE_WEEK',
    sprintCategory: 'SAND',
    buyerConfidenceElasticity: '0.5',
    acceptanceCriteria: '',
    evidenceType: 'UPLOAD',
    triggerAnswers: [],
    suppressesTasks: [],
  })
  const [titleWarning, setTitleWarning] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const validateTitle = (title: string) => {
    const lowerTitle = title.toLowerCase()
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (lowerTitle.includes(pattern)) {
        setTitleWarning(`Task title contains forbidden word: "${pattern}". Use specific, actionable language.`)
        return false
      }
    }
    setTitleWarning(null)
    return true
  }

  const handleTitleChange = (value: string) => {
    setTaskData({ ...taskData, taskTitle: value })
    validateTitle(value)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/developer/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })
      if (response.ok) {
        alert('Task created successfully!')
        onBack()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      alert('Failed to save task')
    } finally {
      setIsSaving(false)
    }
  }

  const canProceedFromTask = taskData.taskTitle && taskData.taskDescription && taskData.actionType && taskData.primaryCategory && !titleWarning
  const canProceedFromCriteria = taskData.acceptanceCriteria.length > 20

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Task Engine</h1>
          <p className="text-sm text-muted-foreground">
            Create new tasks or view existing templates
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('add')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'add'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Add Task
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            View Templates ({taskTemplates.length})
          </button>
        </nav>
      </div>

      {/* Templates View */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              These are the task templates defined in <code className="bg-blue-100 px-1 rounded">task-templates.ts</code>.
              Tasks are automatically generated for users based on their assessment responses.
            </p>
          </div>

          {taskTemplates.map((template, templateIndex) => (
            <Card key={templateIndex}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Pattern: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{template.questionPattern}</code>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Category: {template.briCategory} | Score Threshold: {template.scoreThreshold}
                    </CardDescription>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {task.actionType.replace('TYPE_', '').replace(/_/g, ' ')}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Effort: {task.effortLevel}
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          {task.estimatedHours}h
                        </span>
                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                          Upgrade: {task.upgradeFromScore.toFixed(2)} → {task.upgradeToScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Task Flow */}
      {activeTab === 'add' && (
        <>
          {/* Progress Steps */}
          <div className="flex items-center gap-2">
        {(['task', 'criteria', 'mapping', 'suppression', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['task', 'criteria', 'mapping', 'suppression', 'review'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-2 text-sm hidden md:inline ${step === s ? 'font-medium' : 'text-muted-foreground'}`}>
              {s === 'criteria' ? 'Acceptance' : s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 4 && <div className="mx-2 md:mx-4 h-px w-4 md:w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Task Details */}
      {step === 'task' && (
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>
              Define the task that will remediate buyer-perceived risk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title *</Label>
              <Input
                id="taskTitle"
                placeholder="Assemble Customer Concentration Report"
                value={taskData.taskTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={titleWarning ? 'border-red-500' : ''}
              />
              {titleWarning && (
                <p className="text-sm text-red-500">{titleWarning}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use specific, actionable language. Avoid: improve, optimize, enhance, support, assist
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription">Task Description *</Label>
              <Textarea
                id="taskDescription"
                placeholder="Create a dated report showing revenue by customer, highlighting concentration risks..."
                value={taskData.taskDescription}
                onChange={(e) => setTaskData({ ...taskData, taskDescription: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionType">Action Type *</Label>
              <Select
                value={taskData.actionType}
                onValueChange={(value) => setTaskData({ ...taskData, actionType: value })}
              >
                <SelectTrigger id="actionType">
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryCategory">Primary Category *</Label>
                <Select
                  value={taskData.primaryCategory}
                  onValueChange={(value) => setTaskData({ ...taskData, primaryCategory: value })}
                >
                  <SelectTrigger id="primaryCategory">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRI_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sprintCategory">Sprint Category</Label>
                <Select
                  value={taskData.sprintCategory}
                  onValueChange={(value) => setTaskData({ ...taskData, sprintCategory: value })}
                >
                  <SelectTrigger id="sprintCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPRINT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div>
                          <span className="font-medium">{cat.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">- {cat.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effortLevel">Effort Level</Label>
                <Select
                  value={taskData.effortLevel}
                  onValueChange={(value) => setTaskData({ ...taskData, effortLevel: value })}
                >
                  <SelectTrigger id="effortLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EFFORT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label} ({level.multiplier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeEstimate">Time Estimate</Label>
                <Select
                  value={taskData.timeEstimate}
                  onValueChange={(value) => setTaskData({ ...taskData, timeEstimate: value })}
                >
                  <SelectTrigger id="timeEstimate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_ESTIMATES.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="elasticity">Buyer Confidence Elasticity</Label>
                <Select
                  value={taskData.buyerConfidenceElasticity}
                  onValueChange={(value) => setTaskData({ ...taskData, buyerConfidenceElasticity: value })}
                >
                  <SelectTrigger id="elasticity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">0.1 (Low impact)</SelectItem>
                    <SelectItem value="0.3">0.3</SelectItem>
                    <SelectItem value="0.5">0.5 (Medium)</SelectItem>
                    <SelectItem value="0.7">0.7</SelectItem>
                    <SelectItem value="1.0">1.0 (High impact)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('criteria')} disabled={!canProceedFromTask}>
                Continue to Acceptance Criteria
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Acceptance Criteria */}
      {step === 'criteria' && (
        <Card>
          <CardHeader>
            <CardTitle>Acceptance Criteria</CardTitle>
            <CardDescription>
              Define binary, evidence-based criteria that prove task completion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Acceptance Criteria Requirements</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>Must be <strong>binary</strong> - done or not done, no partial credit</li>
                <li>Must require <strong>evidence upload</strong> or system verification</li>
                <li>Must be <strong>buyer-legible</strong> - a buyer would recognize this as proof</li>
                <li>Must be <strong>specific</strong> - no ambiguity about what &ldquo;done&rdquo; means</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acceptanceCriteria">Acceptance Criteria *</Label>
              <Textarea
                id="acceptanceCriteria"
                placeholder="Upload a dated customer concentration report showing revenue by customer, highlighting the top 10 customers and confirming no single customer exceeds 20% of total revenue. Document must reconcile to financial statements."
                value={taskData.acceptanceCriteria}
                onChange={(e) => setTaskData({ ...taskData, acceptanceCriteria: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                {taskData.acceptanceCriteria.length} characters (minimum 20 required)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidenceType">Evidence Type</Label>
              <Select
                value={taskData.evidenceType}
                onValueChange={(value) => setTaskData({ ...taskData, evidenceType: value })}
              >
                <SelectTrigger id="evidenceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPLOAD">Upload Required</SelectItem>
                  <SelectItem value="SYSTEM_VERIFIED">System Verified</SelectItem>
                  <SelectItem value="SELF_ATTESTED">Self Attested</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('task')}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('mapping')} disabled={!canProceedFromCriteria}>
                Continue to Answer Mapping
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Answer Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Answer Mapping</CardTitle>
            <CardDescription>
              Map this task to question answers that should trigger it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Answer mapping is simplified in this version.
                In the full implementation, you would select specific question answers that trigger this task.
                For now, the task will be available for manual assignment.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Task Summary</h4>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>{taskData.taskTitle}</strong> will be triggered when users have CRITICAL or POTENTIAL
                risk answers in the <strong>{BRI_CATEGORIES.find(c => c.value === taskData.primaryCategory)?.label}</strong> category.
              </p>
              <p className="text-xs text-muted-foreground">
                Action Type: {ACTION_TYPES.find(t => t.value === taskData.actionType)?.label}
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('criteria')}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('suppression')}>
                Continue to Suppression Rules
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Suppression Rules */}
      {step === 'suppression' && (
        <Card>
          <CardHeader>
            <CardTitle>Task Suppression</CardTitle>
            <CardDescription>
              Define which tasks this task makes unnecessary when completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Suppression Hierarchy</h4>
              <p className="text-sm text-blue-800 mb-2">
                Higher-order action types typically suppress lower-order tasks on the same topic:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>Type IV (Institutionalization) → suppresses Types I, II, III</li>
                <li>Type III (Operational Change) → suppresses Types I, II</li>
                <li>Type V (Risk Reduction) → suppresses Types I, II</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">This Task</h4>
              <p className="text-sm">
                <strong>{taskData.taskTitle}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {ACTION_TYPES.find(t => t.value === taskData.actionType)?.label}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Task suppression mapping is simplified in this version.
                Suppression rules will be auto-generated based on action type hierarchy.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('review')}>
                Continue to Review
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Save</CardTitle>
            <CardDescription>
              Review your task before saving to the Task Engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Task Details</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="font-medium">{taskData.taskTitle}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Action Type</dt>
                    <dd className="font-medium">{ACTION_TYPES.find(t => t.value === taskData.actionType)?.label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Primary Category</dt>
                    <dd className="font-medium">{BRI_CATEGORIES.find(c => c.value === taskData.primaryCategory)?.label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Sprint Category</dt>
                    <dd className="font-medium">{SPRINT_CATEGORIES.find(c => c.value === taskData.sprintCategory)?.label}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Effort & Impact</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Effort Level</dt>
                    <dd className="font-medium">{EFFORT_LEVELS.find(l => l.value === taskData.effortLevel)?.label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Time Estimate</dt>
                    <dd className="font-medium">{TIME_ESTIMATES.find(t => t.value === taskData.timeEstimate)?.label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Buyer Confidence Elasticity</dt>
                    <dd className="font-medium">{taskData.buyerConfidenceElasticity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Evidence Type</dt>
                    <dd className="font-medium">{taskData.evidenceType}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm bg-gray-50 p-3 rounded">{taskData.taskDescription}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Acceptance Criteria</h4>
              <p className="text-sm bg-gray-50 p-3 rounded">{taskData.acceptanceCriteria}</p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('suppression')}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Task'}
                <CheckIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
