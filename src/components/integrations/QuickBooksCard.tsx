'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Link2,
  Unlink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface QuickBooksIntegration {
  id: string
  providerCompanyName: string | null
  autoSyncEnabled: boolean
  lastSyncAt: string | null
  lastSyncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'FAILED'
  lastSyncError: string | null
  connectedAt: string
}

interface QuickBooksCardProps {
  companyId: string
  onSyncComplete?: () => void
}

export function QuickBooksCard({ companyId, onSyncComplete }: QuickBooksCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [integration, setIntegration] = useState<QuickBooksIntegration | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/quickbooks?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setConfigured(data.configured)
        setConnected(data.connected)
        setIntegration(data.integration)

        // Auto-collapse if synced successfully at least once
        if (data.integration?.lastSyncAt && data.integration?.lastSyncStatus === 'SUCCESS') {
          setIsExpanded(false)
        }
      }
    } catch (_err) {
      // Failed to fetch QuickBooks status
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Auto-refresh if data is stale (>24 hours)
  useEffect(() => {
    if (!integration || !connected) return
    if (integration.lastSyncStatus === 'SYNCING') return
    if (isSyncing) return

    if (isDataStale(integration.lastSyncAt)) {
      console.log('QuickBooks data is stale (>24 hours), triggering auto-refresh')
      setIsSyncing(true)
      fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', companyId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            fetchStatus()
            onSyncComplete?.()
          }
        })
        .catch((err) => {
          console.error('Auto-refresh failed:', err)
        })
        .finally(() => {
          setIsSyncing(false)
        })
    }
  }, [integration, connected, isSyncing, companyId, fetchStatus, onSyncComplete])

  // Check for URL params on mount (OAuth callback redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qbConnected = params.get('qb_connected')
    const qbError = params.get('qb_error')

    if (qbConnected === 'true') {
      setSuccessMessage('QuickBooks connected! Starting initial sync...')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      // Refresh status then trigger initial sync
      fetchStatus().then(() => {
        setIsSyncing(true)
        fetch('/api/integrations/quickbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', companyId }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setSuccessMessage(
                `Sync complete! ${data.periodsCreated} periods created, ${data.periodsUpdated} updated.`
              )
              fetchStatus()
              onSyncComplete?.()
            } else {
              setError(data.error || 'Initial sync failed')
            }
          })
          .catch(() => setError('Initial sync failed'))
          .finally(() => setIsSyncing(false))
      })
    } else if (qbError) {
      setError(decodeURIComponent(qbError))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchStatus])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const response = await fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', companyId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to QuickBooks OAuth
        window.location.href = data.authUrl
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to start connection')
        setIsConnecting(false)
      }
    } catch (_err) {
      setError('Failed to connect to QuickBooks')
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', companyId }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setSuccessMessage(
          `Sync complete! ${data.periodsCreated} periods created, ${data.periodsUpdated} updated.`
        )
        fetchStatus()
        onSyncComplete?.()
      } else {
        setError(data.error || 'Sync failed')
      }
    } catch (_err) {
      setError('Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? Your synced data will be preserved.')) {
      return
    }

    setIsDisconnecting(true)
    setError(null)
    try {
      const response = await fetch(`/api/integrations/quickbooks?companyId=${companyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConnected(false)
        setIntegration(null)
        setSuccessMessage('QuickBooks disconnected.')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to disconnect')
      }
    } catch (_err) {
      setError('Failed to disconnect')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleCancelSync = async () => {
    setIsCancelling(true)
    try {
      const response = await fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-sync', companyId }),
      })
      if (response.ok) {
        setIsSyncing(false)
        setSuccessMessage('Sync cancelled.')
        fetchStatus()
      }
    } catch (_err) {
      setError('Failed to cancel sync')
    } finally {
      setIsCancelling(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`
    return formatDate(dateString)
  }

  const isDataStale = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return true
    const diffMs = Date.now() - new Date(lastSyncAt).getTime()
    const diffHours = diffMs / 3600000
    return diffHours > 24
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading QuickBooks status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-8 h-8">
                  <circle cx="20" cy="20" r="18" fill="#2CA01C" />
                  <path
                    d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8"
                    stroke="white"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle cx="20" cy="20" r="3" fill="white" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">QuickBooks Online</h3>
              <p className="text-sm text-gray-500">
                QuickBooks integration is not configured. Contact your administrator.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-8 h-8">
                  <circle cx="20" cy="20" r="18" fill="#2CA01C" />
                  <path
                    d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8"
                    stroke="white"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle cx="20" cy="20" r="3" fill="white" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">QuickBooks Online</h3>
              {connected && integration ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    Connected{integration.providerCompanyName ? ` to ${integration.providerCompanyName}` : ''}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Import P&L and Balance Sheet data automatically
                </p>
              )}
            </div>
            {!connected && (
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>

          {/* Connected State */}
          {connected && integration && (
            <>
              {/* Compact Status Line */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      {integration.lastSyncAt
                        ? `Last synced ${formatRelativeTime(integration.lastSyncAt)}`
                        : 'Never synced'}
                    </span>
                  </div>
                  {integration.lastSyncStatus === 'SYNCING' || isSyncing ? (
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing...
                    </span>
                  ) : integration.lastSyncStatus === 'FAILED' ? (
                    <span className="flex items-center gap-1.5 text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                      Sync failed
                    </span>
                  ) : isDataStale(integration.lastSyncAt) ? (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Data may be outdated
                    </span>
                  ) : integration.lastSyncStatus === 'SUCCESS' ? (
                    <span className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Up to date
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {!(isSyncing || integration.lastSyncStatus === 'SYNCING') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSync}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Sync Now
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {integration.lastSyncError && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                      {integration.lastSyncError}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isSyncing || integration.lastSyncStatus === 'SYNCING' ? (
                      <div className="flex-1 space-y-2">
                        <span className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing financial data from QuickBooks...
                        </span>
                        <div className="text-xs text-gray-500 pl-6">
                          Fetching P&L and Balance Sheet reports for the last 6 years
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelSync}
                          disabled={isCancelling}
                          className="text-gray-500 hover:text-red-600"
                        >
                          {isCancelling ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          {isCancelling ? 'Cancelling...' : 'Cancel Sync'}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSync}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Force Sync
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDisconnect}
                          disabled={isDisconnecting}
                          className="text-gray-500 hover:text-red-600"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Unlink className="h-4 w-4 mr-2" />
                          )}
                          Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 px-4 py-3 rounded-lg">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
