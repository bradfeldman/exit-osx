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
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [integration, setIntegration] = useState<QuickBooksIntegration | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/quickbooks?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setConfigured(data.configured)
        setConnected(data.connected)
        setIntegration(data.integration)
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

  // Check for URL params on mount (OAuth callback redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qbConnected = params.get('qb_connected')
    const qbError = params.get('qb_error')

    if (qbConnected === 'true') {
      setSuccessMessage('QuickBooks connected successfully! Initial sync in progress.')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      // Refresh status
      fetchStatus()
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
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
                  Connect to import P&L and Balance Sheet data
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
                Connect
              </Button>
            )}
          </div>

          {/* Connected State */}
          {connected && integration && (
            <>
              {/* Sync Status */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {integration.lastSyncAt
                        ? `Last synced ${formatDate(integration.lastSyncAt)}`
                        : 'Never synced'}
                    </span>
                  </div>
                  {integration.lastSyncStatus === 'SYNCING' ? (
                    <span className="flex items-center gap-1.5 text-sm text-blue-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing...
                    </span>
                  ) : integration.lastSyncStatus === 'SUCCESS' ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Success
                    </span>
                  ) : integration.lastSyncStatus === 'FAILED' ? (
                    <span className="flex items-center gap-1.5 text-sm text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                      Failed
                    </span>
                  ) : null}
                </div>

                {integration.lastSyncError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                    {integration.lastSyncError}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing || integration.lastSyncStatus === 'SYNCING'}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Now
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
                </div>
              </div>
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
