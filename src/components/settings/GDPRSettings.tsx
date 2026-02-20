'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CookieSettingsButton } from '@/components/gdpr/CookieConsent'
import { Download, Trash2, Shield, FileText, AlertTriangle } from 'lucide-react'
import styles from './settings.module.css'

interface DeletionRequest {
  id: string
  status: string
  requestedAt: string
  scheduledFor: string
  confirmedAt: string | null
  confirmationToken?: string
}

interface ExportRequest {
  id: string
  status: string
  requestedAt: string
  processedAt: string | null
  expiresAt: string | null
  fileSize: number | null
  downloadToken: string | null
  downloadCount: number
}

export function GDPRSettings() {
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null)
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    loadGDPRData()
  }, [])

  const loadGDPRData = async () => {
    try {
      const [deletionRes, exportRes] = await Promise.all([
        fetch('/api/user/gdpr/delete-request'),
        fetch('/api/user/gdpr/export'),
      ])

      if (deletionRes.ok) {
        const data = await deletionRes.json()
        setDeletionRequest(data.deletionRequest)
      }

      if (exportRes.ok) {
        const data = await exportRes.json()
        setExportRequests(data.exportRequests || [])
      }
    } catch (error) {
      console.error('Error loading GDPR data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestDeletion = async () => {
    setActionLoading('delete')
    setMessage(null)

    try {
      const res = await fetch('/api/user/gdpr/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested account deletion' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request deletion')
      }

      setDeletionRequest(data.deletionRequest)
      setMessage({ type: 'success', text: 'Account deletion request created. Your account will be deleted in 30 days.' })
      setShowDeleteConfirm(false)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to request deletion',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmDeletion = async () => {
    if (!deletionRequest?.confirmationToken) return

    setActionLoading('confirm')
    setMessage(null)

    try {
      const res = await fetch(`/api/user/gdpr/delete-request/${deletionRequest.confirmationToken}/confirm`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm deletion')
      }

      setDeletionRequest(data.deletionRequest)
      setMessage({ type: 'success', text: 'Deletion confirmed. Your account will be deleted on the scheduled date.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to confirm deletion',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelDeletion = async () => {
    if (!deletionRequest?.confirmationToken) return

    setActionLoading('cancel')
    setMessage(null)

    try {
      const res = await fetch(`/api/user/gdpr/delete-request/${deletionRequest.confirmationToken}/cancel`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel deletion')
      }

      setDeletionRequest(null)
      setMessage({ type: 'success', text: 'Deletion request cancelled successfully.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to cancel deletion',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRequestExport = async () => {
    setActionLoading('export')
    setMessage(null)

    try {
      const res = await fetch('/api/user/gdpr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeProfile: true,
          includeCompanies: true,
          includeAssessments: true,
          includeDocuments: false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request export')
      }

      await loadGDPRData()
      setMessage({ type: 'success', text: 'Data export created successfully.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to request export',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Shield className="h-5 w-5" aria-hidden="true" />
            Privacy & Data
          </h2>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.loadingCenter}>
            <div className={styles.spinner} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.gdprPage}>
      {/* Privacy Documents */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FileText className="h-5 w-5" aria-hidden="true" />
            Privacy Documents
          </h2>
          <p className={styles.cardDescription}>
            Review our privacy policy and terms of service
          </p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.linkRow}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Privacy Policy</Button>
            </a>
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Terms of Service</Button>
            </a>
          </div>
        </div>
      </div>

      {/* Cookie Preferences */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Cookie Preferences</h2>
          <p className={styles.cardDescription}>
            Manage your cookie consent settings
          </p>
        </div>
        <div className={styles.cardContent}>
          <CookieSettingsButton />
        </div>
      </div>

      {/* Data Export */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Download className="h-5 w-5" aria-hidden="true" />
            Export Your Data
          </h2>
          <p className={styles.cardDescription}>
            Download a copy of all your data (GDPR Article 20 - Right to Data Portability)
          </p>
        </div>
        <div className={styles.cardContent}>
          <Button
            onClick={handleRequestExport}
            disabled={actionLoading === 'export'}
            className="gap-2"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {actionLoading === 'export' ? 'Creating Export...' : 'Request Data Export'}
          </Button>

          {exportRequests.length > 0 && (
            <div className={styles.exportList}>
              <h4 className={styles.exportListTitle}>Recent Exports</h4>
              {exportRequests.map((exp) => (
                <div key={exp.id} className={styles.exportItem}>
                  <div>
                    <span className={styles.exportDate}>
                      {formatDate(exp.requestedAt)}
                    </span>
                    <span className={styles.exportStatus}>
                      ({exp.status})
                      {exp.fileSize && ` - ${formatFileSize(exp.fileSize)}`}
                    </span>
                  </div>
                  {exp.status === 'READY' && exp.downloadToken && (
                    <a
                      href={`/api/user/gdpr/export/${exp.downloadToken}/download`}
                      className={styles.exportDownload}
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Deletion — Danger Zone (BF-027) */}
      <div className={styles.dangerZone}>
        <div className={styles.dangerZoneHeader}>
          <h2 className={styles.dangerZoneTitle}>Danger Zone</h2>
          <p className={styles.dangerZoneDescription}>
            Irreversible and destructive actions
          </p>
        </div>
        <div className={styles.dangerZoneContent}>
          <div className={styles.dangerInner}>
            <div>
              <h3>Delete your account</h3>
              <p>
                Permanently delete your entire account, including your company, all team members, financial data, assessments, and uploaded documents. You will have a 30-day grace period to cancel.
              </p>
            </div>

            {deletionRequest ? (
              <div>
                <div className={styles.deletionWarning}>
                  <div className={styles.deletionWarningInner}>
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h4 className={styles.deletionWarningTitle}>Deletion Scheduled</h4>
                      <p className={styles.deletionWarningText}>
                        Your account is scheduled for deletion on{' '}
                        <strong>{formatDate(deletionRequest.scheduledFor)}</strong>.
                        {!deletionRequest.confirmedAt && ' Please confirm to proceed.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.buttonRow} style={{ marginTop: 16 }}>
                  {!deletionRequest.confirmedAt && (
                    <Button
                      variant="destructive"
                      onClick={handleConfirmDeletion}
                      disabled={actionLoading === 'confirm'}
                    >
                      {actionLoading === 'confirm' ? 'Confirming...' : 'Confirm Deletion'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleCancelDeletion}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Request'}
                  </Button>
                </div>
              </div>
            ) : showDeleteConfirm ? (
              <div>
                <div className={styles.deletionConfirm}>
                  <h4>Are you sure?</h4>
                  <p>
                    This will permanently delete your account, company, all team members, financial data, assessments, tasks, evidence documents, and deal room. This action cannot be undone.
                  </p>
                </div>
                <div className={styles.buttonRow} style={{ marginTop: 16 }}>
                  <Button
                    variant="destructive"
                    onClick={handleRequestDeletion}
                    disabled={actionLoading === 'delete'}
                  >
                    {actionLoading === 'delete' ? 'Processing...' : 'Yes, Delete My Account'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete My Account
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={message.type === 'success' ? styles.messageSuccess : styles.messageError}
          role="alert"
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
