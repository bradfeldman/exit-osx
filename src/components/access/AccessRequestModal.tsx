'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { toast } from 'sonner'

const FEATURE_KEYS: Record<string, string> = {
  'personal-financials': 'pfs',
  'retirement-calculator': 'retirement',
  'business-loans': 'loans',
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'personal-financials': 'Track your personal assets, liabilities, and net worth alongside your business financials.',
  'retirement-calculator': 'Plan your post-exit retirement with detailed projections and scenario modeling.',
  'business-loans': 'Access our network of lending partners for business financing options.',
}

interface AccessRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: string
  featureDisplayName?: string
}

export function AccessRequestModal({
  open,
  onOpenChange,
  feature,
  featureDisplayName,
}: AccessRequestModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { selectedCompanyId, selectedCompany } = useCompany()

  const featureKey = FEATURE_KEYS[feature] || feature
  const description = FEATURE_DESCRIPTIONS[feature] || ''

  const handleSubmit = async () => {
    if (!selectedCompanyId) {
      toast.error('No company selected')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureKey,
          reason: reason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      toast.success('Access request submitted', {
        description: 'The company owner will be notified of your request.',
      })
      onOpenChange(false)
      setReason('')
    } catch (error) {
      toast.error('Failed to submit request', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Access</DialogTitle>
          <DialogDescription>
            Request access to {featureDisplayName || feature} for {selectedCompany?.name || 'this company'}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {description && (
            <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {description}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Let the owner know why you need access..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Your request will be sent to the company owner for approval.
            You&apos;ll be notified when they respond.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
