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

interface AddQuestionFlowProps {
  onBack: () => void
}

type Step = 'question' | 'answers' | 'mapping' | 'review'

interface AnswerOption {
  id: string
  text: string
  riskLevel: 'CRITICAL' | 'POTENTIAL' | 'LOW'
  score: string
  buyerInterpretation: string
}

interface QuestionData {
  category: string
  subCategory: string
  questionText: string
  helpText: string
  buyerLogic: string
  answers: AnswerOption[]
}

const BRI_CATEGORIES = [
  { value: 'FINANCIAL', label: 'Financial', weight: '25%' },
  { value: 'TRANSFERABILITY', label: 'Transferability', weight: '20%' },
  { value: 'OPERATIONAL', label: 'Operational', weight: '20%' },
  { value: 'MARKET', label: 'Market', weight: '15%' },
  { value: 'LEGAL_TAX', label: 'Legal & Tax', weight: '10%' },
  { value: 'PERSONAL', label: 'Personal Readiness', weight: '10%' },
]

const RISK_LEVELS = [
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600', scores: ['0.00', '0.33'] },
  { value: 'POTENTIAL', label: 'Potential', color: 'text-yellow-600', scores: ['0.33', '0.67'] },
  { value: 'LOW', label: 'Low', color: 'text-green-600', scores: ['1.00'] },
]

const DEFAULT_ANSWERS: AnswerOption[] = [
  { id: '1', text: '', riskLevel: 'CRITICAL', score: '0.00', buyerInterpretation: '' },
  { id: '2', text: '', riskLevel: 'LOW', score: '1.00', buyerInterpretation: '' },
]

const MIN_ANSWERS = 2
const MAX_ANSWERS = 5

