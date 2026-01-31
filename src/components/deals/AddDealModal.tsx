'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertCircle } from 'lucide-react'

interface AddDealModalProps {
  companyId: string
  companyName: string
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddDealModal({
  companyId,
  companyName,
  isOpen,
  onClose,
  onCreated,
}: AddDealModalProps) {
  const [codeName, setCodeName] = useState('')
  const [description, setDescription] = useState('')
  const [targetCloseDate, setTargetCloseDate] = useState('')
  const [requireSellerApproval, setRequireSellerApproval] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeName.trim()) {
      setError('Code name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          codeName: codeName.trim(),
          description: description.trim() || null,
          targetCloseDate: targetCloseDate || null,
          requireSellerApproval,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create deal')
        return
      }

      // Reset form
      setCodeName('')
      setDescription('')
      setTargetCloseDate('')
      setRequireSellerApproval(true)
      onCreated()
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Error creating deal:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setCodeName('')
      setDescription('')
      setTargetCloseDate('')
      setRequireSellerApproval(true)
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Display */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Creating deal for</p>
            <p className="font-medium">{companyName}</p>
          </div>

          {/* Code Name */}
          <div className="space-y-2">
            <Label htmlFor="codeName">Code Name *</Label>
            <Input
              id="codeName"
              placeholder="e.g., Project Alpha"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              A unique identifier for this deal process
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the deal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Target Close Date */}
          <div className="space-y-2">
            <Label htmlFor="targetCloseDate">Target Close Date</Label>
            <Input
              id="targetCloseDate"
              type="date"
              value={targetCloseDate}
              onChange={(e) => setTargetCloseDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Seller Approval */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requireSellerApproval"
              checked={requireSellerApproval}
              onCheckedChange={(checked) => setRequireSellerApproval(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="requireSellerApproval" className="text-sm font-normal cursor-pointer">
              Require seller approval for new buyers
            </Label>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !codeName.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Deal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
