'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Loader2,
  GitMerge,
  Building2,
  User,
  ArrowRight,
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'

interface EntityDetail {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string | null
  website?: string | null
  currentTitle?: string | null
  dataQuality: string
}

interface DuplicateCandidate {
  id: string
  entityType: 'COMPANY' | 'PERSON'
  companyAId?: string | null
  companyBId?: string | null
  personAId?: string | null
  personBId?: string | null
  confidence: number
  matchReasons: string[]
  status: 'PENDING' | 'RESOLVED' | 'SKIPPED'
  createdAt: string
  companyA?: EntityDetail | null
  companyB?: EntityDetail | null
  personA?: EntityDetail | null
  personB?: EntityDetail | null
}

interface Summary {
  companies: { pending: number; resolved: number; skipped: number }
  people: { pending: number; resolved: number; skipped: number }
}

const confidenceColors = (confidence: number) => {
  if (confidence >= 0.9) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export function DuplicateReviewQueue() {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null)
  const [actionType, setActionType] = useState<'merge' | 'dismiss' | null>(null)
  const [isActioning, setIsActioning] = useState(false)
  const [filter, setFilter] = useState<'all' | 'COMPANY' | 'PERSON'>('all')

  const fetchDuplicates = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('status', 'PENDING')
      if (filter !== 'all') params.set('entityType', filter === 'COMPANY' ? 'company' : 'person')

      const res = await fetch(`/api/canonical/duplicates?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.candidates || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchDuplicates()
  }, [fetchDuplicates])

  const runDetection = async () => {
    setIsRunning(true)
    try {
      const res = await fetch('/api/canonical/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        await fetchDuplicates()
      }
    } catch (error) {
      console.error('Error running detection:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const handleAction = async () => {
    if (!selectedCandidate || !actionType) return

    setIsActioning(true)
    try {
      // Determine the primary ID (the one to keep) for merge
      const primaryId = selectedCandidate.entityType === 'COMPANY'
        ? selectedCandidate.companyBId // Keep the second one (usually higher quality)
        : selectedCandidate.personBId

      const res = await fetch(`/api/canonical/duplicates/${selectedCandidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: actionType === 'merge' ? 'MERGE' : 'NOT_DUPLICATE',
          primaryId: actionType === 'merge' ? primaryId : undefined,
        }),
      })

      if (res.ok) {
        await fetchDuplicates()
      }
    } catch (error) {
      console.error('Error processing duplicate:', error)
    } finally {
      setIsActioning(false)
      setSelectedCandidate(null)
      setActionType(null)
    }
  }

  const getEntityA = (candidate: DuplicateCandidate): EntityDetail | null => {
    return candidate.entityType === 'COMPANY' ? candidate.companyA || null : candidate.personA || null
  }

  const getEntityB = (candidate: DuplicateCandidate): EntityDetail | null => {
    return candidate.entityType === 'COMPANY' ? candidate.companyB || null : candidate.personB || null
  }

  const getEntityName = (entity: EntityDetail | null): string => {
    if (!entity) return 'Unknown'
    if (entity.name) return entity.name
    if (entity.firstName || entity.lastName) {
      return `${entity.firstName || ''} ${entity.lastName || ''}`.trim()
    }
    return 'Unknown'
  }

  const pendingCompanies = summary?.companies?.pending || 0
  const pendingPeople = summary?.people?.pending || 0
  const resolvedCompanies = summary?.companies?.resolved || 0
  const resolvedPeople = summary?.people?.resolved || 0

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{pendingCompanies + pendingPeople}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{resolvedCompanies + resolvedPeople}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{(summary?.companies?.skipped || 0) + (summary?.people?.skipped || 0)}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('cursor-pointer transition-all', filter === 'COMPANY' && 'ring-2 ring-primary')}>
          <CardContent className="p-4" onClick={() => setFilter(filter === 'COMPANY' ? 'all' : 'COMPANY')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{pendingCompanies}</p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('cursor-pointer transition-all', filter === 'PERSON' && 'ring-2 ring-primary')}>
          <CardContent className="p-4" onClick={() => setFilter(filter === 'PERSON' ? 'all' : 'PERSON')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{pendingPeople}</p>
                <p className="text-sm text-muted-foreground">People</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Pending Review</h2>
        <Button
          onClick={runDetection}
          disabled={isRunning}
          variant="outline"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Detection
            </>
          )}
        </Button>
      </div>

      {/* Duplicates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
              <p className="text-lg font-medium">No duplicates to review</p>
              <p className="text-sm mt-1">Run detection to find potential duplicates</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => {
            const entityA = getEntityA(candidate)
            const entityB = getEntityB(candidate)

            return (
              <Card key={candidate.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Entity A */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {candidate.entityType === 'COMPANY' ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className="font-medium truncate">{getEntityName(entityA)}</p>
                        </div>
                        {entityA?.email && (
                          <p className="text-sm text-muted-foreground truncate">{entityA.email}</p>
                        )}
                        {entityA?.website && (
                          <p className="text-sm text-muted-foreground truncate">{entityA.website}</p>
                        )}
                        {entityA?.currentTitle && (
                          <p className="text-sm text-muted-foreground truncate">{entityA.currentTitle}</p>
                        )}
                        {entityA?.dataQuality && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {entityA.dataQuality}
                          </Badge>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <Badge className={cn('text-xs mt-1', confidenceColors(candidate.confidence))}>
                          {Math.round(candidate.confidence * 100)}%
                        </Badge>
                      </div>

                      {/* Entity B */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {candidate.entityType === 'COMPANY' ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className="font-medium truncate">{getEntityName(entityB)}</p>
                        </div>
                        {entityB?.email && (
                          <p className="text-sm text-muted-foreground truncate">{entityB.email}</p>
                        )}
                        {entityB?.website && (
                          <p className="text-sm text-muted-foreground truncate">{entityB.website}</p>
                        )}
                        {entityB?.currentTitle && (
                          <p className="text-sm text-muted-foreground truncate">{entityB.currentTitle}</p>
                        )}
                        {entityB?.dataQuality && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {entityB.dataQuality}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedCandidate(candidate)
                          setActionType('merge')
                        }}
                      >
                        <GitMerge className="h-4 w-4 mr-1" />
                        Merge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCandidate(candidate)
                          setActionType('dismiss')
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Not Duplicate
                      </Button>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  {candidate.matchReasons && candidate.matchReasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Match reasons: {candidate.matchReasons.join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedCandidate && !!actionType} onOpenChange={(open: boolean) => {
        if (!open) {
          setSelectedCandidate(null)
          setActionType(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'merge' ? 'Merge Duplicates' : 'Mark as Not Duplicate'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'merge' && selectedCandidate ? (
                <>
                  This will merge <strong>{getEntityName(getEntityA(selectedCandidate))}</strong> into{' '}
                  <strong>{getEntityName(getEntityB(selectedCandidate))}</strong>. All related records will be updated.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will mark this pair as not duplicates. They will no longer appear in the review queue.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCandidate(null)
                setActionType(null)
              }}
              disabled={isActioning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isActioning}
            >
              {isActioning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === 'merge' ? (
                'Merge'
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
