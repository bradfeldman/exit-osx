'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BuyerTier } from '@prisma/client'
import { BUYER_TIER_LABELS } from '@/lib/deal-tracker/constants'
import { Loader2, AlertCircle, Search, Building2, Check } from 'lucide-react'

interface CanonicalCompany {
  id: string
  name: string
  companyType: string
  website: string | null
  description: string | null
}

interface AddBuyerToDealModalProps {
  dealId: string
  dealCodeName: string
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddBuyerToDealModal({
  dealId,
  dealCodeName,
  isOpen,
  onClose,
  onCreated,
}: AddBuyerToDealModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [companies, setCompanies] = useState<CanonicalCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CanonicalCompany | null>(null)
  const [tier, setTier] = useState<BuyerTier>(BuyerTier.B_TIER)
  const [notes, setNotes] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search for canonical companies
  useEffect(() => {
    const searchCompanies = async () => {
      if (searchQuery.length < 2) {
        setCompanies([])
        return
      }

      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/contact-system/canonical/companies?search=${encodeURIComponent(searchQuery)}&limit=10`
        )
        if (res.ok) {
          const data = await res.json()
          setCompanies(data.companies || [])
        }
      } catch (err) {
        console.error('Error searching companies:', err)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchCompanies, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) {
      setError('Please select a company')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/deals/${dealId}/buyers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalCompanyId: selectedCompany.id,
          tier,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to add buyer')
        return
      }

      // Reset form
      setSearchQuery('')
      setCompanies([])
      setSelectedCompany(null)
      setTier(BuyerTier.B_TIER)
      setNotes('')
      onCreated()
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Error adding buyer:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSearchQuery('')
      setCompanies([])
      setSelectedCompany(null)
      setTier(BuyerTier.B_TIER)
      setNotes('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Buyer to Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Display */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Adding buyer to</p>
            <p className="font-medium">{dealCodeName}</p>
          </div>

          {/* Company Search */}
          {!selectedCompany ? (
            <div className="space-y-2">
              <Label>Search Company *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {companies.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        setSelectedCompany(company)
                        setSearchQuery('')
                        setCompanies([])
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 border-b last:border-b-0"
                    >
                      <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {company.companyType}
                          {company.website && ` • ${company.website}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !isSearching && companies.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No companies found. Try a different search term.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Selected Company</Label>
              <div className="flex items-center justify-between border rounded-lg p-3 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{selectedCompany.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCompany.companyType}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompany(null)}
                  disabled={isLoading}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Tier Selection */}
          <div className="space-y-2">
            <Label htmlFor="tier">Buyer Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as BuyerTier)} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUYER_TIER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Why is this buyer being added? Any special considerations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
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
            <Button type="submit" disabled={isLoading || !selectedCompany}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Buyer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