export function AddQuestionFlow({ onBack }: AddQuestionFlowProps) {
  const [step, setStep] = useState<Step>('question')
  const [questionData, setQuestionData] = useState<QuestionData>({
    category: '',
    subCategory: '',
    questionText: '',
    helpText: '',
    buyerLogic: '',
    answers: DEFAULT_ANSWERS,
  })
  const [isSaving, setIsSaving] = useState(false)

  const updateAnswer = (index: number, field: keyof AnswerOption, value: string) => {
    const newAnswers = [...questionData.answers]
    newAnswers[index] = { ...newAnswers[index], [field]: value }
    setQuestionData({ ...questionData, answers: newAnswers })
  }

  const addAnswer = () => {
    if (questionData.answers.length >= MAX_ANSWERS) return
    const newId = String(Date.now())
    const newAnswer: AnswerOption = {
      id: newId,
      text: '',
      riskLevel: 'POTENTIAL',
      score: '0.50',
      buyerInterpretation: '',
    }
    setQuestionData({ ...questionData, answers: [...questionData.answers, newAnswer] })
  }

  const removeAnswer = (index: number) => {
    if (questionData.answers.length <= MIN_ANSWERS) return
    const newAnswers = questionData.answers.filter((_, i) => i !== index)
    setQuestionData({ ...questionData, answers: newAnswers })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/developer/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData),
      })
      if (response.ok) {
        alert('Question created successfully!')
        onBack()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (_error) {
      alert('Failed to save question')
    } finally {
      setIsSaving(false)
    }
  }

  const canProceedFromQuestion = questionData.category && questionData.questionText && questionData.buyerLogic
  const canProceedFromAnswers = questionData.answers.every(a => a.text && a.buyerInterpretation)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Add Question</h1>
          <p className="text-sm text-muted-foreground">
            Create a new BRI assessment question with answer options
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {(['question', 'answers', 'mapping', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : i < ['question', 'answers', 'mapping', 'review'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-2 text-sm ${step === s ? 'font-medium' : 'text-muted-foreground'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <div className="mx-4 h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Question Details */}
      {step === 'question' && (
        <Card>
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
            <CardDescription>
              Define the question that will be asked to assess buyer risk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">BRI Category *</Label>
                <Select
                  value={questionData.category}
                  onValueChange={(value) => setQuestionData({ ...questionData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRI_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label} ({cat.weight})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCategory">Sub-Category</Label>
                <Input
                  id="subCategory"
                  placeholder="e.g., Customer Concentration"
                  value={questionData.subCategory}
                  onChange={(e) => setQuestionData({ ...questionData, subCategory: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                placeholder="What percentage of revenue comes from your largest customer?"
                value={questionData.questionText}
                onChange={(e) => setQuestionData({ ...questionData, questionText: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerLogic">Buyer Logic * (Why buyers care)</Label>
              <Textarea
                id="buyerLogic"
                placeholder="Single customer >50% is often a deal-killer; buyers assume that customer could leave post-sale"
                value={questionData.buyerLogic}
                onChange={(e) => setQuestionData({ ...questionData, buyerLogic: e.target.value.slice(0, 200) })}
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {questionData.buyerLogic.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text (Guidance for founders)</Label>
              <Textarea
                id="helpText"
                placeholder="Consider all revenue sources including one-time projects..."
                value={questionData.helpText}
                onChange={(e) => setQuestionData({ ...questionData, helpText: e.target.value.slice(0, 200) })}
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {questionData.helpText.length}/200 characters
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('answers')} disabled={!canProceedFromQuestion}>
                Continue to Answers
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Answer Options */}
      {step === 'answers' && (
        <Card>
          <CardHeader>
            <CardTitle>Answer Options</CardTitle>
            <CardDescription>
              Define 2-5 answer options representing the risk spectrum from Critical to Low
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionData.answers.map((answer, index) => (
              <div key={answer.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Answer {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={answer.riskLevel}
                      onValueChange={(value) => updateAnswer(index, 'riskLevel', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <span className={level.color}>{level.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={answer.score}
                      onValueChange={(value) => updateAnswer(index, 'score', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.00">0.00</SelectItem>
                        <SelectItem value="0.25">0.25</SelectItem>
                        <SelectItem value="0.33">0.33</SelectItem>
                        <SelectItem value="0.50">0.50</SelectItem>
                        <SelectItem value="0.67">0.67</SelectItem>
                        <SelectItem value="0.75">0.75</SelectItem>
                        <SelectItem value="1.00">1.00</SelectItem>
                      </SelectContent>
                    </Select>
                    {questionData.answers.length > MIN_ANSWERS && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAnswer(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Answer Text *</Label>
                  <Input
                    placeholder="Greater than 50%"
                    value={answer.text}
                    onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Buyer Interpretation *</Label>
                  <Input
                    placeholder="Deal-killer: customer could leave post-sale"
                    value={answer.buyerInterpretation}
                    onChange={(e) => updateAnswer(index, 'buyerInterpretation', e.target.value)}
                  />
                </div>
              </div>
            ))}

            {questionData.answers.length < MAX_ANSWERS && (
              <Button
                variant="outline"
                onClick={addAnswer}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Answer Option ({questionData.answers.length}/{MAX_ANSWERS})
              </Button>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('question')}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('mapping')} disabled={!canProceedFromAnswers}>
                Continue to Task Mapping
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Task Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Task Mapping</CardTitle>
            <CardDescription>
              Map each non-LOW answer to canonical tasks that remediate the risk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Task mapping is currently simplified. In a full implementation,
                you would select from existing canonical tasks or create new ones here.
                For now, tasks will be auto-generated based on the question context.
              </p>
            </div>

            {questionData.answers.filter(a => a.riskLevel !== 'LOW').map((answer, _index) => (
              <div key={answer.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${
                    answer.riskLevel === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {answer.riskLevel}
                  </span>
                  <span className="text-sm text-muted-foreground">({answer.score})</span>
                </div>
                <p className="text-sm mb-3">&ldquo;{answer.text}&rdquo;</p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">Suggested Task:</p>
                  <p className="text-sm font-medium">
                    Address {questionData.subCategory || questionData.category} Risk
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Task will be auto-generated based on answer context
                  </p>
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('answers')}>
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

      {/* Step 4: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Save</CardTitle>
            <CardDescription>
              Review your question before saving to the Task Engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Question Details</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium">{BRI_CATEGORIES.find(c => c.value === questionData.category)?.label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Sub-Category</dt>
                    <dd className="font-medium">{questionData.subCategory || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Answer Options</dt>
                    <dd className="font-medium">{questionData.answers.length} options</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Question Text</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{questionData.questionText}</p>
                <h4 className="text-sm font-medium mb-2 mt-4">Buyer Logic</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{questionData.buyerLogic}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Answer Options</h4>
              <div className="border rounded-lg divide-y">
                {questionData.answers.map((answer, _index) => (
                  <div key={answer.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-medium ${
                        answer.riskLevel === 'CRITICAL' ? 'text-red-600' :
                        answer.riskLevel === 'POTENTIAL' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {answer.riskLevel} ({answer.score})
                      </span>
                      <p className="text-sm">{answer.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Question'}
                <CheckIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
