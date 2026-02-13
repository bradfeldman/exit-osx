'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROSPECT_BUYER_TYPE_LABELS } from '@/lib/deal-tracker/constants'

interface AddProspectModalProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  prefillData?: {
    domain?: string
    companyName?: string
  }
}

type ProspectBuyerType = 'STRATEGIC' | 'FINANCIAL' | 'OTHER'

export function AddProspectModal({
  companyId,
  isOpen,
  onClose,
  onCreated,
  prefillData,
}: AddProspectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(prefillData?.companyName || '')
  const [buyerType, setBuyerType] = useState<ProspectBuyerType>('STRATEGIC')
  const [relevanceDescription, setRelevanceDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [headquartersLocation, setHeadquartersLocation] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setName(prefillData?.companyName || '')
    setBuyerType('STRATEGIC')
    setRelevanceDescription('')
    setWebsite('')
    setHeadquartersLocation('')
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/companies/${companyId}/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          buyerType,
          relevanceDescription: relevanceDescription.trim() || null,
          website: website.trim() || null,
          headquartersLocation: headquartersLocation.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      if (res.ok) {
        resetForm()
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create prospect')
      }
    } catch (err) {
      console.error('Error creating prospect:', err)
      setError('Failed to create prospect')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Prospect Buyer</DialogTitle>
          <DialogDescription>
            Add a potential buyer for seller approval before outreach.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corporation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyerType">Buyer Type *</Label>
            <Select value={buyerType} onValueChange={(v) => setBuyerType(v as ProspectBuyerType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROSPECT_BUYER_TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Strategic: Operating company. Financial: PE/Investment. Hybrid: Both.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relevance">Why Relevant?</Label>
            <Textarea
              id="relevance"
              value={relevanceDescription}
              onChange={(e) => setRelevanceDescription(e.target.value)}
              placeholder="Explain why this buyer might be interested in the deal..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Headquarters</Label>
              <Input
                id="location"
                value={headquartersLocation}
                onChange={(e) => setHeadquartersLocation(e.target.value)}
                placeholder="New York, NY"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (not shown to seller)..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Prospect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
