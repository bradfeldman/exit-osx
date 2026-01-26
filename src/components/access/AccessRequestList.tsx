'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Loader2, Clock, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

const FEATURE_NAMES: Record<string, string> = {
  'pfs': 'Personal Financial Statement',
  'retirement': 'Retirement Calculator',
  'loans': 'Business Loans',
}

interface AccessRequest {
  id: string
  featureKey: string
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED'
  reason: string | null
  requester: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
  respondedAt: string | null
  expiresAt: string
  createdAt: string
}

interface AccessRequestListProps {
  showAll?: boolean
  onCountChange?: (count: number) => void
}

export function AccessRequestList({ showAll = false, onCountChange }: AccessRequestListProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const { selectedCompanyId } = useCompany()

  const fetchRequests = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    try {
      const status = showAll ? 'all' : 'PENDING'
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/access-requests?status=${status}`
      )
      if (!response.ok) throw new Error('Failed to fetch requests')

      const data = await response.json()
      setRequests(data.requests)
      onCountChange?.(data.requests.filter((r: AccessRequest) => r.status === 'PENDING').length)
    } catch (error) {
      console.error('Error fetching access requests:', error)
      toast.error('Failed to load access requests')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, showAll, onCountChange])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async (requestId: string, action: 'approve' | 'deny') => {
    setProcessingIds(prev => new Set(prev).add(requestId))

    try {
      const response = await fetch(`/api/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process request')
      }

      toast.success(action === 'approve' ? 'Access granted' : 'Request denied')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to process request', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <KeyRound className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {showAll ? 'No access requests' : 'No pending access requests'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING')
  const otherRequests = requests.filter(r => r.status !== 'PENDING')

  return (
    <div className="space-y-4">
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Pending Requests
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </CardTitle>
            <CardDescription>
              Review and respond to access requests from your team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                isProcessing={processingIds.has(request.id)}
                onApprove={() => handleAction(request.id, 'approve')}
                onDeny={() => handleAction(request.id, 'deny')}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {showAll && otherRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherRequests.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                isProcessing={false}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface RequestItemProps {
  request: AccessRequest
  isProcessing: boolean
  onApprove?: () => void
  onDeny?: () => void
}

function RequestItem({ request, isProcessing, onApprove, onDeny }: RequestItemProps) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    DENIED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <UserAvatar
        email={request.requester.email}
        name={request.requester.name}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {request.requester.name || request.requester.email}
          </span>
          <Badge className={statusColors[request.status]} variant="secondary">
            {request.status.toLowerCase()}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mt-1">
          Requested access to{' '}
          <span className="font-medium">
            {FEATURE_NAMES[request.featureKey] || request.featureKey}
          </span>
        </p>

        {request.reason && (
          <p className="text-sm text-muted-foreground mt-2 italic">
            &ldquo;{request.reason}&rdquo;
          </p>
        )}

        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </div>
      </div>

      {request.status === 'PENDING' && onApprove && onDeny && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onDeny}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
