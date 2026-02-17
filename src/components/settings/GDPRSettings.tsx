'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CookieSettingsButton } from '@/components/gdpr/CookieConsent'
import { Download, Trash2, Shield, FileText, AlertTriangle } from 'lucide-react'

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" aria-hidden="true" />
            Privacy & Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Privacy Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Privacy Documents
          </CardTitle>
          <CardDescription>
            Review our privacy policy and terms of service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Privacy Policy</Button>
            </a>
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Terms of Service</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Cookie Preferences</CardTitle>
          <CardDescription>
            Manage your cookie consent settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CookieSettingsButton />
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" aria-hidden="true" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your data (GDPR Article 20 - Right to Data Portability)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRequestExport}
            disabled={actionLoading === 'export'}
            className="gap-2"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {actionLoading === 'export' ? 'Creating Export...' : 'Request Data Export'}
          </Button>

          {exportRequests.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Exports</h4>
              <div className="space-y-2">
                {exportRequests.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {formatDate(exp.requestedAt)}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({exp.status})
                        {exp.fileSize && ` - ${formatFileSize(exp.fileSize)}`}
                      </span>
                    </div>
                    {exp.status === 'READY' && exp.downloadToken && (
                      <a
                        href={`/api/user/gdpr/export/${exp.downloadToken}/download`}
                        className="text-primary hover:underline"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion — Danger Zone (BF-027) */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
          <CardDescription className="text-red-600">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-red-200 bg-white p-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Delete your account</h3>
              <p className="text-sm text-gray-600 mt-1">
                Permanently delete your entire account, including your company, all team members, financial data, assessments, and uploaded documents. You will have a 30-day grace period to cancel.
              </p>
            </div>

            {deletionRequest ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h4 className="font-medium text-amber-800">Deletion Scheduled</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Your account is scheduled for deletion on{' '}
                        <strong>{formatDate(deletionRequest.scheduledFor)}</strong>.
                        {!deletionRequest.confirmedAt && ' Please confirm to proceed.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
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
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800">Are you sure?</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This will permanently delete your account, company, all team members, financial data, assessments, tasks, evidence documents, and deal room. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
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
        </CardContent>
      </Card>

      {/* Messages */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
