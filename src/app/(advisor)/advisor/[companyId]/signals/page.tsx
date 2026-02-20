'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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
import styles from '@/components/advisor/advisor.module.css'

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

// Severity → CSS module class name lookup
const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: styles.severityCritical,
  HIGH: styles.severityHigh,
  MEDIUM: styles.severityMedium,
  LOW: styles.severityLow,
  INFO: styles.severityInfo,
}

// Confidence → CSS module class name lookup
const CONFIDENCE_CLASS: Record<string, string> = {
  UNCERTAIN: styles.confidenceUncertain,
  SOMEWHAT_CONFIDENT: styles.confidenceSomewhat,
  CONFIDENT: styles.confidenceConfident,
  VERIFIED: styles.confidenceVerified,
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
    <div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href={`/advisor/${companyId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Client
              </Button>
            </Link>
            <div className={styles.divider} />
            <h1 className={styles.signalPageTitle}>
              <Shield className={styles.signalPageTitleIcon} style={{ width: 20, height: 20 }} />
              Signal Review
            </h1>
          </div>
          <Button size="sm" onClick={() => setAddObservationOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Observation
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Tabs */}
        <div className={styles.tabRow}>
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
          <div className={styles.emptyState}>
            <div className={styles.spinner} style={{ margin: '0 auto' }} />
          </div>
        ) : displayedSignals.length === 0 ? (
          <div className={styles.signalCard}>
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <AlertTriangle style={{ width: 32, height: 32 }} />
              </div>
              <p>
                {tab === 'pending' ? 'No signals pending review' : 'No reviewed signals yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.signalList}>
            {displayedSignals.map((signal) => (
              <div key={signal.id} className={styles.signalCard}>
                <div className={styles.signalCardBody}>
                  <div className={styles.signalContent}>
                    <div className={styles.signalBadgeRow}>
                      <Badge variant="outline" className={SEVERITY_CLASS[signal.severity]}>
                        {signal.severity}
                      </Badge>
                      {signal.category && (
                        <Badge variant="outline" className="text-xs">
                          {signal.category.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      <Badge variant="outline" className={CONFIDENCE_CLASS[signal.confidence]}>
                        {signal.confidence.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className={styles.signalTitle}>{signal.title}</p>
                    {signal.description && (
                      <p className={styles.signalDescription}>{signal.description}</p>
                    )}
                    <p className={styles.signalMeta}>
                      {new Date(signal.createdAt).toLocaleDateString()} via {signal.channel.replace(/_/g, ' ').toLowerCase()}
                      {signal.estimatedValueImpact != null && (
                        <> &middot; Est. impact: ${Math.abs(signal.estimatedValueImpact).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  {tab === 'pending' && (
                    <div className={styles.signalActions}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-dark border-green/20 hover:bg-green-light"
                        onClick={() => handleConfirm(signal.id)}
                        disabled={actionLoading === signal.id}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-dark border-red/20 hover:bg-red-light"
                        onClick={() => setDismissDialogSignal(signal)}
                        disabled={actionLoading === signal.id}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                  {tab === 'reviewed' && signal.userConfirmed && (
                    <Badge className={styles.badgeConfirmed}>
                      Confirmed
                    </Badge>
                  )}
                  {tab === 'reviewed' && signal.resolutionStatus === 'DISMISSED' && (
                    <div className={styles.signalDismissedNotes}>
                      <Badge className={styles.badgeDismissed}>
                        Dismissed
                      </Badge>
                      {signal.resolutionNotes && (
                        <p className={styles.signalDismissedNotesText}>
                          {signal.resolutionNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
          <p className={styles.dialogHint}>
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
          <div className={styles.dialogBody}>
            <div>
              <label className={styles.dialogLabel}>Title</label>
              <input
                type="text"
                className={styles.dialogInput}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Key employee departure risk"
              />
            </div>
            <div>
              <label className={styles.dialogLabel}>Description (optional)</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Additional context..."
                rows={3}
              />
            </div>
            <div className={styles.dialogGrid2}>
              <div>
                <label className={styles.dialogLabel}>Category</label>
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
                <label className={styles.dialogLabel}>Severity</label>
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
