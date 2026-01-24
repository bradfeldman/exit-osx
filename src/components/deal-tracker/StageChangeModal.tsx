'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/deal-tracker/constants'
import { DealStage, BuyerType, BuyerTier } from '@prisma/client'
import { cn } from '@/lib/utils'

interface ProspectiveBuyer {
  id: string
  name: string
  buyerType: BuyerType
  tier: BuyerTier
  currentStage: DealStage
}

interface StageChangeModalProps {
  buyer: ProspectiveBuyer
  targetStage: DealStage
  companyId: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function StageChangeModal({
  buyer,
  targetStage,
  companyId,
  isOpen,
  onClose,
  onComplete,
}: StageChangeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [ioiAmount, setIoiAmount] = useState('')
  const [loiAmount, setLoiAmount] = useState('')

  const fromColors = STAGE_COLORS[buyer.currentStage]
  const toColors = STAGE_COLORS[targetStage]

  // Show IOI amount input for IOI stages
  const showIoiInput = targetStage === DealStage.IOI_RECEIVED

  // Show LOI amount input for LOI stages
  const showLoiInput = targetStage === DealStage.LOI_RECEIVED

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        stage: targetStage,
        notes: notes.trim() || null,
      }

      if (showIoiInput && ioiAmount) {
        body.ioiAmount = parseFloat(ioiAmount.replace(/[^0-9.]/g, ''))
      }

      if (showLoiInput && loiAmount) {
        body.loiAmount = parseFloat(loiAmount.replace(/[^0-9.]/g, ''))
      }

      const res = await fetch(
        `/api/companies/${companyId}/deal-tracker/buyers/${buyer.id}/stage`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (res.ok) {
        setNotes('')
        setIoiAmount('')
        setLoiAmount('')
        onComplete()
        toast.success('Stage updated')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to change stage')
      }
    } catch (error) {
      console.error('Error changing stage:', error)
      toast.error('Failed to change stage')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Stage</DialogTitle>
          <DialogDescription>
            Move {buyer.name} to a new stage in the deal process.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage Change Visual */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center">
              <span className={cn(
                'inline-block px-3 py-1.5 rounded text-sm font-medium',
                fromColors.bg,
                fromColors.text
              )}>
                {STAGE_LABELS[buyer.currentStage]}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Current</p>
            </div>
            <ArrowIcon className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <span className={cn(
                'inline-block px-3 py-1.5 rounded text-sm font-medium',
                toColors.bg,
                toColors.text
              )}>
                {STAGE_LABELS[targetStage]}
              </span>
              <p className="text-xs text-muted-foreground mt-1">New Stage</p>
            </div>
          </div>

          {/* IOI Amount Input */}
          {showIoiInput && (
            <div>
              <Label htmlFor="ioiAmount">IOI Amount</Label>
              <Input
                id="ioiAmount"
                value={ioiAmount}
                onChange={(e) => setIoiAmount(e.target.value)}
                placeholder="$10,000,000"
                onBlur={() => setIoiAmount(formatCurrency(ioiAmount))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the indicative offer amount
              </p>
            </div>
          )}

          {/* LOI Amount Input */}
          {showLoiInput && (
            <div>
              <Label htmlFor="loiAmount">LOI Amount</Label>
              <Input
                id="loiAmount"
                value={loiAmount}
                onChange={(e) => setLoiAmount(e.target.value)}
                placeholder="$12,000,000"
                onBlur={() => setLoiAmount(formatCurrency(loiAmount))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the letter of intent amount
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this stage change..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Change Stage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}
