'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { analytics } from '@/lib/analytics'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STAGE_INFO } from '@/lib/dataroom/constants'

interface AccessGrant {
  id: string
  email: string
  userId: string | null
  accessLevel: 'VIEWER' | 'DOWNLOADER' | 'CONTRIBUTOR'
  maxStage: 'PREPARATION' | 'TEASER' | 'POST_NDA' | 'DUE_DILIGENCE' | 'CLOSED'
  folderIds: string[]
  expiresAt: string | null
  ndaSignedAt: string | null
  createdAt: string
  invitedBy?: { name: string | null; email: string }
}

interface AccessManagerProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
}

const ACCESS_LEVELS = {
  VIEWER: { label: 'View Only', description: 'Can view documents but not download' },
  DOWNLOADER: { label: 'Can Download', description: 'Can view and download documents' },
  CONTRIBUTOR: { label: 'Contributor', description: 'Can upload and manage documents' },
}

const STAGES_FOR_ACCESS = ['TEASER', 'POST_NDA', 'DUE_DILIGENCE'] as const

export function AccessManager({ companyId, isOpen, onClose }: AccessManagerProps) {
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [editingGrant, setEditingGrant] = useState<AccessGrant | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAccessLevel, setInviteAccessLevel] = useState<'VIEWER' | 'DOWNLOADER'>('DOWNLOADER')
  const [inviteMaxStage, setInviteMaxStage] = useState<'TEASER' | 'POST_NDA' | 'DUE_DILIGENCE'>('POST_NDA')
  const [inviteExpiresDays, setInviteExpiresDays] = useState<string>('30')

  const fetchAccessGrants = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/dataroom/access`)
      if (res.ok) {
        const data = await res.json()
        setAccessGrants(data.accessGrants || [])
      }
    } catch (error) {
      console.error('Error fetching access grants:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (isOpen) {
      fetchAccessGrants()
    }
  }, [isOpen, fetchAccessGrants])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setIsSubmitting(true)
    try {
      const expiresAt = inviteExpiresDays && inviteExpiresDays !== 'never'
        ? new Date(Date.now() + parseInt(inviteExpiresDays) * 24 * 60 * 60 * 1000).toISOString()
        : null

      const res = await fetch(`/api/companies/${companyId}/dataroom/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          accessLevel: inviteAccessLevel,
          maxStage: inviteMaxStage,
          expiresAt,
        }),
      })

      if (res.ok) {
        // Track dataroom shared
        analytics.track('dataroom_shared', {
          recipientType: 'buyer', // Default to buyer for external invites
        })

        setShowInviteDialog(false)
        resetInviteForm()
        await fetchAccessGrants()
        toast.success('Invite sent successfully')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to send invite')
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      toast.error('Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAccess = async () => {
    if (!editingGrant) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/dataroom/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessId: editingGrant.id,
          accessLevel: editingGrant.accessLevel,
          maxStage: editingGrant.maxStage,
          expiresAt: editingGrant.expiresAt,
        }),
      })

      if (res.ok) {
        setEditingGrant(null)
        await fetchAccessGrants()
        toast.success('Access updated')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update access')
      }
    } catch (error) {
      console.error('Error updating access:', error)
      toast.error('Failed to update access')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevokeAccess = async (accessId: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) return

    try {
      const res = await fetch(`/api/companies/${companyId}/dataroom/access?accessId=${accessId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchAccessGrants()
        toast.success('Access revoked')
      } else {
        toast.error('Failed to revoke access')
      }
    } catch (error) {
      console.error('Error revoking access:', error)
      toast.error('Failed to revoke access')
    }
  }

  const resetInviteForm = () => {
    setInviteEmail('')
    setInviteAccessLevel('DOWNLOADER')
    setInviteMaxStage('POST_NDA')
    setInviteExpiresDays('30')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Data Room Access</DialogTitle>
          <DialogDescription>
            Manage who can access your data room
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Invite Button */}
          <div className="mb-4">
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Invite External User
            </Button>
          </div>

          {/* Access Grants List */}
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : accessGrants.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-muted-foreground">No external users have access yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invite potential buyers or advisors to view your data room
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accessGrants.map((grant) => (
                <div
                  key={grant.id}
                  className={`p-4 rounded-lg border ${
                    isExpired(grant.expiresAt) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{grant.email}</span>
                        {isExpired(grant.expiresAt) && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            Expired
                          </span>
                        )}
                        {grant.ndaSignedAt && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            NDA Signed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{ACCESS_LEVELS[grant.accessLevel].label}</span>
                        <span>|</span>
                        <span>Up to {STAGE_INFO[grant.maxStage]?.label || grant.maxStage}</span>
                        {grant.expiresAt && (
                          <>
                            <span>|</span>
                            <span>Expires {formatDate(grant.expiresAt)}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invited {formatDate(grant.createdAt)}
                        {grant.invitedBy && ` by ${grant.invitedBy.name || grant.invitedBy.email}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingGrant(grant)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeAccess(grant.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite External User</DialogTitle>
            <DialogDescription>
              Send an invitation to access your data room
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="buyer@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select
                value={inviteAccessLevel}
                onValueChange={(v) => setInviteAccessLevel(v as 'VIEWER' | 'DOWNLOADER')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">
                    <div>
                      <span className="font-medium">View Only</span>
                      <p className="text-xs text-muted-foreground">Can view but not download</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="DOWNLOADER">
                    <div>
                      <span className="font-medium">Can Download</span>
                      <p className="text-xs text-muted-foreground">Can view and download documents</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Maximum Access Stage</Label>
              <Select
                value={inviteMaxStage}
                onValueChange={(v) => setInviteMaxStage(v as 'TEASER' | 'POST_NDA' | 'DUE_DILIGENCE')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES_FOR_ACCESS.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      <div>
                        <span className="font-medium">{STAGE_INFO[stage].label}</span>
                        <p className="text-xs text-muted-foreground">{STAGE_INFO[stage].description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                User will only see folders/documents available at this stage or earlier
              </p>
            </div>

            <div className="space-y-2">
              <Label>Access Expires In</Label>
              <Select
                value={inviteExpiresDays}
                onValueChange={setInviteExpiresDays}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">No expiration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Access Dialog */}
      <Dialog open={!!editingGrant} onOpenChange={(open) => !open && setEditingGrant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Access</DialogTitle>
            <DialogDescription>
              Update access permissions for {editingGrant?.email}
            </DialogDescription>
          </DialogHeader>

          {editingGrant && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={editingGrant.accessLevel}
                  onValueChange={(v) =>
                    setEditingGrant({ ...editingGrant, accessLevel: v as 'VIEWER' | 'DOWNLOADER' | 'CONTRIBUTOR' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">View Only</SelectItem>
                    <SelectItem value="DOWNLOADER">Can Download</SelectItem>
                    <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Maximum Access Stage</Label>
                <Select
                  value={editingGrant.maxStage}
                  onValueChange={(v) =>
                    setEditingGrant({ ...editingGrant, maxStage: v as typeof editingGrant.maxStage })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES_FOR_ACCESS.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {STAGE_INFO[stage].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>Invited:</strong> {formatDate(editingGrant.createdAt)}</p>
                {editingGrant.ndaSignedAt && (
                  <p><strong>NDA Signed:</strong> {formatDate(editingGrant.ndaSignedAt)}</p>
                )}
                {editingGrant.expiresAt && (
                  <p><strong>Expires:</strong> {formatDate(editingGrant.expiresAt)}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGrant(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccess} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

// Icons
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}
