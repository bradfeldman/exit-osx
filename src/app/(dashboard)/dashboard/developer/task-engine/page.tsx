'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AddQuestionFlow } from '@/components/developer/AddQuestionFlow'
import { AddTaskFlow } from '@/components/developer/AddTaskFlow'
import { TaskViewer } from '@/components/developer/TaskViewer'

type FlowType = 'select' | 'question' | 'task' | 'viewer'

interface SearchOption {
  id: string
  text: string
  score: number
  displayOrder: number
  matches: boolean
}

interface SearchResult {
  id: string
  category: string
  questionText: string
  helpText: string | null
  displayOrder: number
  maxImpactPoints: number
  matchType: 'question' | 'helpText' | 'answer'
  options: SearchOption[]
  matchingOptionsCount: number
}

export default function TaskEnginePage() {
  const [activeFlow, setActiveFlow] = useState<FlowType>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/developer/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.questions || [])
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search
  const debounceSearch = useCallback((query: string) => {
    const timeoutId = setTimeout(() => handleSearch(query), 300)
    return () => clearTimeout(timeoutId)
  }, [handleSearch])

  const handleBack = () => {
    setActiveFlow('select')
  }

  if (activeFlow === 'question') {
    return <AddQuestionFlow onBack={handleBack} />
  }

  if (activeFlow === 'task') {
    return <AddTaskFlow onBack={handleBack} />
  }

  if (activeFlow === 'viewer') {
    return <TaskViewer onBack={handleBack} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Task Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add questions and tasks to the BRI assessment system. Questions capture buyer risk signals,
          tasks define remediation actions that increase enterprise value.
        </p>
      </div>

      {/* Search Existing Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            Search Existing Questions & Answers
          </CardTitle>
          <CardDescription>
            Before creating new content, search to see if a similar question or answer already exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search by keyword (e.g., 'revenue', 'customer', 'contract')..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                debounceSearch(e.target.value)
              }}
              className="pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LoadingSpinner className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Search Results */}
          {hasSearched && (
            <div className="mt-4">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No matching questions found for &quot;{searchQuery}&quot;
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <p className="text-xs text-muted-foreground">
                    Found {searchResults.length} matching question{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="border rounded-lg p-3 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-foreground leading-tight">
                          {result.questionText}
                        </p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {formatCategory(result.category)}
                        </Badge>
                      </div>
                      {result.helpText && (
                        <p className="text-xs text-muted-foreground mb-2 italic">
                          {result.helpText}
                        </p>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Answers:</p>
                        {result.options.map((opt, idx) => (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between text-xs pl-2 py-0.5 rounded ${
                              opt.matches ? 'bg-yellow-50 border-l-2 border-yellow-400' : ''
                            }`}
                          >
                            <span className={opt.matches ? 'font-medium' : 'text-muted-foreground'}>
                              {idx + 1}. {opt.text}
                            </span>
                            <span className={`${getScoreColor(Number(opt.score))}`}>
                              {Number(opt.score).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {result.matchingOptionsCount > 0 && (
                        <p className="text-xs text-yellow-600 mt-2">
                          {result.matchingOptionsCount} answer{result.matchingOptionsCount !== 1 ? 's' : ''} match your search
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Point Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* View Tasks Card */}
        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col" onClick={() => setActiveFlow('viewer')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <ListIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">View Tasks</CardTitle>
                <CardDescription>Browse all tasks for a company</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                View all tasks for the selected company with their statuses, values, and details.
                Filter by status or category.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">View:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Pending, In Progress, Completed tasks</li>
                  <li>Deferred, Blocked, Cancelled tasks</li>
                  <li>Task values and recoverable amounts</li>
                  <li>Filter by status or BRI category</li>
                </ul>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              View All Tasks
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Add Question Card */}
        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col" onClick={() => setActiveFlow('question')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <QuestionIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Add Question</CardTitle>
                <CardDescription>Create a new BRI assessment question</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Start here when you identify a new buyer concern that should be assessed.
                You&apos;ll define the question, answer options with risk levels, and map to remediation tasks.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Flow:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  <li>Define question text and category</li>
                  <li>Create 4 answer options (Critical → Low risk)</li>
                  <li>Map answers to canonical tasks</li>
                  <li>Set question weight and assessment type</li>
                </ol>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              Start with Question
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Add Task Card */}
        <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col" onClick={() => setActiveFlow('task')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TaskIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Add Task</CardTitle>
                <CardDescription>Create a new canonical task</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                Start here when you have a specific remediation action that addresses buyer risk.
                You&apos;ll define the task with acceptance criteria and map it to triggering answers.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Flow:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  <li>Define task title and description</li>
                  <li>Set action type, effort, and time estimate</li>
                  <li>Write binary acceptance criteria</li>
                  <li>Map to triggering question answers</li>
                </ol>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              Start with Task
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* Categories */}
            <div>
              <h4 className="font-medium mb-2">BRI Categories</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex justify-between"><span>Financial</span><span className="text-foreground">25%</span></li>
                <li className="flex justify-between"><span>Transferability</span><span className="text-foreground">20%</span></li>
                <li className="flex justify-between"><span>Operational</span><span className="text-foreground">20%</span></li>
                <li className="flex justify-between"><span>Market</span><span className="text-foreground">15%</span></li>
                <li className="flex justify-between"><span>Legal & Tax</span><span className="text-foreground">10%</span></li>
                <li className="flex justify-between"><span>Personal Readiness</span><span className="text-foreground">10%</span></li>
              </ul>
            </div>

            {/* Action Types */}
            <div>
              <h4 className="font-medium mb-2">Action Types</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li><span className="text-foreground">I.</span> Evidence & Proof</li>
                <li><span className="text-foreground">II.</span> Documentation & Formalization</li>
                <li><span className="text-foreground">III.</span> Operational Change</li>
                <li><span className="text-foreground">IV.</span> Institutionalization</li>
                <li><span className="text-foreground">V.</span> Risk Reduction</li>
                <li><span className="text-foreground">VI.</span> Alignment & Clarity</li>
                <li><span className="text-foreground">VII.</span> Readiness & Packaging</li>
                <li><span className="text-foreground">VIII.</span> Signaling & Perception</li>
                <li><span className="text-foreground">IX.</span> Option Creation</li>
                <li><span className="text-foreground">X.</span> Defer / Accept</li>
              </ul>
            </div>

            {/* Risk Levels */}
            <div>
              <h4 className="font-medium mb-2">Risk Levels & Scores</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex justify-between"><span className="text-red-600">Critical</span><span>0.00 or 0.33</span></li>
                <li className="flex justify-between"><span className="text-yellow-600">Potential</span><span>0.33 or 0.67</span></li>
                <li className="flex justify-between"><span className="text-green-600">Low</span><span>1.00</span></li>
              </ul>
              <h4 className="font-medium mb-2 mt-4">Forbidden Task Patterns</h4>
              <ul className="space-y-0.5 text-muted-foreground text-xs">
                <li className="text-red-500">Improve, Optimize, Enhance</li>
                <li className="text-red-500">Support, Assist</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'FINANCIAL': 'Financial',
    'TRANSFERABILITY': 'Transferability',
    'OPERATIONAL': 'Operational',
    'MARKET': 'Market',
    'LEGAL_TAX': 'Legal & Tax',
    'PERSONAL_READINESS': 'Personal Readiness',
  }
  return categoryMap[category] || category
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600'
  if (score >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}
