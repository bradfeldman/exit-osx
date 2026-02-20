'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AddBuyerFormProps {
  onAdd: (data: {
    companyName: string
    buyerType: string
    contactName: string
    contactEmail: string
    notes?: string
    tier: string
    tags: string[]
  }) => void
  isAdding: boolean
}

export function AddBuyerForm({ onAdd, isAdding }: AddBuyerFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [buyerType, setBuyerType] = useState('STRATEGIC')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [tier, setTier] = useState('B_TIER')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!companyName.trim()) newErrors.companyName = 'Company name is required'
    if (!contactName.trim()) newErrors.contactName = 'Contact name is required'
    if (!contactEmail.trim()) newErrors.contactEmail = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) newErrors.contactEmail = 'Invalid email format'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onAdd({
      companyName: companyName.trim(),
      buyerType,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      notes: notes.trim() || undefined,
      tier,
      tags,
    })

    setCompanyName('')
    setContactName('')
    setContactEmail('')
    setNotes('')
    setTier('B_TIER')
    setTags([])
    setTagInput('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="mt-4"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add Buyer
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-lg border border-border/50 bg-card p-4 space-y-3"
    >
      <div>
        <input
          type="text"
          placeholder="Company name..."
          value={companyName}
          onChange={e => { setCompanyName(e.target.value); setErrors(prev => ({ ...prev, companyName: '' })) }}
          className={`w-full text-sm bg-transparent border-b pb-1 focus:outline-none text-foreground placeholder:text-muted-foreground ${errors.companyName ? 'border-red' : 'border-border/50 focus:border-[var(--burnt-orange)]'}`}
          autoFocus
          required
        />
        {errors.companyName && <p className="text-xs text-red mt-0.5">{errors.companyName}</p>}
      </div>

      <div>
        <select
          value={buyerType}
          onChange={e => setBuyerType(e.target.value)}
          className="w-full text-sm bg-transparent border-b border-border/50 pb-1 focus:outline-none focus:border-[var(--burnt-orange)] text-foreground"
        >
          <option value="STRATEGIC">Strategic</option>
          <option value="FINANCIAL">Financial</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="MANAGEMENT">Management</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="w-full text-sm h-8 border-b border-border/50 rounded-none border-x-0 border-t-0 shadow-none focus:border-[var(--burnt-orange)] focus:ring-0 px-0">
            <SelectValue placeholder="Select tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A_TIER">A-Tier (Strategic Fit)</SelectItem>
            <SelectItem value="B_TIER">B-Tier (Good Potential)</SelectItem>
            <SelectItem value="C_TIER">C-Tier (Worth Exploring)</SelectItem>
            <SelectItem value="D_TIER">D-Tier (Long Shot)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex gap-2 mb-1">
          <input
            type="text"
            placeholder="Add tags (press Enter)..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            onBlur={handleAddTag}
            className="flex-1 text-sm bg-transparent border-b border-border/50 pb-1 focus:outline-none focus:border-[var(--burnt-orange)] text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs pl-2 pr-1 py-0.5 gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Contact name"
            value={contactName}
            onChange={e => { setContactName(e.target.value); setErrors(prev => ({ ...prev, contactName: '' })) }}
            className={`w-full text-sm bg-transparent border-b pb-1 focus:outline-none text-foreground placeholder:text-muted-foreground ${errors.contactName ? 'border-red' : 'border-border/50 focus:border-[var(--burnt-orange)]'}`}
            required
          />
          {errors.contactName && <p className="text-xs text-red mt-0.5">{errors.contactName}</p>}
        </div>
        <div className="flex-1">
          <input
            type="email"
            placeholder="Email"
            value={contactEmail}
            onChange={e => { setContactEmail(e.target.value); setErrors(prev => ({ ...prev, contactEmail: '' })) }}
            className={`w-full text-sm bg-transparent border-b pb-1 focus:outline-none text-foreground placeholder:text-muted-foreground ${errors.contactEmail ? 'border-red' : 'border-border/50 focus:border-[var(--burnt-orange)]'}`}
            required
          />
          {errors.contactEmail && <p className="text-xs text-red mt-0.5">{errors.contactEmail}</p>}
        </div>
      </div>

      <div>
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full text-sm bg-transparent border-b border-border/50 pb-1 focus:outline-none focus:border-[var(--burnt-orange)] text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isAdding || !companyName.trim() || !contactName.trim() || !contactEmail.trim()}
          className="bg-[var(--burnt-orange)] hover:bg-[var(--burnt-orange)]/90 text-white"
        >
          {isAdding ? 'Adding...' : 'Add to Pipeline'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
