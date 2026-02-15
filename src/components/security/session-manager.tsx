'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
} from '@/app/actions/sessions'
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  RefreshCw,
  Shield,
  LogOut,
} from 'lucide-react'

interface Session {
  id: string
  deviceType: string | null
  browser: string | null
  os: string | null
  location: string | null
  ipAddress: string | null
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />
    case 'tablet':
      return <Tablet className="h-5 w-5" />
    default:
      return <Monitor className="h-5 w-5" />
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSessions()
      if (result.success && result.sessions) {
        setSessions(result.sessions)
      } else {
        setError(result.error || 'Failed to load sessions')
      }
    } catch {
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId)
    try {
      const result = await revokeSession(sessionId)
      if (result.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      } else {
        setError(result.error || 'Failed to revoke session')
      }
    } catch {
      setError('Failed to revoke session')
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeAll = async () => {
    if (!confirm('Are you sure you want to sign out of all other devices?')) {
      return
    }

    setRevoking('all')
    try {
      const result = await revokeAllOtherSessions()
      if (result.success) {
        setSessions(prev => prev.filter(s => s.isCurrent))
      } else {
        setError(result.error || 'Failed to revoke sessions')
      }
    } catch {
      setError('Failed to revoke sessions')
    } finally {
      setRevoking(null)
    }
  }

  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {otherSessionsCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevokeAll}
              disabled={revoking === 'all'}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out all other devices
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No active sessions found
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`p-4 border rounded-lg ${
                session.isCurrent ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${
                  session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {getDeviceIcon(session.deviceType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {session.browser || 'Unknown browser'}
                    </span>
                    {session.os && (
                      <span className="text-muted-foreground">on {session.os}</span>
                    )}
                    {session.isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                        <Shield className="h-3 w-3" />
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {session.ipAddress && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.ipAddress}
                      </span>
                    )}
                    <span>
                      Last active {formatRelativeTime(session.lastActiveAt)}
                    </span>
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revoking === session.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {revoking === session.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          If you notice any unfamiliar sessions, revoke them immediately and change your password.
          Consider enabling two-factor authentication for additional security.
        </p>
      </div>
    </div>
  )
}
