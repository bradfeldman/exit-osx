'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { DealStage, BuyerType, BuyerTier } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  STAGE_LABELS,
  STAGE_COLORS,
  BUYER_TYPE_LABELS,
  BUYER_TYPE_COLORS,
  BUYER_TIER_LABELS,
  BUYER_TIER_COLORS,
  VALID_STAGE_TRANSITIONS,
} from '@/lib/deal-tracker/constants'
import { cn } from '@/lib/utils'

interface ProspectiveBuyer {
  id: string
  name: string
  buyerType: BuyerType
  tier: BuyerTier
  currentStage: DealStage
  website: string | null
  industry: string | null
  location: string | null
  stageUpdatedAt: string
  ioiAmount: number | null
  loiAmount: number | null
  contacts: Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    isPrimary: boolean
  }>
  _count: {
    documents: number
    meetings: number
    activities: number
  }
}

interface BuyerCardProps {
  buyer: ProspectiveBuyer
  _companyId: string
  onStageChange: (stage: DealStage) => void
  _onUpdated: () => void
}

export function BuyerCard({ buyer, _companyId, onStageChange, _onUpdated }: BuyerCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const stageColors = STAGE_COLORS[buyer.currentStage]
  const typeColors = BUYER_TYPE_COLORS[buyer.buyerType]
  const tierColors = BUYER_TIER_COLORS[buyer.tier]
  const primaryContact = buyer.contacts.find(c => c.isPrimary) || buyer.contacts[0]
  const validTransitions = VALID_STAGE_TRANSITIONS[buyer.currentStage] || []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const daysSinceUpdate = useMemo(() => {
    const now = new Date()
    const updated = new Date(buyer.stageUpdatedAt)
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
  }, [buyer.stageUpdatedAt])

  return (
    <div className="bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/deal-tracker/${buyer.id}`}
            className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
          >
            {buyer.name}
          </Link>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/deal-tracker/${buyer.id}`}>
                  View Details
                </Link>
              </DropdownMenuItem>
              {validTransitions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Move to Stage
                  </div>
                  {validTransitions.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      onClick={() => {
                        setIsMenuOpen(false)
                        onStageChange(stage)
                      }}
                    >
                      <span className={cn(
                        'w-2 h-2 rounded-full mr-2',
                        STAGE_COLORS[stage].bg
                      )} />
                      {STAGE_LABELS[stage]}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            typeColors.bg,
            typeColors.text
          )}>
            {BUYER_TYPE_LABELS[buyer.buyerType]}
          </span>
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            tierColors.bg,
            tierColors.text
          )}>
            {BUYER_TIER_LABELS[buyer.tier]}
          </span>
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            stageColors.bg,
            stageColors.text
          )}>
            {STAGE_LABELS[buyer.currentStage]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 space-y-2">
        {/* Primary Contact */}
        {primaryContact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserIcon className="h-3 w-3" />
            <span className="truncate">
              {primaryContact.firstName} {primaryContact.lastName}
            </span>
          </div>
        )}

        {/* Industry/Location */}
        {(buyer.industry || buyer.location) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BuildingIcon className="h-3 w-3" />
            <span className="truncate">
              {[buyer.industry, buyer.location].filter(Boolean).join(' • ')}
            </span>
          </div>
        )}

        {/* IOI/LOI Amount */}
        {(buyer.ioiAmount || buyer.loiAmount) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CurrencyIcon className="h-3 w-3" />
            <span>
              {buyer.loiAmount
                ? `LOI: ${formatCurrency(Number(buyer.loiAmount))}`
                : `IOI: ${formatCurrency(Number(buyer.ioiAmount))}`}
            </span>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{buyer.contacts.length} contacts</span>
            <span>•</span>
            <span>{buyer._count.documents} docs</span>
          </div>
          <span className={cn(
            daysSinceUpdate > 14 && 'text-amber-500',
            daysSinceUpdate > 30 && 'text-red-500'
          )}>
            {daysSinceUpdate}d ago
          </span>
        </div>
      </div>
    </div>
  )
}

// Icons
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  )
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
