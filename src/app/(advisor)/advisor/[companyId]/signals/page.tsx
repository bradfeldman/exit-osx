'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ArrowLeft, Check, X, Plus, Shield, AlertTriangle } from 'lucide-react'

interface Signal {
  id: string
  channel: string
  category: string | null
  eventType: string
  severity: string
  confidence: string
  title: string
  description: string | null
  userConfirmed: boolean
  confirmedAt: string | null
  confirmedByUserId: string | null
  resolutionStatus: string
  resolutionNotes: string | null
  estimatedValueImpact: number | null
  createdAt: string
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200',
  INFO: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  UNCERTAIN: 'bg-zinc-100 text-zinc-600',
  SOMEWHAT_CONFIDENT: 'bg-yellow-100 text-yellow-700',
  CONFIDENT: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
}

export default function AdvisorSignalsPage() {
  const params = useParams()
  const companyId = params.companyId as string

  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending')
  const [dismissDialogSignal, setDismissDialogSignal] = useState<Signal | null>(null)
  const [dismissReason, setDismissReason] = useState('')
  const [addObservationOpen, setAddObservationOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newSeverity, setNewSeverity] = useState('MEDIUM')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/advisor/clients/${companyId}/signals`)
      if (res.ok) {
        const data = await res.json()
        setSignals(data.signals)
      }
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  const handleConfirm = async (signalId: string) => {
    setActionLoading(signalId)
    try {
      await fetch(`/api/advisor/clients/${companyId}/signals/${signalId}/confirm`, {
        method: 'POST',
      })
      await fetchSignals()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDismiss = async () => {
    if (!dismissDialogSignal || !dismissReason) return
    setActionLoading(dismissDialogSignal.id)
    try {
      await fetch(`/api/advisor/clients/${companyId}/signals/${dismissDialogSignal.id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: dismissReason }),
      })
      setDismissDialogSignal(null)
      setDismissReason('')
      await fetchSignals()
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddObservation = async () => {
    if (!newTitle) return
    setActionLoading('new')
    try {
      await fetch(`/api/advisor/clients/${companyId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          category: newCategory || null,
          severity: newSeverity,
        }),
      })
      setAddObservationOpen(false)
      setNewTitle('')
      setNewDescription('')
      setNewCategory('')
      setNewSeverity('MEDIUM')
      await fetchSignals()
    } finally {
      setActionLoading(null)
    }
  }

  const pendingSignals = signals.filter(s => !s.userConfirmed && s.resolutionStatus === 'OPEN')
  const reviewedSignals = signals.filter(s => s.userConfirmed || s.resolutionStatus === 'ACKNOWLEDGED' || s.resolutionStatus === 'DISMISSED')
  const displayedSignals = tab === 'pending' ? pendingSignals : reviewedSignals

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/advisor/${companyId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Client
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Signal Review
            </h1>
          </div>
          <Button size="sm" onClick={() => setAddObservationOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Observation
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={tab === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('pending')}
          >
            Pending Review ({pendingSignals.length})
          </Button>
          <Button
            variant={tab === 'reviewed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('reviewed')}
          >
            Reviewed ({reviewedSignals.length})
          </Button>
        </div>

        {/* Signal List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : displayedSignals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {tab === 'pending' ? 'No signals pending review' : 'No reviewed signals yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedSignals.map((signal) => (
              <Card key={signal.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={SEVERITY_COLORS[signal.severity]}>
                          {signal.severity}
                        </Badge>
                        {signal.category && (
                          <Badge variant="outline" className="text-xs">
                            {signal.category.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        <Badge variant="outline" className={CONFIDENCE_COLORS[signal.confidence]}>
                          {signal.confidence.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-sm">{signal.title}</h3>
                      {signal.description && (
                        <p className="text-xs text-muted-foreground mt-1">{signal.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {new Date(signal.createdAt).toLocaleDateString()} via {signal.channel.replace(/_/g, ' ').toLowerCase()}
                        {signal.estimatedValueImpact != null && (
                          <> &middot; Est. impact: ${Math.abs(signal.estimatedValueImpact).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                    {tab === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleConfirm(signal.id)}
                          disabled={actionLoading === signal.id}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => setDismissDialogSignal(signal)}
                          disabled={actionLoading === signal.id}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                    {tab === 'reviewed' && signal.userConfirmed && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Confirmed
                      </Badge>
                    )}
                    {tab === 'reviewed' && signal.resolutionStatus === 'DISMISSED' && (
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">
                          Dismissed
                        </Badge>
                        {signal.resolutionNotes && (
                          <p className="text-[11px] text-muted-foreground max-w-[200px] text-right">
                            {signal.resolutionNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dismiss Dialog */}
      <Dialog open={!!dismissDialogSignal} onOpenChange={() => setDismissDialogSignal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Signal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Why is this signal not relevant?
          </p>
          <Textarea
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="Provide a reason for dismissal..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogSignal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={!dismissReason || actionLoading === dismissDialogSignal?.id}
            >
              Dismiss Signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Observation Dialog */}
      <Dialog open={addObservationOpen} onOpenChange={setAddObservationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Advisor Observation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Key employee departure risk"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Additional context..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FINANCIAL">Financial</SelectItem>
                    <SelectItem value="TRANSFERABILITY">Transferability</SelectItem>
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="LEGAL_TAX">Legal/Tax</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Severity</label>
                <Select value={newSeverity} onValueChange={setNewSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddObservationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddObservation}
              disabled={!newTitle || actionLoading === 'new'}
            >
              Create Signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
